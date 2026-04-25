from typing import Dict, Any, Callable, Optional
from datetime import datetime, timezone
import logging
import asyncio
import json

from backend.models.schemas import RiskProfile
from backend.services.detection import detect_vulnerability
from backend.services.risk_engine import calculate_risk
from backend.services.mitigation import suggest_mitigation
from backend.services.health_engine import compute_health
from backend.utils import store, config
from backend.utils.state import event_log, health_history, manager
import backend.utils.state as state

logger = logging.getLogger("Kernel Shield")

SEVERITY_MAP: Dict[str, float] = {
    "Low": 2.0,
    "Moderate": 5.0,
    "Medium": 5.0,
    "High": 8.0,
    "Critical": 10.0,
}

def _append_event(sim_data: Dict[str, Any], detection: Dict[str, Any], risk: Optional[RiskProfile] = None):
    try:
        if hasattr(detection, "dict"):
            detection = detection.dict()

        severity_val: Optional[float] = None
        if "severity_score" in detection:
            try:
                severity_val = float(detection.get("severity_score"))
            except Exception:
                severity_val = None
        if severity_val is None:
            severity = detection.get("severity")
            if isinstance(severity, (int, float)):
                severity_val = float(severity)
            elif isinstance(severity, str):
                severity_val = SEVERITY_MAP.get(severity)
                if severity_val is None:
                    try:
                        severity_val = float(severity)
                    except ValueError:
                        severity_val = None

        timestamp = datetime.now(timezone.utc).isoformat()
        
        if len(event_log) >= config.MAX_EVENTS:
            event_log.pop(0)
            
        event_log.append({
            "type": sim_data.get("type"),
            "severity": severity_val,
            "timestamp": timestamp,
        })
        
        try:
            store.append_event(
                sim_data.get("type"),
                severity_val,
                timestamp,
                severity_score=detection.get("severity_score"),
                risk_level=(risk.risk_level if risk else None),
                confidence=detection.get("confidence"),
                impact=detection.get("impact"),
                threat_tier=detection.get("threat_tier"),
                threat_score=detection.get("threat_score"),
            )
        except Exception:
            logger.exception("Failed to persist event to DB")

        try:
            current = compute_health(event_log)
            health_history.append({"timestamp": timestamp, "score": current["security_score"]})
        except Exception:
            logger.exception("Failed to update health history")

        try:
            payload = {
                "event": {
                    "type": sim_data.get("type"),
                    "severity": severity_val,
                    "timestamp": timestamp,
                    "severity_score": detection.get("severity_score"),
                    "risk_level": (risk.risk_level if risk else None),
                    "confidence": detection.get("confidence"),
                    "impact": detection.get("impact"),
                    "threat_tier": detection.get("threat_tier"),
                    "threat_score": detection.get("threat_score"),
                },
                "health": current,
                "history_point": {"timestamp": timestamp, "score": current["security_score"]},
            }
            if state.async_loop is not None:
                asyncio.run_coroutine_threadsafe(manager.broadcast(json.dumps(payload)), state.async_loop)
        except Exception:
            logger.exception("Failed to send websocket update")
    except Exception:
        logger.exception("Failed to append event to log")

def process_simulation(sim_func: Callable[[], Dict[str, Any]]) -> Dict[str, Any]:
    sim_data = sim_func()
    detection = detect_vulnerability(sim_data)
    
    try:
        risk = calculate_risk(sim_data, detection)
    except TypeError:
        risk = calculate_risk(detection)
        
    mit_key = sim_data.get("type", "unknown")
    mitigation = suggest_mitigation(mit_key)

    result = {
        "analysis": {
            "simulation": sim_data,
            "detection": detection,
            "risk": risk,
        },
        "mitigation": mitigation,
    }

    try:
        _append_event(sim_data, detection, risk)
    except Exception:
        logger.exception("Error recording simulation event")

    return result
