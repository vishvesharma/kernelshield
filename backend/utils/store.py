import sqlite3
from typing import Optional
from datetime import datetime, timezone
from backend.utils.config import DB_PATH

def _get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = _get_conn()
    cur = conn.cursor()
    # Changed from DROP TABLE IF EXISTS to ensure persistence
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            severity REAL,
            severity_score REAL,
            risk_level TEXT,
            confidence REAL,
            impact TEXT,
            threat_tier TEXT,
            threat_score REAL,
            timestamp TEXT
        )
        """
    )
    conn.commit()
    conn.close()

def append_event(
    vul_type: str,
    severity: Optional[float],
    timestamp: Optional[str] = None,
    severity_score: Optional[float] = None,
    risk_level: Optional[str] = None,
    confidence: Optional[float] = None,
    impact: Optional[str] = None,
    threat_tier: Optional[str] = None,
    threat_score: Optional[float] = None,
):
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat()
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO events (type, severity, severity_score, risk_level, confidence, impact, threat_tier, threat_score, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (vul_type, severity, severity_score, risk_level, confidence, impact, threat_tier, threat_score, timestamp),
    )
    conn.commit()
    conn.close()

def get_recent_events(limit: int = 20):
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT type, severity, severity_score, risk_level, confidence, impact, threat_tier, threat_score, timestamp FROM events ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
