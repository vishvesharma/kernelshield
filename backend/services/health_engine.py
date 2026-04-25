from typing import List, Dict, Any

ATTACK_WEIGHTS: Dict[str, float] = {
    "buffer_overflow": 1.5,
    "trapdoor": 2.0,
    "cache_poisoning": 1.2,
    "unknown": 1.0,
}

def compute_health(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    from datetime import datetime, timezone, timedelta
    from backend.utils import config

    if not events:
        score = 85
    else:
        now = datetime.now(timezone.utc)
        window = timedelta(minutes=config.HEALTH_WINDOW_MINUTES)
        recent = []
        for e in events:
            ts = e.get("timestamp")
            if ts:
                try:
                    tval = datetime.fromisoformat(ts)
                except Exception:
                    recent.append(e)
                    continue
                if now - tval <= window:
                    recent.append(e)
            else:
                recent.append(e)

        total_weighted = 0.0
        for e in recent:
            sev = e.get("severity")
            if sev is None:
                continue
            weight = ATTACK_WEIGHTS.get(e.get("type"), 1.0)
            total_weighted += weight * sev
            
        score = int(100 * (config.DECAY_FACTOR ** total_weighted))
        events = recent

    if score >= 80:
        level = "Low"
    elif score >= 50:
        level = "Moderate"
    else:
        level = "High"

    return {"security_score": score, "risk_level": level, "events_tracked": len(events)}
