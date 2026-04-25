from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from typing import Dict, Any
import time
import logging

from backend.models.schemas import SimulationResponse
from backend.services.simulation import simulate_buffer_overflow, simulate_trapdoor, simulate_cache_poisoning
from backend.services.pipeline import process_simulation
from backend.utils import config

router = APIRouter(tags=["Simulation"])
logger = logging.getLogger("Kernel Shield")

_rate_state: Dict[str, tuple] = {}

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

def build_response(module_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "metadata": {
            "module": module_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "analysis": result.get("analysis", {}),
        "mitigation": result.get("mitigation", {}),
    }

@router.get("/api/v1/simulate/buffer", response_model=SimulationResponse)
def buffer_attack(request: Request):
    _check_rate(request)
    logger.info("Executing buffer overflow simulation")
    result = process_simulation(simulate_buffer_overflow)
    return build_response("Buffer Overflow Simulation", result)

@router.get("/api/v1/simulate/trapdoor", response_model=SimulationResponse)
def trapdoor_attack(request: Request):
    _check_rate(request)
    logger.info("Executing trapdoor simulation")
    result = process_simulation(simulate_trapdoor)
    return build_response("Trapdoor Simulation", result)

@router.get("/api/v1/simulate/cache", response_model=SimulationResponse)
def cache_attack(request: Request):
    _check_rate(request)
    logger.info("Executing cache poisoning simulation")
    result = process_simulation(simulate_cache_poisoning)
    return build_response("Cache Poisoning Simulation", result)
