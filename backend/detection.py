from datetime import datetime, timezone
from typing import Dict, Any, List
from pydantic import BaseModel


class DetectionResult(BaseModel):
    vulnerability: str
    detected: bool
    severity: str
    severity_score: float
    anomaly_score: float
    confidence: float
    impact: str
    indicators: List[str]
    explanation: str
    timestamp: str
    # new threat intelligence fields
    threat_tier: str
    threat_score: float



def detect_vulnerability(sim_data: Dict[str, Any]) -> DetectionResult:
    """Deterministic detection logic based on simulation fields.

    This function computes an explainable anomaly score and a derived
    severity score, avoiding randomness and making results reproducible
    for the same `sim_data` input.
    """
    vul = sim_data.get("type", "unknown")

    anomaly_score = 0.0
    base_severity = 1.0
    indicators = []
    explanation = ""

    # -------------------------------
    # BUFFER OVERFLOW DETECTION
    # -------------------------------
    if vul == "buffer_overflow":
        buffer_limit = sim_data.get("buffer_limit", 1)
        input_size = sim_data.get("input_size", 0)

        overflow_ratio = input_size / buffer_limit if buffer_limit else 0
        anomaly_score = min(1.0, max(0.0, overflow_ratio - 1))

        base_severity = 8.0

        if overflow_ratio > 1:
            indicators = ["out-of-bounds-write", "stack corruption"]
            explanation = f"Input exceeded buffer by {round((overflow_ratio-1)*100,2)}%."
        else:
            indicators = ["normal memory usage"]
            explanation = "Input within buffer limits."

    # -------------------------------
    # TRAPDOOR DETECTION
    # -------------------------------
    elif vul == "trapdoor":
        hidden_access = sim_data.get("hidden_access_flag", False)
        privilege = sim_data.get("privilege_level", "user")
        unauthorized = sim_data.get("unauthorized_access", False)

        base_severity = 6.0

        anomaly_score = 0.0
        if hidden_access:
            anomaly_score += 0.4
        if privilege == "admin":
            anomaly_score += 0.3
        if unauthorized:
            anomaly_score += 0.5

        anomaly_score = min(1.0, anomaly_score)

        indicators = ["hidden-function", "auth bypass"] if anomaly_score > 0 else ["normal access"]
        explanation = "Unauthorized privileged access detected." if anomaly_score > 0 else "No trapdoor behavior observed."

    # -------------------------------
    # CACHE POISONING DETECTION
    # -------------------------------
    elif vul == "cache_poisoning":
        corrupted = sim_data.get("corrupted_entry_detected", False)

        base_severity = 4.0
        anomaly_score = 0.9 if corrupted else 0.1

        indicators = ["integrity mismatch"] if corrupted else ["cache healthy"]
        explanation = "Corrupted cache entry detected." if corrupted else "Cache integrity intact."

    else:
        anomaly_score = 0.1
        explanation = "Unknown simulation type."

    # -------------------------------
    # SEVERITY CALCULATION
    # -------------------------------
    severity_score = round(min(10.0, base_severity * (1 + anomaly_score)), 2)

    if severity_score >= 8:
        severity_label = "High"
    elif severity_score >= 5:
        severity_label = "Moderate"
    elif severity_score >= 3:
        severity_label = "Low"
    else:
        severity_label = "Info"

    # simple confidence model: higher anomaly increases confidence
    confidence = round(1 - (0.3 * (1 - anomaly_score)), 2)

    # threat scoring: combine severity and confidence
    threat_score = round(severity_score * confidence, 2)
    # map severity label to a tier
    tier_map = {
        "Info": "Informational",
        "Low": "Suspicious",
        "Moderate": "Exploit Attempt",
        "High": "Critical Breach",
    }
    threat_tier = tier_map.get(severity_label, "Informational")

    impact_map = {
        "buffer_overflow": "Memory corruption risk",
        "trapdoor": "Unauthorized persistence/access",
        "cache_poisoning": "Data integrity risk",
    }

    return DetectionResult(
        vulnerability=vul,
        detected=anomaly_score > 0.2,
        severity=severity_label,
        severity_score=severity_score,
        anomaly_score=round(anomaly_score, 2),
        confidence=confidence,
        impact=impact_map.get(vul, "Unknown impact"),
        indicators=indicators,
        explanation=explanation,
        timestamp=datetime.now(timezone.utc).isoformat(),
        threat_tier=threat_tier,
        threat_score=threat_score,
    )
