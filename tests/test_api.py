"""Gateway API tests via FastAPI TestClient. No network, no provider keys:
the gateway must answer from its deterministic demo tier."""

import pytest
from fastapi.testclient import TestClient

import src.gateway.main as gw
from src.gateway.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _fresh_rate_limiter():
    """Every test starts with an empty rate-limit bucket table."""
    gw._limiter._buckets.clear()
    yield
    gw._limiter._buckets.clear()


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


# --- P0-4: graph validation ---------------------------------------------------

def test_workflow_rejects_cycle():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {"id": "a", "type": "chat", "data": {"prompt": "a"}},
                {"id": "b", "type": "chat", "data": {"prompt": "b"}},
            ],
            "edges": [
                {"id": "e1", "source": "a", "target": "b"},
                {"id": "e2", "source": "b", "target": "a"},
            ],
        },
    )
    assert r.status_code == 400
    assert "cycle" in r.json()["detail"].lower()


def test_workflow_rejects_duplicate_node_id():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {"id": "dup", "type": "chat", "data": {"prompt": "a"}},
                {"id": "dup", "type": "chat", "data": {"prompt": "b"}},
            ],
            "edges": [],
        },
    )
    assert r.status_code == 400
    assert "dup" in r.json()["detail"]


def test_workflow_rejects_node_without_id():
    r = client.post(
        "/api/v1/workflow/run",
        json={"nodes": [{"type": "chat", "data": {"prompt": "a"}}], "edges": []},
    )
    assert r.status_code == 400
    assert "id" in r.json()["detail"].lower()


def test_workflow_rejects_edge_to_unknown_node():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "a"}}],
            "edges": [{"id": "e1", "source": "n1", "target": "ghost"}],
        },
    )
    assert r.status_code == 400
    assert "ghost" in r.json()["detail"]


# --- P0-3: inbound payload caps ----------------------------------------------

@pytest.mark.parametrize(
    "payload,keyword",
    [
        (
            {
                "nodes": [
                    {"id": f"n{i}", "type": "chat", "data": {"prompt": "x"}}
                    for i in range(gw.MAX_WORKFLOW_NODES + 1)
                ],
                "edges": [],
            },
            "nodes",
        ),
        (
            {
                "nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "x"}}],
                "edges": [
                    {"id": f"e{i}", "source": "n1", "target": "n1"}
                    for i in range(gw.MAX_WORKFLOW_EDGES + 1)
                ],
            },
            "edges",
        ),
        (
            {
                "nodes": [
                    {"id": "n1", "type": "chat", "data": {"prompt": "x" * (gw.MAX_PROMPT_CHARS + 1)}}
                ],
                "edges": [],
            },
            "prompt",
        ),
        (
            {
                "nodes": [
                    {"id": "n1", "type": "code-exec", "data": {"code": "x" * (gw.MAX_CODE_CHARS + 1)}}
                ],
                "edges": [],
            },
            "code",
        ),
    ],
)
def test_workflow_payload_caps(payload, keyword):
    r = client.post("/api/v1/workflow/run", json=payload)
    assert r.status_code == 400
    assert keyword in r.json()["detail"].lower()


def test_chat_completions_rejects_too_many_messages():
    r = client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"} for _ in range(gw.MAX_MESSAGES + 1)]},
    )
    assert r.status_code == 400
    assert "messages" in r.json()["detail"].lower()


def test_chat_completions_rejects_oversized_message():
    r = client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "x" * (gw.MAX_PROMPT_CHARS + 1)}]},
    )
    assert r.status_code == 400


def test_max_tokens_is_clamped():
    assert gw._clamp_max_tokens(0) == 1
    assert gw._clamp_max_tokens(-5) == 1
    assert gw._clamp_max_tokens(10 ** 9) == gw.MAX_TOKENS_MAX
    assert gw._clamp_max_tokens(512) == 512
    assert gw._clamp_max_tokens(None) == 4000


def test_max_tokens_non_numeric_is_400():
    with pytest.raises(gw.HTTPException) as err:
        gw._clamp_max_tokens("abc")
    assert err.value.status_code == 400


def test_template_id_length_capped():
    r = client.get("/api/v1/templates/" + "a" * (gw.MAX_TEMPLATE_ID_CHARS + 1))
    assert r.status_code == 400


def test_malformed_json_body_is_400():
    r = client.post(
        "/api/v1/workflow/run",
        content=b"{not json",
        headers={"content-type": "application/json"},
    )
    assert r.status_code == 400


# --- P0-1: sandbox escape ------------------------------------------------------

ESCAPE_PAYLOAD = "().__class__.__bases__[0].__subclasses__()"


def test_code_exec_blocks_subclass_escape():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [{"id": "c1", "type": "code-exec", "data": {"code": ESCAPE_PAYLOAD}}],
            "edges": [],
        },
    )
    assert r.status_code == 200
    step = r.json()["steps"][0]
    assert step["status"] == "failed"
    assert step["error"]
    assert "Traceback" not in step["output"]


def test_code_exec_escape_has_no_side_effect(tmp_path):
    marker = tmp_path / "pwned.txt"
    code = f"open({str(marker)!r}, 'w').write('x')"
    r = client.post(
        "/api/v1/workflow/run",
        json={"nodes": [{"id": "c1", "type": "code-exec", "data": {"code": code}}], "edges": []},
    )
    assert r.status_code == 200
    step = r.json()["steps"][0]
    assert step["status"] == "failed"
    assert not marker.exists()


def test_code_exec_blocks_imports():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {"id": "c1", "type": "code-exec", "data": {"code": "import os\nprint(os.getcwd())"}}
            ],
            "edges": [],
        },
    )
    assert r.status_code == 200
    step = r.json()["steps"][0]
    assert step["status"] == "failed"
    assert "import" in step["error"].lower()


def test_code_exec_cannot_reach_subprocess_or_os(tmp_path):
    marker = tmp_path / "pwned.txt"
    code = (
        "for c in ().__class__.__bases__[0].__subclasses__():\n"
        f"    if 'Popen' in getattr(c, '__name__', ''):\n"
        f"        c(['touch', {str(marker)!r}])\n"
    )
    r = client.post(
        "/api/v1/workflow/run",
        json={"nodes": [{"id": "c1", "type": "code-exec", "data": {"code": code}}], "edges": []},
    )
    assert r.status_code == 200
    step = r.json()["steps"][0]
    assert step["status"] == "failed"
    assert step["error"]
    assert not marker.exists()


def test_code_exec_runs_benign_code():
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {"id": "c1", "type": "code-exec", "data": {"code": "print('hello sandbox')\nprint(2 + 3)"}}
            ],
            "edges": [],
        },
    )
    assert r.status_code == 200
    step = r.json()["steps"][0]
    assert step["status"] == "completed"
    assert "hello sandbox" in step["output"]
    assert "5" in step["output"]


# --- P0-5: activity payloads ---------------------------------------------------

def test_workflow_started_event_payload():
    client.post(
        "/api/v1/workflow/run",
        json={"nodes": [{"id": "a1", "type": "chat", "data": {"prompt": "hi"}}], "edges": []},
    )
    events = [e for e in gw.ACTIVITY_LOG if e.get("event") == "workflow.started"]
    assert events
    event = events[-1]
    assert event["nodeCount"] == 1
    assert event["nodes"] == ["a1"]
