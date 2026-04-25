from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class Metadata(BaseModel):
    module: str
    timestamp: str

class RiskProfile(BaseModel):
    risk_score: float
    risk_level: str

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
    threat_tier: str
    threat_score: float

class Analysis(BaseModel):
    simulation: Dict[str, Any]
    detection: DetectionResult
    risk: RiskProfile

class SimulationResponse(BaseModel):
    metadata: Metadata
    analysis: Analysis
    mitigation: Dict[str, Any]

class HealthStatus(BaseModel):
    security_score: float
    risk_level: str
    issues_detected: int
    recommendations: List[str]
