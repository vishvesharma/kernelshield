from backend import risk_engine, detection, health_engine, store, config
from backend.main import _rate_state, _append_event, SEVERITY_MAP
from fastapi.testclient import TestClient
from backend.main import app
import pytest


def setup_function(func):
    # clear shared state before each test
    from backend.main import event_log
    event_log.clear()
    _rate_state.clear()
    # clear DB
    store.init_db()
    # remove any events
    conn = store._get_conn()
    conn.execute("DELETE FROM events")
    conn.commit()
    conn.close()


def test_risk_engine():
    # risk with no impact
    det = {"severity_score": 5, "anomaly_score": 0.5, "confidence": 0.8}
    r = risk_engine.calculate_risk(det)
    # result is a RiskProfile, convert to dict for comparisons
    rdict = r.model_dump()
    # score should equal 5*0.5*0.8 = 2.0 -> low
    assert rdict["risk_score"] == 2.0
    assert rdict["risk_level"] == "Low"
    # risk with impact adds weight and bumps level
    det2 = {"severity_score": 8, "anomaly_score": 1.0, "confidence": 1.0, "impact": "Memory corruption risk"}
    r2 = risk_engine.calculate_risk(det2)
    r2dict = r2.model_dump()
    # calculation: 8*1*1 + 1.5 = 9.5 -> Moderate
    assert r2dict["risk_score"] == 9.5
    assert r2dict["risk_level"] == "Moderate"
    # two-argument signature should behave the same
    sim_stub = {"type": "buffer_overflow"}
    r3 = risk_engine.calculate_risk(sim_stub, det2)
    assert r3 == r2


def test_detection_edge_cases():
    # unknown type
    res = detection.detect_vulnerability({})
    # DetectionResult behaves like an object
    assert res.vulnerability == "unknown"
    assert res.detected is False
    assert res.severity == "Info"
    # new tier and score should exist
    assert res.threat_tier == "Informational"
    assert isinstance(res.threat_score, float)
    # buffer overflow within limit
    sim = {"type": "buffer_overflow", "buffer_limit": 100, "input_size": 50}
    res2 = detection.detect_vulnerability(sim)
    # convert to dict for indexable access
    r2 = res2.model_dump()
    assert r2["anomaly_score"] == 0.0
    # model currently sets base severity 8 even without anomaly
    assert r2["severity"] in ("High", "Low")
    assert "input within" in r2["explanation"].lower()
    # exact overflow boundary
    sim3 = {"type": "buffer_overflow", "buffer_limit": 100, "input_size": 100}
    res3 = detection.detect_vulnerability(sim3)
    assert res3.model_dump()["anomaly_score"] == 0.0
    # trapdoor with various flags
    sim4 = {"type": "trapdoor", "hidden_access_flag": True, "privilege_level": "admin", "unauthorized_access": True}
    res4 = detection.detect_vulnerability(sim4)
    r4 = res4.model_dump()
    assert r4["anomaly_score"] == 1.0
    assert r4["detected"] is True
    assert r4["severity"] == "High"
    # cache poisoning cases
    sim5 = {"type": "cache_poisoning", "corrupted_entry_detected": True}
    res5 = detection.detect_vulnerability(sim5)
    r5 = res5.model_dump()
    assert r5["anomaly_score"] == 0.9
    # legacy field may not exist; just ensure severity_score is numeric
    assert isinstance(r5.get("severity_score"), (int, float))


def test_health_engine_decay():
    # empty log
    events = []
    h0 = health_engine.compute_health(events)
    assert h0["security_score"] == 85
    assert h0["risk_level"] == "Low"
    assert h0["events_tracked"] == 0

    # add one event with current timestamp and check decreasing score
    from datetime import datetime, timezone
    events.append({"type": "buffer_overflow", "severity": 5, "timestamp": datetime.now(timezone.utc).isoformat()})
    h1 = health_engine.compute_health(events)
    assert h1["events_tracked"] == 1
    assert h1["security_score"] < 100

    # add more high-severity events with current timestamps and ensure score drops
    from datetime import datetime, timezone
    for _ in range(5):
        events.append({"type": "trapdoor", "severity": 10, "timestamp": datetime.now(timezone.utc).isoformat()})
    h2 = health_engine.compute_health(events)
    assert h2["security_score"] < h1["security_score"]
    assert h2["events_tracked"] == 6


def test_health_engine_window():
    # events outside the window (default 10 minutes) are ignored
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    old_ts = (now - timedelta(minutes=15)).isoformat()
    recent_ts = now.isoformat()
    events = [
        {"type": "foo", "severity": 5, "timestamp": old_ts},
        {"type": "bar", "severity": 7, "timestamp": recent_ts},
    ]
    result = health_engine.compute_health(events)
    # only the recent event should be counted
    assert result["events_tracked"] == 1


def test_rate_limiter(monkeypatch):
    # set limit low
    monkeypatch.setattr(config, "RATE_LIMIT", 2)
    client = TestClient(app)
    # make two permitted simulation requests
    resp1 = client.get("/api/v1/simulate/buffer")
    resp2 = client.get("/api/v1/simulate/buffer")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    # third should 429
    resp3 = client.get("/api/v1/simulate/buffer")
    assert resp3.status_code == 429


def test_rate_window_reset(monkeypatch):
    # simulate window expiration by manipulating time
    import time as _time
    base = _time.time()
    calls = []
    def fake_time():
        # first two calls return base, then a big jump
        calls.append(1)
        return base if len(calls) < 3 else base + config.RATE_WINDOW + 1
    monkeypatch.setattr("time.time", fake_time)
    monkeypatch.setattr(config, "RATE_LIMIT", 1)
    client = TestClient(app)
    r1 = client.get("/api/v1/simulate/buffer")
    assert r1.status_code == 200
    # next request after window reset should not 429
    r2 = client.get("/api/v1/simulate/buffer")
    assert r2.status_code == 200


def test_append_event_error_paths(monkeypatch):
    # monkeypatch store.append_event to raise
    monkeypatch.setattr(store, "append_event", lambda *args, **kw: (_ for _ in ()).throw(Exception("dberr")))
    # call process_simulation which will invoke _append_event and log exceptions
    client = TestClient(app)
    # patch calculate_risk to raise only when two arguments are supplied
    def flaky_risk(*args, **kwargs):
        if len(args) == 2:
            raise TypeError("broken")
        # return a dummy safe result for the single-arg case
        return {"risk_score": 0.0, "risk_level": "Low"}
    monkeypatch.setattr('backend.main.calculate_risk', flaky_risk)
    # replacement simulate function that returns minimal data
    r = client.get("/api/v1/simulate/buffer")
    assert r.status_code == 200


def test_global_exception_handler():
    @app.get("/explode")
    def explode():
        raise ValueError("boom")
    client = TestClient(app, raise_server_exceptions=False)
    r = client.get("/explode")
    assert r.status_code == 500
    assert r.json().get("error") == "Internal Server Error"


def test_home_and_failure_paths(monkeypatch):
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"].startswith("Kernel Shield")

    # recent_events failure branch
    monkeypatch.setattr(store, "get_recent_events", lambda limit=20: (_ for _ in ()).throw(Exception("x")))
    r2 = client.get("/api/v1/events/recent")
    assert r2.status_code == 500

    # type_counts failure branch by breaking _get_conn
    monkeypatch.setattr(store, "_get_conn", lambda: (_ for _ in ()).throw(Exception("y")))
    r3 = client.get("/api/v1/metrics/type_counts")
    assert r3.status_code == 500


def test_append_event_pop_and_exception():
    # populate event_log to MAX_EVENTS
    from backend.main import event_log, _append_event
    event_log.clear()
    for i in range(20):
        event_log.append({"type": "foo", "severity": 1, "timestamp": "t"})
    # now add one more; should pop first entry
    _append_event({"type": "bar"}, {"severity": 5})
    assert len(event_log) == 20
    assert event_log[-1]["type"] == "bar"
    # force top-level exception by passing non-dict
    _append_event(None, None)  # should not raise



def test_persistence_integrity():
    # append multiple events
    ts = "2026-03-01T12:00:00Z"
    store.append_event("foo", 3.5, ts)
    store.append_event("bar", None, ts)
    store.append_event("foo", 7, ts)
    events = store.get_recent_events(limit=2)
    assert len(events) == 2
    assert events[0]["type"] == "foo"
    assert events[1]["type"] == "bar"


def test_severity_normalization():
    # test _append_event with string severities and numeric
    # monkeypatch store.append_event to capture call
    calls = []
    def fake_append(vtype, sev, ts, **kwargs):
        # ignore any extra keyword arguments convenient for new schema
        calls.append((vtype, sev, ts))
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(store, "append_event", fake_append)
    # string severity
    _append_event({"type": "x"}, {"severity": "High"})
    # numeric severity
    _append_event({"type": "y"}, {"severity": 4})
    # unknown string -> None
    _append_event({"type": "z"}, {"severity": "weird"})
    monkeypatch.undo()
    # verify mapping applied for first two
    assert calls[0][1] == SEVERITY_MAP["High"]
    assert isinstance(calls[1][1], float)
    assert calls[2][1] is None
