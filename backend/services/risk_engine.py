from typing import Dict, Any
from backend.models.schemas import RiskProfile

IMPACT_WEIGHTS = {
    "Memory corruption risk": 1.5,
    "Unauthorized persistence/access": 1.4,
    "Data integrity risk": 1.2,
}

def calculate_risk(*args) -> RiskProfile:
    """Calculate a risk profile using a defensible mathematical model."""
    if len(args) == 2:
        sim_data, detection = args
    else:
        detection = args[0]
        sim_data = {}

    if hasattr(detection, "dict"):
        detection = detection.dict()

    severity = float(detection.get("severity_score", 0))
    anomaly = float(detection.get("anomaly_score", 0))
    confidence = float(detection.get("confidence", 1.0))
    impact = detection.get("impact")

    impact_weight = IMPACT_WEIGHTS.get(impact, 0.0)

    risk_score = (severity * anomaly * confidence) + impact_weight
    risk_score = round(risk_score, 2)

    if risk_score < 5:
        level = "Low"
    elif risk_score < 15:
        level = "Moderate"
    else:
        level = "High"

    return RiskProfile(risk_score=risk_score, risk_level=level)
