from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Dict, Any, List
import logging

from backend.services.health_engine import compute_health
from backend.utils import store
from backend.utils.state import event_log, health_history

router = APIRouter(tags=["System"])
logger = logging.getLogger("Kernel Shield")

@router.get("/api/v1/system/health", response_model=Dict[str, Any])
def system_health():
    logger.info("System health requested")
    health = compute_health(event_log)
    return {
        "metadata": {"module": "System Health", "timestamp": datetime.now(timezone.utc).isoformat()},
        "analysis": health,
        "status": "System stable" if health["risk_level"] != "High" else "Action required",
    }

@router.get("/api/v1/metrics/type_counts", response_model=Dict[str, int], tags=["Metrics"])
def type_counts():
    """Return counts of events by type from the database."""
    try:
        conn = store._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT type, COUNT(*) as cnt FROM events GROUP BY type")
        rows = cur.fetchall()
        conn.close()
        return {r["type"]: r["cnt"] for r in rows}
    except Exception as e:
        logger.exception("Failed to compute type counts: %s", e)
        raise HTTPException(status_code=500, detail="Could not compute metrics")

@router.get("/api/v1/system/health/history", response_model=List[Dict[str, Any]])
def health_history_endpoint():
    """Return the recorded health scores over time."""
    logger.info("Health history requested")
    return health_history

@router.get("/api/v1/system/summary", response_model=Dict[str, Any])
def system_summary():
    """Aggregate key metrics for dashboard summary cards."""
    logger.info("System summary requested")
    try:
        conn = store._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM events")
        total = cur.fetchone()[0]
        cur.execute("SELECT risk_level, COUNT(*) FROM events GROUP BY risk_level")
        rows = cur.fetchall()
        breakdown = {r[0]: r[1] for r in rows}
        cur.execute("SELECT type FROM events ORDER BY id DESC LIMIT 1")
        last = cur.fetchone()
        conn.close()
        return {
            "total_events": total,
            "high_risk_events": breakdown.get("High", 0),
            "moderate_risk_events": breakdown.get("Moderate", 0),
            "low_risk_events": breakdown.get("Low", 0),
            "last_attack_type": last[0] if last else None,
        }
    except Exception as e:
        logger.exception("Failed to build summary: %s", e)
        raise HTTPException(status_code=500, detail="Could not compute summary")
