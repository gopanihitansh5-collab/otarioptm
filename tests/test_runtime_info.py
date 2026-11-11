"""Runtime/transport labels: the dashboard must never fake live WS state.

On Vercel serverless the /api/v1/activity WebSocket cannot stay open, so
health and the activity snapshot must label the supported transport as
polling. Locally (no VERCEL env) the WebSocket transport is available.
"""

from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)


def test_health_labels_local_runtime_with_websocket(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    data = client.get("/api/v1/health").json()
    assert data["runtime"] == "local"
    assert data["activity_transport"] == "websocket+poll"
    assert data["activity_snapshot_path"] == "/api/v1/activity"


def test_health_labels_vercel_runtime_with_polling(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    data = client.get("/api/v1/health").json()
    assert data["runtime"] == "vercel-serverless"
    assert data["activity_transport"] == "poll"


def test_activity_snapshot_labels_polling_on_vercel(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    data = client.get("/api/v1/activity").json()
    assert data["activity_transport"] == "poll"
    assert data["activity_snapshot_path"] == "/api/v1/activity"
    assert "events" in data and "budget" in data


def test_activity_snapshot_labels_websocket_locally(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    data = client.get("/api/v1/activity").json()
    assert data["activity_transport"] == "websocket+poll"
