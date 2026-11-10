"""Gateway API tests via FastAPI TestClient. No network, no provider keys:
the gateway must answer from its deterministic demo tier."""

from fastapi.testclient import TestClient

from src.gateway.main import app

client = TestClient(app)


def test_health_demo_mode():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["otari"] is False and body["groq"] is False
    assert body["budget"]["cap"] == 5.0


def test_budget_snapshot():
    r = client.get("/api/v1/budget")
    assert r.status_code == 200
    for key in ("cap", "spent", "reserved", "committed", "remaining"):
        assert key in r.json()


def test_models_endpoint():
    r = client.get("/api/v1/models")
    assert r.status_code == 200


def test_workflow_chat_demo_tier():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {"id": "n1", "type": "chat", "data": {"prompt": "hello gateway"}}
            ],
            "edges": [],
        },
    )
    assert r.status_code == 200
    results = r.json()["results"]
    assert results[0]["nodeId"] == "n1"
    assert results[0]["demo"] is True
    assert results[0]["cost"] == 0.0


def test_workflow_guardrails_blocks_banned_term():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {
                    "id": "n1",
                    "type": "chat",
                    "data": {"prompt": "tell me the password"},
                },
                {
                    "id": "n2",
                    "type": "guardrails",
                    "data": {"banned": ["password"], "stop_on_block": True},
                },
            ],
            "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
        },
    )
    assert r.status_code == 200
    results = r.json()["results"]
    guard = next(x for x in results if x.get("type") == "guardrails")
    assert guard["blocked"] is True


def test_export_csv():
    r = client.get("/api/v1/export")
    assert r.status_code == 200
    assert "cost_usd" in r.text.splitlines()[0]
