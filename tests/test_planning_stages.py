"""Multi-stage planning: decompose -> assignment -> enhancement.

Groq-first provider policy, shared context, strict per-stage validation,
graceful labeled degradation for post-decompose stages, per-node model
narrowing in the runner, catalog-zero cost labeling, and the real SSE
per-node event feed. Zero keys: provider chain mocked.
"""

import contextlib
import json
import json as _jsonmod

import pytest
from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)


@pytest.fixture(autouse=True)
def _fresh_limiters():
    gw._limiter._buckets.clear()
    gw._global_limiter._buckets.clear()
    yield
    gw._limiter._buckets.clear()
    gw._global_limiter._buckets.clear()


@contextlib.contextmanager
def _isolated_budget(cap=5.0):
    saved_spend = gw.budget.spend
    saved_reservations = dict(gw.budget.reservations)
    saved_cap = gw.budget.config["budget"]["project_cap"]
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


PLAN = {
    "nodes": [
        {"id": "search-pricing", "type": "web-search", "query": "current pricing"},
        {"id": "report", "type": "chat", "prompt": "Write a report using {{search-pricing}}."},
    ],
    "edges": [{"source": "search-pricing", "target": "report"}],
    "rationale": "research then write",
}

ASSIGNMENT = {
    "assignments": [
        {"id": "report", "model": "alibaba/qwen3.8-flash", "reason": "fast"},
    ]
}

ENHANCEMENT = {
    "enhanced": [
        {"id": "report", "system": "You are a pricing analyst.", "prompt": "Compare the plans in {{search-pricing}} with explicit volume assumptions."},
    ]
}


class _ScriptedGroq:
    """Answers each planning stage call in order with canned JSON."""

    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = 0

    async def get(self, path):
        class _R:
            status_code = 200

            def json(self):
                return {"data": [{"id": "llama-3.3-70b-versatile"}]}

        return _R()

    async def post(self, path, json=None):
        self.calls += 1
        content = self.replies.pop(0) if self.replies else "{}"
        gw._groq_model_cache = "llama-3.3-70b-versatile"

        class _R:
            status_code = 200
            text = ""

            def json(self_nonlocal):
                return {
                    "model": "llama-3.3-70b-versatile",
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                    "usage": {"total_tokens": 50},
                }

        return _R()


def _plan(task="compare support models", **kw):
    return client.post("/api/v1/workflow/plan", json={"task": task, **kw})


async def _catalog_with_flash():
    return [
        {"id": "alibaba/qwen3.8-flash", "cost_per_token": 0.0, "latency": 1, "health": 1.0},
        {"id": "alibaba/qwen-3.5-35b-a3b", "cost_per_token": 0.0, "latency": 999, "health": 0.9},
    ]


def test_three_stages_applied_and_provenance(monkeypatch):
    monkeypatch.setattr(gw, "_models", _catalog_with_flash)
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    monkeypatch.setattr(
        gw, "groq_client",
        _ScriptedGroq([_jsonmod.dumps(PLAN), json.dumps(ASSIGNMENT), json.dumps(ENHANCEMENT)]),
    )
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["source"] == "live-planner"
    assert body["planner"]["provider"] == "groq"
    # assignment applied into the graph
    report = next(n for n in body["graph"]["nodes"] if n["id"] == "report")
    assert report["data"]["model"] == "alibaba/qwen3.8-flash"
    # enhancement applied into the graph
    assert report["data"]["prompt"].startswith("Compare the plans")
    assert report["data"]["system"] == "You are a pricing analyst."
    # stage provenance present
    assert body["stages"]["decompose"]["provider"] == "groq"
    assert body["stages"]["assignment"]["assigned"]["report"]["model"] == "alibaba/qwen3.8-flash"
    assert body["stages"]["enhancement"]["enhancedNodes"] == ["report"]


def test_invalid_assignment_degrades_to_warning(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    monkeypatch.setattr(
        gw, "groq_client",
        _ScriptedGroq([_jsonmod.dumps(PLAN), "not json at all", json.dumps(ENHANCEMENT)]),
    )
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200, r.text
    body = r.json()
    assert any("assignment stage output rejected" in w for w in body["warnings"])
    report = next(n for n in body["graph"]["nodes"] if n["id"] == "report")
    assert "model" not in report["data"]
    # enhancement still ran and applied
    assert body["stages"]["enhancement"]["enhancedNodes"] == ["report"]


def test_unknown_assignment_model_dropped(monkeypatch):
    bad = {"assignments": [{"id": "report", "model": "evil/model"}]}
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    monkeypatch.setattr(
        gw, "groq_client",
        _ScriptedGroq([_jsonmod.dumps(PLAN), json.dumps(bad), json.dumps(ENHANCEMENT)]),
    )
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200, r.text
    body = r.json()
    assert any("unknown model" in w for w in body["warnings"])
    report = next(n for n in body["graph"]["nodes"] if n["id"] == "report")
    assert "model" not in report["data"]


def test_assignment_stage_unavailable_still_returns_plan(monkeypatch):
    class _FailGroq:
        def __init__(self):
            self.n = 0

        async def get(self, path):
            class _R:
                status_code = 200

                def json(self):
                    return {"data": [{"id": "llama-3.3-70b-versatile"}]}

            return _R()

        async def post(self, path, json=None):
            self.n += 1
            if self.n == 2:  # assignment stage fails
                raise RuntimeError("boom")

            class _R:
                status_code = 200
                text = ""

                def json(self):
                    return {
                        "model": "m",
                        "choices": [{"index": 0, "message": {"role": "assistant", "content": _jsonmod.dumps(PLAN)}, "finish_reason": "stop"}],
                        "usage": {"total_tokens": 10},
                    }

            return _R()

    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    monkeypatch.setattr(gw, "groq_client", _FailGroq())
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200, r.text
    body = r.json()
    assert any("assignment stage unavailable" in w for w in body["warnings"])


def test_enhancement_keeps_original_on_empty_prompt(monkeypatch):
    bad = {"enhanced": [{"id": "report", "system": "", "prompt": ""}]}
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    monkeypatch.setattr(
        gw, "groq_client",
        _ScriptedGroq([_jsonmod.dumps(PLAN), json.dumps(ASSIGNMENT), json.dumps(bad)]),
    )
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200, r.text
    body = r.json()
    assert any("empty enhanced prompt" in w for w in body["warnings"])
    report = next(n for n in body["graph"]["nodes"] if n["id"] == "report")
    assert report["data"]["prompt"] == "Write a report using {{search-pricing}}."


def test_assigned_model_narrows_runner_routing(monkeypatch):
    """A plan's per-node model assignment must steer the actual run."""
    seen = {}

    class _Otari:
        async def chat_completions(self, model, messages, max_tokens):
            seen["model"] = model
            return {
                "model": model,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": "done"}, "finish_reason": "stop"}],
                "usage": {"total_tokens": 10},
            }

    monkeypatch.setattr(gw, "otari_client", _Otari())
    monkeypatch.setattr(gw, "groq_client", None)

    async def fake_models():
        return [
            {"id": "alibaba/qwen3.8-flash", "cost_per_token": 0.0, "latency": 1, "health": 1.0},
            {"id": "alibaba/qwen-3.5-35b-a3b", "cost_per_token": 0.0, "latency": 999, "health": 0.9},
        ]

    monkeypatch.setattr(gw, "_models", fake_models)
    with _isolated_budget():
        r = client.post("/api/v1/workflow/run", json={
            "nodes": [{"id": "n1", "type": "chat", "data": {"prompt": "hi", "model": "alibaba/qwen3.8-flash"}}],
            "edges": [],
        })
    assert r.status_code == 200, r.text
    assert seen["model"] == "alibaba/qwen3.8-flash"


def test_otari_chat_step_labeled_catalog_zero(monkeypatch):
    """Otari answers with no reported cost and a zero-price catalog: the
    ledger must never present that as verified free."""

    class _Otari:
        async def chat_completions(self, model, messages, max_tokens):
            return {
                "model": "alibaba/qwen3.8-flash",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": "ok"}, "finish_reason": "stop"}],
                "usage": {"total_tokens": 10},
            }

    monkeypatch.setattr(gw, "otari_client", _Otari())
    monkeypatch.setattr(gw, "groq_client", None)

    async def fake_models():
        return [{"id": "alibaba/qwen3.8-flash", "cost_per_token": 0.0, "latency": 1, "health": 1.0}]

    monkeypatch.setattr(gw, "_models", fake_models)
    with _isolated_budget():
        r = client.post("/api/v1/chat/completions", json={"messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 200, r.text
    events = [e for e in gw.ACTIVITY_LOG if e.get("nodeId") == "adhoc"]
    assert events[-1]["costSource"] == "catalog-zero"


def test_workflow_stream_emits_real_node_events(monkeypatch):
    """The SSE feed carries one event per actual node execution."""

    class _Otari:
        async def chat_completions(self, model, messages, max_tokens):
            return {
                "model": "m",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": "real answer"}, "finish_reason": "stop"}],
                "usage": {"total_tokens": 10},
            }

    monkeypatch.setattr(gw, "otari_client", _Otari())
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget():
        with client.stream("POST", "/api/v1/workflow/run/stream", json={
            "nodes": [
                {"id": "a", "type": "chat", "data": {"prompt": "first"}},
                {"id": "b", "type": "chat", "data": {"prompt": "second using {{a}}"}},
            ],
            "edges": [{"source": "a", "target": "b"}],
        }) as resp:
            assert resp.status_code == 200
            raw = "".join(resp.iter_text())
    events = []
    for line in raw.splitlines():
        if line.startswith("data: ") and line[6:].strip().startswith("{"):
            events.append(json.loads(line[6:]))
    kinds = [e.get("event") for e in events]
    assert kinds.count("node.started") == 2
    assert kinds.count("node.completed") == 2
    assert "workflow.finished" in kinds
    # order: a starts and completes before b starts (real sequential execution)
    seq = [(e["event"], e.get("nodeId")) for e in events if e.get("event") in ("node.started", "node.completed")]
    assert seq == [
        ("node.started", "a"), ("node.completed", "a"),
        ("node.started", "b"), ("node.completed", "b"),
    ]
    # completed events carry the real output, not a placeholder
    done_a = next(e for e in events if e.get("event") == "node.completed" and e.get("nodeId") == "a")
    assert done_a["output"] == "real answer"


def test_workflow_stream_enforces_same_payload_bounds(monkeypatch):
    """The stream endpoint shares _prepare_workflow: same 400s as batch."""
    assert client.post("/api/v1/workflow/run/stream", json={"nodes": [], "edges": []}).status_code == 400
    assert client.post("/api/v1/workflow/run/stream", json={"nodes": "nope", "edges": []}).status_code == 400
    big = {"nodes": [{"id": "n", "type": "chat", "data": {"prompt": "x" * 8001}}], "edges": []}
    assert client.post("/api/v1/workflow/run/stream", json=big).status_code == 400


def test_workflow_stream_accounts_spend_like_batch(monkeypatch):
    """A streamed run settles reservations exactly like a batch run."""

    async def fake_search(query, objective=None):
        return {"results_text": f"results for {query}", "cost": 0.01, "provider": "stub", "objective": objective}

    monkeypatch.setattr(gw, "_web_search", fake_search)
    with _isolated_budget() as b:
        with client.stream("POST", "/api/v1/workflow/run/stream", json={
            "nodes": [{"id": "s", "type": "web-search", "data": {"query": "pricing"}}],
            "edges": [],
        }) as resp:
            assert resp.status_code == 200
            raw = "".join(resp.iter_text())
        assert "workflow.finished" in raw
        assert b.spend == pytest.approx(0.01)
        assert not b.reservations  # no leaked reservation after stream close


def test_workflow_stream_402_on_cap(monkeypatch):
    with _isolated_budget(cap=0.0):
        gw.budget.spend = 0.0
        r = client.post("/api/v1/workflow/run/stream", json={
            "nodes": [{"id": "s", "type": "web-search", "data": {"query": "x"}}],
            "edges": [],
        })
    # web-search reserves the Exa bound against a zero cap -> honest 402 stream error event
    assert r.status_code == 200
    assert "budget" in r.text or "error" in r.text
