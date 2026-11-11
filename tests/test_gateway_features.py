"""Tests for the gateway factory seam, template gallery, SSE streaming,
per-IP rate limiting, and the model-health probe. Zero keys: demo mode only."""

import json

from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)

TEMPLATE_IDS = {"research-then-summarize", "guarded-chat", "code-review", "web-fact-check"}


# --- P1: create_app() factory seam -----------------------------------------

def test_create_app_factory_produces_distinct_working_app():
    app2 = gw.create_app()
    assert app2 is not gw.app
    # No context manager: like the existing suite, lifespan must not run, so
    # no .env keys are picked up and tests stay in deterministic demo mode.
    r = TestClient(app2).get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_module_app_unchanged_demo_mode():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["otari"] is False and body["groq"] is False


# --- P2: template gallery ----------------------------------------------------

def test_templates_list_has_four_runnable_graphs():
    r = client.get("/api/v1/templates")
    assert r.status_code == 200
    templates = r.json()
    assert TEMPLATE_IDS <= {t["id"] for t in templates}
    for t in templates:
        assert set(t) >= {"id", "name", "description", "nodeCount", "graph"}
        assert t["nodeCount"] == len(t["graph"]["nodes"]) >= 2
        assert t["graph"]["edges"], f"{t['id']} graph has no edges"
        for node in t["graph"]["nodes"]:
            assert node.get("type") in ("chat", "web-search", "code-exec", "guardrails")


def test_template_detail_and_unknown_404():
    r = client.get("/api/v1/templates/guarded-chat")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "guarded-chat"
    assert body["graph"]["nodes"] and body["graph"]["edges"]
    assert client.get("/api/v1/templates/does-not-exist").status_code == 404


def test_workflow_run_from_template_demo_mode():
    tpl = client.get("/api/v1/templates/guarded-chat").json()
    r = client.post("/api/v1/workflow/run", json=tpl["graph"])
    assert r.status_code == 200
    body = r.json()
    steps = body["steps"]
    assert {s.get("type") for s in steps} >= {"chat", "guardrails"}
    guard = next(s for s in steps if s.get("type") == "guardrails")
    assert guard["blocked"] is False  # benign prompt passes
    assert body["aborted"] is None


# --- P4: SSE chat stream ------------------------------------------------------

def test_chat_stream_sse_events():
    with client.stream(
        "POST",
        "/api/v1/chat/completions/stream",
        json={"messages": [{"role": "user", "content": "hi gateway"}]},
    ) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        body = "".join(chunk for chunk in r.iter_text())
    assert "event: delta" in body
    assert "event: done" in body
    assert "event: error" not in body
    assert ": heartbeat" not in body  # short demo reply: no idle window

    done_blocks = [
        line[5:] for line in body.splitlines()
        if line.startswith("data:") and '"cost"' in line
    ]
    assert done_blocks, "done event must carry budget/cost payload"
    payload = json.loads(done_blocks[-1])
    assert payload["cost"] == 0.0  # demo mode: budget recorded at $0


def test_chat_stream_requires_messages():
    r = client.post("/api/v1/chat/completions/stream", json={"messages": []})
    assert r.status_code == 400


# --- P5: per-IP rate limiting -------------------------------------------------

def test_rate_limit_429_with_retry_after():
    limiter = gw._limiter
    saved = (limiter.enabled, limiter.capacity, limiter.refill)
    limiter.enabled, limiter.capacity, limiter.refill = True, 2.0, 0.0001
    limiter._buckets.clear()
    try:
        payload = {"nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "hi"}}], "edges": []}
        r1 = client.post("/api/v1/workflow/run", json=payload)
        r2 = client.post("/api/v1/workflow/run", json=payload)
        r3 = client.post("/api/v1/workflow/run", json=payload)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r3.status_code == 429
        assert int(r3.headers["retry-after"]) >= 1
    finally:
        limiter.enabled, limiter.capacity, limiter.refill = saved
        limiter._buckets.clear()


def test_rate_limit_exempts_health_and_disabled_mode():
    limiter = gw._limiter
    saved = (limiter.enabled, limiter.capacity, limiter.refill)
    limiter.enabled, limiter.capacity, limiter.refill = False, 0.0, 0.0  # empty bucket, disabled
    limiter._buckets.clear()
    try:
        assert client.get("/api/v1/health").status_code == 200  # GET exempt anyway
        payload = {"nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "hi"}}], "edges": []}
        assert client.post("/api/v1/workflow/run", json=payload).status_code == 200  # disabled: pass
    finally:
        limiter.enabled, limiter.capacity, limiter.refill = saved
        limiter._buckets.clear()


# --- P6: model-health probe -----------------------------------------------------

def test_models_carry_labeled_probe_values_demo_mode():
    r = client.get("/api/v1/models")
    assert r.status_code == 200
    models = r.json()
    assert models
    for m in models:
        probe = m.get("health_probe") or {}
        assert probe.get("source") == "synthetic-demo"
        assert 0.5 <= probe.get("value", 0) <= 1.0
        assert abs(m["health"] - probe["value"]) < 1e-9  # router consumes the stamped value
