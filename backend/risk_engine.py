from typing import Dict, Any
from pydantic import BaseModel


class RiskProfile(BaseModel):
    risk_score: float
    risk_level: str



IMPACT_WEIGHTS = {
    "Memory corruption risk": 1.5,
    "Unauthorized persistence/access": 1.4,
    "Data integrity risk": 1.2,
}


def calculate_risk(*args) -> RiskProfile:
    """Calculate a risk profile using a defensible mathematical model.

    Supports two signatures:
      calculate_risk(detection)
      calculate_risk(sim_data, detection)

    Formula:
      risk_score = (severity_score * anomaly_score * confidence) + impact_weight

    This combines the intrinsic severity of the vulnerability with observed
    anomaly evidence and detector confidence, then adds threat-specific impact.
    """
    if len(args) == 2:
        sim_data, detection = args
    else:
        detection = args[0]
        sim_data = {}

    # Accept both mapping and Pydantic model
    if hasattr(detection, "dict"):
        detection = detection.dict()

    severity = float(detection.get("severity_score", 0))
    anomaly = float(detection.get("anomaly_score", 0))
    confidence = float(detection.get("confidence", 1.0))
    impact = detection.get("impact")

    impact_weight = IMPACT_WEIGHTS.get(impact, 0.0)

    # core formula: product of severity, anomaly, and confidence, plus impact weight
    risk_score = (severity * anomaly * confidence) + impact_weight
    risk_score = round(risk_score, 2)

    # risk level buckets
    if risk_score < 5:
        level = "Low"
    elif risk_score < 15:
        level = "Moderate"
    else:
        level = "High"

    return RiskProfile(risk_score=risk_score, risk_level=level)
