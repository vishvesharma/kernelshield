from fastapi.testclient import TestClient
from backend.main import app
from backend import store
import json

client = TestClient(app)


def test_simulations_and_persistence():
    # clear/init db
    store.init_db()

    # initial health
    h0 = client.get('/api/v1/system/health').json()
    assert 'analysis' in h0

    # call buffer simulation
    resp = client.get('/api/v1/simulate/buffer').json()
    assert resp['analysis']['simulation']['type'] == 'buffer_overflow'
    assert 'detection' in resp['analysis']

    # ensure event persisted with full attributes
    events = store.get_recent_events(limit=5)
    assert len(events) >= 1
    first = events[0]
    assert first['type'] == 'buffer_overflow'
    # new fields should be present (may be None initially)
    assert 'severity_score' in first
    assert 'risk_level' in first
    assert 'confidence' in first
    assert 'impact' in first
    assert 'threat_tier' in first
    assert 'threat_score' in first

    # call trapdoor and cache
    client.get('/api/v1/simulate/trapdoor')
    client.get('/api/v1/simulate/cache')

    # health should reflect events_tracked >= 3
    h1 = client.get('/api/v1/system/health').json()
    assert h1['analysis']['events_tracked'] >= 3


def test_new_endpoints():
    # ensure history populates after a few attacks
    client.get('/api/v1/simulate/buffer')
    client.get('/api/v1/simulate/trapdoor')
    hhist = client.get('/api/v1/system/health/history').json()
    assert isinstance(hhist, list)
    assert len(hhist) >= 2

    summary = client.get('/api/v1/system/summary').json()
    assert summary['total_events'] >= 2
    assert 'high_risk_events' in summary
    assert 'last_attack_type' in summary

    # events endpoint returns enriched data
    resp = client.get('/api/v1/events/recent')
    evs = resp.json()
    assert 'severity_score' in evs[0]
    assert 'risk_level' in evs[0]


import pytest

@pytest.mark.skip("Websocket tests cause uvicorn reload in test environment")
def test_websocket_notifications():
    # at least the websocket endpoint accepts connections
    with client.websocket_connect('/ws/updates') as ws:
        # no errors on open/close
        pass


def test_events_and_metrics():
    # ensure some events exist by firing the three simulations
    client.get('/api/v1/simulate/buffer')
    client.get('/api/v1/simulate/trapdoor')
    client.get('/api/v1/simulate/cache')

    resp = client.get('/api/v1/events/recent')
    assert resp.status_code == 200
    events = resp.json()
    assert isinstance(events, list)
    assert len(events) >= 1

    # metrics endpoint returns dict of counts
    resp2 = client.get('/api/v1/metrics/type_counts')
    assert resp2.status_code == 200
    counts = resp2.json()
    assert isinstance(counts, dict)
    # at least one known type should appear
    assert any(t in counts for t in ['buffer_overflow', 'trapdoor', 'cache_poisoning'])
