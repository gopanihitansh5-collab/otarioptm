"""Tests for the gateway factory seam, template gallery, SSE streaming,
per-IP rate limiting, and the model-health probe. Zero keys: demo mode only."""

import asyncio
import contextlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)

TEMPLATE_IDS = {"research-then-summarize", "guarded-chat", "code-review", "web-fact-check"}
PROJECT_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def _fresh_rate_limiter():
    """Every test starts with an empty rate-limit bucket table."""
    gw._limiter._buckets.clear()
    yield
    gw._limiter._buckets.clear()


@contextlib.contextmanager
def _isolated_budget(cap: float | None = None):
    """Run a block against a private budget state and restore it afterwards."""
    saved_spend = gw.budget.spend
    saved_reservations = dict(gw.budget.reservations)
    saved_cap = gw.budget.config["budget"]["project_cap"]
    if cap is not None:
        gw.budget.config["budget"]["project_cap"] = cap
    gw.budget.spend = 0.0
    gw.budget.reservations.clear()
    try:
        yield gw.budget
    finally:
        gw.budget.spend = saved_spend
        gw.budget.reservations.clear()
        gw.budget.reservations.update(saved_reservations)
        gw.budget.config["budget"]["project_cap"] = saved_cap


class _FakeOtari:
    """Minimal stand-in for the OTARI client."""

    def __init__(self, cost=None, error=None):
        self.cost = cost
        self.error = error

    async def chat_completions(self, model, messages, max_tokens):
        if self.error:
            raise RuntimeError(self.error)
        return {
            "model": model,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "fake reply"}}],
            "usage": {"total_tokens": 12},
            "cost": self.cost,
        }


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


def test_every_template_fits_the_configured_max_steps():
    """A template must never exceed workflows.max_steps (it would 400)."""
    max_steps = int(gw.budget.config["workflows"]["max_steps"])
    assert max_steps >= 2
    for tpl in client.get("/api/v1/templates").json():
        assert tpl["nodeCount"] <= max_steps, (
            f"{tpl['id']} has {tpl['nodeCount']} nodes > max_steps={max_steps}"
        )


def test_every_template_runs_to_completion_in_demo_mode(monkeypatch):
    """Every starter template must run end-to-end through /workflow/run."""

    async def fake_search(query, objective=None):
        # Hermetic stub: no outbound search call from the test suite.
        return {"results_text": "stub result", "cost": 0.0, "provider": "stub", "objective": objective}

    monkeypatch.setattr(gw, "_web_search", fake_search)

    templates = client.get("/api/v1/templates").json()
    assert templates
    for tpl in templates:
        with _isolated_budget():
            r = client.post("/api/v1/workflow/run", json=tpl["graph"])
            assert r.status_code == 200, tpl["id"]
            body = r.json()
            assert body["aborted"] is None, f"{tpl['id']} aborted at {body.get('aborted')}"
            assert len(body["steps"]) == tpl["nodeCount"], tpl["id"]
            for step in body["steps"]:
                assert "error" not in step, f"{tpl['id']} step failed: {step}"
            assert body["budget"]["spent"] <= body["budget"]["cap"]


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


# --- P0-6: CORS ----------------------------------------------------------------

def test_cors_allows_vercel_origin():
    # Previews are scoped to the project's own Vercel team slug; see
    # tests/test_cors_scoping.py for the full policy matrix.
    app2 = gw.create_app()
    r = TestClient(app2).get(
        "/api/v1/health",
        headers={"Origin": "https://otarioptm-abc-hitanshuser50s-projects.vercel.app"},
    )
    assert r.status_code == 200
    assert (
        r.headers.get("access-control-allow-origin")
        == "https://otarioptm-abc-hitanshuser50s-projects.vercel.app"
    )


def test_cors_rejects_unknown_origin():
    app2 = gw.create_app()
    r = TestClient(app2).get(
        "/api/v1/health", headers={"Origin": "https://evil.example.com"}
    )
    assert r.status_code == 200
    assert "access-control-allow-origin" not in r.headers


def test_cors_honours_allowed_origins_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://studio.example.com, https://other.example.com")
    app2 = gw.create_app()
    c = TestClient(app2)
    r = c.get("/api/v1/health", headers={"Origin": "https://studio.example.com"})
    assert r.headers.get("access-control-allow-origin") == "https://studio.example.com"
    r2 = c.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
    assert r2.headers.get("access-control-allow-origin") == "http://localhost:3000"



# --- P0-5: websocket pong payload ----------------------------------------------

def test_websocket_pong_payload_is_typed():
    with client.websocket_connect("/api/v1/activity") as ws:
        snapshot = ws.receive_json()
        assert "cap" in snapshot and "spent" in snapshot
        ws.send_text("ping")
        pong = ws.receive_json()
    assert pong["event"] == "pong"
    assert pong["type"] == "pong"
    assert "cap" in pong and "spent" in pong


# --- P0-2: budget lifecycle ----------------------------------------------------

def test_raising_provider_leaves_no_outstanding_reservation(monkeypatch):
    async def boom_demo(*args, **kwargs):
        raise RuntimeError("demo tier exploded")

    monkeypatch.setattr(gw, "otari_client", _FakeOtari(error="provider exploded"))
    monkeypatch.setattr(gw, "_demo_chat", boom_demo)

    with _isolated_budget() as budget:
        with pytest.raises(RuntimeError):
            asyncio.run(
                gw.execute_chat_step(
                    {"id": "n1", "type": "chat"},
                    [{"role": "user", "content": "hi"}],
                    gw.FALLBACK_CATALOG,
                    100,
                )
            )
        assert budget.reservations == {}
        snap = asyncio.run(budget.snapshot())
        assert snap["reserved"] == 0.0


def test_provider_error_does_not_double_count(monkeypatch):
    calls = {"settle": 0, "record": 0, "release": 0}
    original_settle = gw.budget.settle
    original_record = gw.budget.record
    original_release = gw.budget.release

    async def counting_settle(rid, cost):
        calls["settle"] += 1
        return await original_settle(rid, cost)

    async def counting_record(rid, cost):
        calls["record"] += 1
        return await original_record(rid, cost)

    async def counting_release(rid):
        calls["release"] += 1
        return await original_release(rid)

    monkeypatch.setattr(gw.budget, "settle", counting_settle)
    monkeypatch.setattr(gw.budget, "record", counting_record)
    monkeypatch.setattr(gw.budget, "release", counting_release)
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(error="provider exploded"))

    with _isolated_budget() as budget:
        result = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                gw.FALLBACK_CATALOG,
                100,
            )
        )
        assert calls["settle"] == 1, "exactly one terminal action per reservation"
        assert calls["record"] == 0, "settle is the canonical primitive (never record)"
        assert calls["release"] == 0, "never release-then-record"
        snap = asyncio.run(budget.snapshot())
        assert snap["reserved"] == 0.0
        assert snap["spent"] == 0.0
    assert result["chain"] == ["otari->demo"]
    assert result["note"] and "otari error" in result["note"]


def test_spend_never_exceeds_cap(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(cost=100.0))
    with _isolated_budget(cap=0.5) as budget:
        result = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                gw.FALLBACK_CATALOG,
                100,
            )
        )
        snap = asyncio.run(budget.snapshot())
        assert snap["spent"] <= snap["cap"]
        assert snap["spent"] == 0.5
    assert result["overBudget"] is True
    assert result["cost"] <= 0.5


def test_budget_cap_still_answers_402():
    with _isolated_budget(cap=0.0):
        r = client.post(
            "/api/v1/chat/completions",
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
        assert r.status_code == 402


def test_workflow_aborts_at_budget_cap():
    with _isolated_budget(cap=0.0):
        r = client.post(
            "/api/v1/workflow/run",
            json={"nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "hi"}}], "edges": []},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["aborted"] == "n1"
        assert body["budget"]["spent"] <= body["budget"]["cap"]


# --- P1-7 / P1-8: routing step type and search objective ------------------------

def test_routing_step_type_mapping():
    assert gw._routing_step_type({"type": "chat"}) == "chat"
    assert gw._routing_step_type({"type": "code-exec"}) == "code"
    assert gw._routing_step_type({"type": "web-search"}) == "search"
    assert gw._routing_step_type({"type": "guardrails"}) == "chat"
    assert gw._routing_step_type(None) == "chat"


def test_chat_step_routes_with_keyword_step_type(monkeypatch):
    seen = {}

    def fake_select(candidates, *args, **kwargs):
        seen["args"] = args
        seen["kwargs"] = kwargs
        return {"id": "demo", "name": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0}, 0.0, "demo"

    monkeypatch.setattr(gw, "select_model", fake_select)
    r = client.post(
        "/api/v1/workflow/run",
        json={"nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "hi"}}], "edges": []},
    )
    assert r.status_code == 200
    assert seen["kwargs"].get("step_type") == "chat"
    assert "budget_remaining" in seen["kwargs"]


def test_web_search_passes_objective_to_helper(monkeypatch):
    captured = {}

    async def fake_search(query, objective=None):
        captured["query"] = query
        captured["objective"] = objective
        return {"results_text": "stub result", "cost": 0.0, "provider": "stub", "objective": objective}

    monkeypatch.setattr(gw, "_web_search", fake_search)
    r = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [
                {
                    "id": "s1",
                    "type": "web-search",
                    "data": {"query": "otari pricing", "objective": "find current pricing"},
                }
            ],
            "edges": [],
        },
    )
    assert r.status_code == 200
    assert captured["objective"] == "find current pricing"
    step = r.json()["steps"][0]
    assert step["objective"] == "find current pricing"


# --- V1: one shared cost estimate (gateway <-> router) --------------------------

def test_gateway_estimate_is_the_router_estimate():
    """The gateway must estimate exactly like the router does."""
    model = {"id": "openai:gpt-4o-mini", "cost_per_token": 0.00000015, "latency": 600, "health": 0.95}
    router_est = gw.router_mod.estimated_call_cost(model)
    assert router_est > 0
    for messages in ([{"role": "user", "content": "hi"}], [{"role": "user", "content": "x" * 4000}]):
        assert gw._estimate_cost(model, messages, 4000) == pytest.approx(router_est)
    # The model's own max_tokens hint wins, exactly like in the router.
    hinted = dict(model, max_tokens=2000)
    assert gw._estimate_cost(hinted, [], 4000) == pytest.approx(
        gw.router_mod.estimated_call_cost(hinted)
    )
    # A free tier costs nothing in both places.
    free = {"id": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0}
    assert gw._estimate_cost(free, [{"role": "user", "content": "hi"}], 4000) == 0.0


def test_reservation_never_exceeds_the_router_estimate(monkeypatch):
    """A model the router called affordable must not be rejected by reserve()."""
    reserved = {}
    original_reserve = gw.budget.reserve

    async def spy_reserve(est):
        reserved["est"] = est
        return await original_reserve(est)

    monkeypatch.setattr(gw.budget, "reserve", spy_reserve)
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(cost=0.0))

    models = [
        {"id": "paid-cheap", "name": "paid-cheap", "cost_per_token": 0.0000002, "latency": 600, "health": 0.95},
    ]
    router_est = gw.router_mod.estimated_call_cost(models[0])
    with _isolated_budget(cap=5.0):
        result = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                models,
                100,
            )
        )
    assert reserved["est"] == pytest.approx(router_est)
    assert reserved["est"] <= router_est  # never larger than the router checked
    assert result["cost"] == pytest.approx(router_est)


def test_router_affordable_model_is_not_rejected_with_402():
    """The router's verdict and the gateway's reservation must agree."""
    models = [
        {"id": "paid-cheap", "name": "paid-cheap", "cost_per_token": 0.0000002, "latency": 600, "health": 0.95},
    ]
    cap = 0.001  # tight but sufficient for one call
    with _isolated_budget(cap=cap):
        remaining = asyncio.run(gw.budget.get_remaining())
        chosen, _score, reason = gw._select_model(models, remaining, "chat")
        assert chosen is not None, reason
        est = gw._estimate_cost(chosen, [], 100)
        ok, _rid = asyncio.run(gw.budget.reserve(est))
        assert ok, "router-affordable model was rejected by reserve()"
        assert est <= remaining


# --- V1: provider response bodies never reach a client -------------------------

class _FakeProviderResponse:
    def __init__(self, status_code: int, text: str) -> None:
        self.status_code = status_code
        self.text = text

    def json(self):
        return {}


class _FakeGroqClient:
    """Groq stand-in that always fails with a body full of secrets."""

    BODY = '{"error":{"message":"invalid key sk_live_supersecretvalue"}}'

    async def get(self, path, *args, **kwargs):
        return _FakeProviderResponse(429, self.BODY)

    async def post(self, path, *args, **kwargs):
        return _FakeProviderResponse(429, self.BODY)


def test_groq_error_message_contains_no_response_body(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroqClient())
    with pytest.raises(RuntimeError) as err:
        asyncio.run(gw._groq_chat([{"role": "user", "content": "hi"}], 100))
    text = str(err.value)
    assert "429" in text
    assert "supersecretvalue" not in text
    assert "sk_live" not in text


def test_fallback_note_never_echoes_a_provider_body(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroqClient())
    models = [
        {"id": "paid", "name": "paid", "cost_per_token": 0.0000002, "latency": 600, "health": 0.95},
    ]
    with _isolated_budget():
        result = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                models,
                100,
            )
        )
    assert result["chain"] == ["groq->demo"]
    assert result["note"] and "groq error" in result["note"]
    assert "429" in result["note"]
    assert "supersecretvalue" not in json.dumps(result)
    recent = [e for e in gw.ACTIVITY_LOG if e.get("event") == "node.completed"][-1]
    assert "supersecretvalue" not in json.dumps(recent)


# --- V1: import-time side effects (Vercel) ------------------------------------

def _load_module_from_path(name: str, path: Path):
    """Load a module fresh (not from sys.modules) under ``name``."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _scrub_provider_env(monkeypatch) -> None:
    """Remove every provider credential and the .env loader from the env."""
    import dotenv

    monkeypatch.setattr(dotenv, "load_dotenv", lambda *a, **k: False)
    for key in ("OTARI_API_KEY", "GROQ_API_KEY", "EXA_API_KEY", "RESEND_API_KEY"):
        monkeypatch.delenv(key, raising=False)


def test_import_needs_no_env_vars_config_or_network(tmp_path, monkeypatch):
    """Importing the gateway must not require env vars or a config file."""
    _scrub_provider_env(monkeypatch)
    monkeypatch.setenv("OTARIOPTM_CONFIG", str(tmp_path / "missing-config.yml"))
    module = _load_module_from_path(
        "otari_gateway_fresh_import", PROJECT_ROOT / "src" / "gateway" / "main.py"
    )
    assert module.app is not None
    # No config file -> the built-in defaults are used, not a crash.
    assert module.budget.config["budget"]["project_cap"] == 5.0
    assert module.budget.config["workflows"]["max_steps"] >= 2
    # No provider key -> the gateway stays in demo mode, it does not fail.
    assert module.otari_client is None and module.groq_client is None


def test_vercel_entrypoint_imports_cleanly(tmp_path, monkeypatch):
    """api/index.py (the Vercel entrypoint) must import with a bare env."""
    _scrub_provider_env(monkeypatch)
    monkeypatch.setenv("OTARIOPTM_CONFIG", str(tmp_path / "missing-config.yml"))
    module = _load_module_from_path("otari_vercel_entry", PROJECT_ROOT / "api" / "index.py")
    assert module.app is not None


# --- V2: the background health probe is actually scheduled ---------------------

def test_health_probe_task_is_scheduled_on_startup_and_cancelled_on_shutdown(monkeypatch):
    """The periodic health-probe loop must really run.

    The suite never starts the ASGI lifespan (the TestClient is used without a
    context manager, so the lifespan must not run), therefore the
    startup/shutdown handlers are driven directly here.
    """
    monkeypatch.delenv("OTARI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    async def _scenario():
        await gw.startup()
        task = gw._probe_task
        assert task is not None, "startup must schedule the health-probe loop"
        assert not task.done(), "the probe loop must be running"
        # Scheduling again must not start a second, competing loop.
        assert gw._schedule_health_probe() is task
        await gw.shutdown()
        return task

    task = asyncio.run(_scenario())
    assert task.cancelled(), "shutdown must cancel the probe task"
    assert gw._probe_task is None


# --- Router chat-model hygiene: no classifiers/embeddings serve chat steps ---

class _FakeOtariCatalog:
    def __init__(self, payload):
        self._payload = payload

    async def fetch_models(self):
        return self._payload


class _FakeGroqModels:
    def __init__(self, ids):
        self._ids = ids

    async def get(self, path):
        class _Resp:
            status_code = 200

            def __init__(self, ids):
                self._ids = ids

            def json(self):
                return {"data": [{"id": i} for i in self._ids]}

        return _Resp(self._ids)


def test_is_chat_model_excludes_guard_and_embedding_ids():
    assert gw._is_chat_model({"id": "alibaba/qwen3-32b"})
    assert gw._is_chat_model({"id": "openai:gpt-4o-mini"})
    assert not gw._is_chat_model({"id": "meta-llama/llama-prompt-guard-2-22m"})
    assert not gw._is_chat_model({"id": "meta/llama-guard-4-12b", "type": "chat"})
    assert not gw._is_chat_model({"id": "openai/gpt-oss-safeguard-20b", "type": "chat"})
    assert not gw._is_chat_model({"id": "alibaba/qwen3-embedding-4b"})
    assert not gw._is_chat_model({"id": "some/model", "type": "embedding"})


def test_model_catalog_unwraps_otari_list_and_filters_non_chat(monkeypatch):
    payload = {
        "object": "list",
        "data": [
            {"id": "alibaba/qwen3-embedding-0.6b", "type": "embedding"},
            {"id": "alibaba/qwen-3.5-35b-a3b", "type": "chat"},
            {"id": "meta/llama-guard-4-12b", "type": "chat"},
        ],
    }
    monkeypatch.setattr(gw, "otari_client", _FakeOtariCatalog(payload))
    catalog = asyncio.run(gw._model_catalog())
    ids = [m.get("id") for m in catalog]
    assert "alibaba/qwen-3.5-35b-a3b" in ids
    assert "alibaba/qwen3-embedding-0.6b" not in ids
    assert "meta/llama-guard-4-12b" not in ids
    assert "demo" in ids  # demo tier always appended
    monkeypatch.setattr(gw, "otari_client", None)


def test_model_catalog_accepts_plain_list(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtariCatalog([{"id": "a/b", "type": "chat"}]))
    ids = [m.get("id") for m in asyncio.run(gw._model_catalog())]
    assert "a/b" in ids
    monkeypatch.setattr(gw, "otari_client", None)


def test_groq_pick_prefers_priority_chat_model(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroqModels(
        ["meta-llama/llama-prompt-guard-2-22m", "llama-3.1-8b-instant"]))
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    assert asyncio.run(gw._groq_pick_model()) == "llama-3.1-8b-instant"
    monkeypatch.setattr(gw, "_groq_model_cache", None)


def test_groq_pick_never_selects_classifier(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroqModels(
        ["meta-llama/llama-prompt-guard-2-22m", "meta-llama/llama-4-scout-17b-16e-instruct"]))
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    assert asyncio.run(gw._groq_pick_model()) == "meta-llama/llama-4-scout-17b-16e-instruct"
    monkeypatch.setattr(gw, "_groq_model_cache", None)
