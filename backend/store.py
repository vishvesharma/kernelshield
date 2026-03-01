import sqlite3
from typing import Optional
from datetime import datetime, timezone
import os

from backend.config import DB_PATH


def _get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    cur = conn.cursor()
    # drop existing table so migrations are simple for this prototype
    cur.execute("DROP TABLE IF EXISTS events")
    cur.execute(
        """
        CREATE TABLE events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            threat_tier TEXT,
            threat_score REAL,
            type TEXT,
            severity REAL,
            severity_score REAL,
            risk_level TEXT,
    # enable WAL mode for improved concurrency
    try:
        cur.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass
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
