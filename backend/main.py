
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Dict, Any, Callable, List, Optional

from backend.detection import DetectionResult
from backend.risk_engine import RiskProfile
from typing import Dict, Any, Callable, List, Optional
import logging
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import WebSocket, WebSocketDisconnect
import asyncio, json

from backend.simulation import (
    simulate_buffer_overflow,
    simulate_trapdoor,
    simulate_cache_poisoning,
)
from backend.detection import detect_vulnerability
from backend.risk_engine import calculate_risk
from backend.mitigation import suggest_mitigation
from backend import store, health_engine, config
import time

# simple in-memory rate limiter
_rate_state: Dict[str, tuple] = {}

# websocket connection manager (borrowed from FastAPI docs)
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.active_connections.remove(connection)

manager = ConnectionManager()

# reference to the main asyncio loop so cross-thread broadcasts work
async_loop = None

logging.basicConfig(
	level=logging.INFO,
	format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger("Kernel Shield")


app = FastAPI(
	title="Kernel Shield",
	description="Real-Time Operating System Vulnerability Simulation & Detection Framework",
	version="1.0.0",
)

# ensure database schema exists at startup (avoids dropping on every event)
@app.on_event("startup")
def startup_event():
    global async_loop
    try:
        store.init_db()
    except Exception:
        logger.exception("Failed to initialize database on startup")
    # capture the running event loop so other threads can dispatch
    try:
        async_loop = asyncio.get_running_loop()
        logger.info("Captured async loop %s", async_loop)
    except Exception as e:
        async_loop = None
        logger.warning("Could not capture async loop: %s", e)

# Allow frontends to call the API during development
# In production, restrict `allow_origins` to trusted domains only
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class Metadata(BaseModel):
	module: str
	timestamp: str


class Analysis(BaseModel):
	simulation: Dict[str, Any]
	detection: DetectionResult
	risk: RiskProfile


class SimulationResponse(BaseModel):
	metadata: Metadata
	analysis: Analysis
	mitigation: Dict[str, Any]


def build_response(module_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
	return {
		"metadata": {
			"module": module_name,
			"timestamp": datetime.now(timezone.utc).isoformat(),
		},
		"analysis": result.get("analysis", {}),
		"mitigation": result.get("mitigation", {}),
	}


def process_simulation(sim_func: Callable[[], Dict[str, Any]]) -> Dict[str, Any]:
	# Core processing pipeline kept outside endpoints to avoid repetition
	sim_data = sim_func()
	detection = detect_vulnerability(sim_data)
	# Prefer enriched risk calculation when available; fall back if needed
	try:
		risk = calculate_risk(sim_data, detection)
	except TypeError:
		risk = calculate_risk(detection)
	# Use simulation-provided type as single source of truth
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

	# Record event for health calculations (best-effort)
	try:
		_append_event(sim_data, detection, risk)
	except Exception:
		logger.exception("Error recording simulation event")

	return result


# Simple in-memory event log to support dynamic health metrics
# Note: this list is not thread-safe; in production use a thread-safe
# or persistent store (Redis, database) to avoid race conditions.
event_log: List[Dict[str, Any]] = []

# health score history for trend chart
health_history: List[Dict[str, Any]] = []

# Severity normalization mapping; detection modules may return strings
SEVERITY_MAP: Dict[str, float] = {
    "Low": 2,
    "Moderate": 5,
    "Medium": 5,
    "High": 8,
    "Critical": 10,
}

# Weight per attack type for health calculation
ATTACK_WEIGHTS: Dict[str, float] = {
    "buffer_overflow": 1.5,
    "trapdoor": 2.0,
    "cache_poisoning": 1.2,
    "unknown": 1.0,
}


def _append_event(sim_data: Dict[str, Any], detection: Dict[str, Any], risk: Optional[RiskProfile] = None):
    try:
        # convert Pydantic models to dict for convenience
        if hasattr(detection, "dict"):
            detection = detection.dict()

        # detection may already compute a numeric severity_score
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
                # map string severity to numeric scale
                severity_val = SEVERITY_MAP.get(severity)
                if severity_val is None:
                    try:
                        severity_val = float(severity)
                    except ValueError:
                        severity_val = None
        timestamp = datetime.now(timezone.utc).isoformat()
        # keep only last MAX_EVENTS events in memory
        if len(event_log) >= config.MAX_EVENTS:
            event_log.pop(0)
        event_log.append({
            "type": sim_data.get("type"),
            "severity": severity_val,
            "timestamp": timestamp,
        })
        # also persist to SQLite for durability (DB should already be initialized)
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
        # record health history entry
        try:
            current = health_engine.compute_health(event_log)
            health_history.append({"timestamp": timestamp, "score": current["security_score"]})
        except Exception:
            logger.exception("Failed to update health history")

        # push update via websocket if clients are connected
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
                # we can also include a single history point for convenience
                "history_point": {"timestamp": timestamp, "score": current["security_score"]},
            }
            if async_loop is not None:
                asyncio.run_coroutine_threadsafe(manager.broadcast(json.dumps(payload)), async_loop)
            else:
                # no loop available (e.g. during tests), skip live push
                pass
        except Exception:
            logger.exception("Failed to send websocket update")
    except Exception:
        logger.exception("Failed to append event to log")


@app.get("/", response_model=Dict[str, Any])
def home():
	return {
		"metadata": {"module": "Health Check", "timestamp": datetime.now(timezone.utc).isoformat()},
		"status": "Kernel Shield running",
	}



def _check_rate(request: Request):
    ip = request.client.host
    now = time.time()
    count, start = _rate_state.get(ip, (0, now))
    if now - start > config.RATE_WINDOW:
        count = 0
        start = now
    count += 1
    _rate_state[ip] = (count, start)
    if count > config.RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
	logger.exception("Unhandled error occurred: %s", exc)
	return JSONResponse(
		status_code=500,
		content={
			"error": "Internal Server Error",
			"timestamp": datetime.now(timezone.utc).isoformat(),
		},
	)


@app.get("/api/v1/simulate/buffer", response_model=SimulationResponse, tags=["Simulation"])
def buffer_attack(request: Request):
    _check_rate(request)
    logger.info("Executing buffer overflow simulation")
    result = process_simulation(simulate_buffer_overflow)
    return build_response("Buffer Overflow Simulation", result)


@app.get("/api/v1/simulate/trapdoor", response_model=SimulationResponse, tags=["Simulation"])
def trapdoor_attack(request: Request):
    _check_rate(request)
    logger.info("Executing trapdoor simulation")
    result = process_simulation(simulate_trapdoor)
    return build_response("Trapdoor Simulation", result)


@app.get("/api/v1/simulate/cache", response_model=SimulationResponse, tags=["Simulation"])
def cache_attack(request: Request):
    _check_rate(request)
    logger.info("Executing cache poisoning simulation")
    result = process_simulation(simulate_cache_poisoning)
    return build_response("Cache Poisoning Simulation", result)


@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    """Clients can connect here to receive live event/health summaries."""
    await manager.connect(websocket)
    try:
        while True:
            # keep the connection open; ignore any received data
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/api/v1/system/health", response_model=Dict[str, Any])
def system_health():
	logger.info("System health requested")
	# compute health using the current event log
	health = health_engine.compute_health(event_log)
	return {
		"metadata": {"module": "System Health", "timestamp": datetime.now(timezone.utc).isoformat()},
		"analysis": health,
		"status": "System stable" if health["risk_level"] != "High" else "Action required",
	}


@app.get("/api/v1/events/recent", response_model=List[Dict[str, Any]], tags=["Events"])
def recent_events(limit: int = 20):
	"""Return the most recent recorded events (default 20)."""
	logger.info("Recent events requested, limit=%s", limit)
	try:
		return store.get_recent_events(limit)
	except Exception as e:
		logger.exception("Failed to fetch recent events: %s", e)
		raise HTTPException(status_code=500, detail="Could not retrieve events")


@app.get("/api/v1/metrics/type_counts", response_model=Dict[str, int], tags=["Metrics"])
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


@app.get("/api/v1/system/health/history", response_model=List[Dict[str, Any]], tags=["System"])
def health_history_endpoint():
	"""Return the recorded health scores over time."""
	logger.info("Health history requested")
	# just return the in-memory history; in prod would query a store
	return health_history


@app.get("/api/v1/system/summary", response_model=Dict[str, Any], tags=["System"])
def system_summary():
	"""Aggregate key metrics for dashboard summary cards."""
	logger.info("System summary requested")
	try:
		# total events
		conn = store._get_conn()
		cur = conn.cursor()
		cur.execute("SELECT COUNT(*) FROM events")
		total = cur.fetchone()[0]
		# risk level breakdown
		cur.execute("SELECT risk_level, COUNT(*) FROM events GROUP BY risk_level")
		rows = cur.fetchall()
		breakdown = {r[0]: r[1] for r in rows}
		# last attack type
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


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=8000)

