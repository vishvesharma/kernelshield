from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging

from backend.utils import store

router = APIRouter(tags=["Events"])
logger = logging.getLogger("Kernel Shield")

@router.get("/api/v1/events/recent", response_model=List[Dict[str, Any]])
def recent_events(limit: int = 20):
    """Return the most recent recorded events (default 20)."""
    logger.info("Recent events requested, limit=%s", limit)
    try:
        return store.get_recent_events(limit)
    except Exception as e:
        logger.exception("Failed to fetch recent events: %s", e)
        raise HTTPException(status_code=500, detail="Could not retrieve events")
