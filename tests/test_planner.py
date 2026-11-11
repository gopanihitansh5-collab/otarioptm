"""Task-to-workflow planner: live model decomposition, strict validation,
no preset fallback. Zero keys: provider chain mocked."""

import asyncio
import contextlib
import json

import pytest
from fastapi.testclient import TestClient

import src.gateway.main as gw
from src.gateway import planner

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


VALID_PLAN = {
    "nodes": [
        {"id": "search-pricing", "type": "web-search", "query": "current pricing"},
        {"id": "search-reviews", "type": "web-search", "query": "recent reviews"},
        {"id": "analyze", "type": "code-exec", "code": "print(len('x'))"},
        {"id": "report", "type": "chat", "prompt": "Write a report using {{search-pricing}}, {{search-reviews}} and {{analyze}}."},
    ],
    "edges": [
        {"source": "search-pricing", "target": "analyze"},
        {"source": "search-reviews", "target": "report"},
        {"source": "analyze", "target": "report"},
    ],
    "rationale": "parallel research, compute, synthesize",
}


class _FakeOtari:
    def __init__(self, content):
        self.content = content

    async def chat_completions(self, model, messages, max_tokens):
        return {
            "model": "fake-model",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": self.content}, "finish_reason": "stop"}],
            "usage": {"total_tokens": 100},
            "cost": 0.0002,
        }




class _FakeGroq:
    """Free-tier Groq mock: every planning stage call returns the same content."""

    def __init__(self, content):
        self.content = content

    async def get(self, path):
        class _R:
            status_code = 200

            def json(self):
                return {"data": [{"id": "llama-3.3-70b-versatile"}]}

        return _R()

    async def post(self, path, json=None):
        content = self.content

        class _R:
            status_code = 200
            text = ""

            def json(self):
                return {
                    "model": "llama-3.3-70b-versatile",
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                    "usage": {"total_tokens": 100},
                    "cost": 0.0002,
                }

        return _R()

def _plan(task="compare two products", **kw):
    return client.post("/api/v1/workflow/plan", json={"task": task, **kw})


# --- happy path -------------------------------------------------------------

def test_plan_returns_validated_graph_from_live_model(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(VALID_PLAN)))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "live-planner"
    assert body["summary"] == "parallel research, compute, synthesize"
    nodes = body["graph"]["nodes"]
    assert [n["id"] for n in nodes] == ["search-pricing", "search-reviews", "analyze", "report"]
    assert nodes[0]["data"] == {"query": "current pricing"}
    assert nodes[2]["data"]["code"] == "print(len('x'))"
    assert all("position" in n for n in nodes)
    edges = body["graph"]["edges"]
    assert {e["source"] for e in edges} == {"search-pricing", "search-reviews", "analyze"}
    # the graph passes the runner's own topo validation
    gw._topo_order(nodes, edges)
    # planner spend is budget-accounted and reported
    assert body["planner"]["cost"] == pytest.approx(0.0002)
    assert body["planner"]["costSource"] == "provider-reported"
    assert body["planner"]["provider"] == "groq"


def test_plan_accepts_fenced_json(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroq("```json\n" + json.dumps(VALID_PLAN) + "\n```"))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 200


def test_plan_graph_executes_through_existing_runner(monkeypatch):
    """The planned graph must be directly runnable by /api/v1/workflow/run."""
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(VALID_PLAN)))
    monkeypatch.setattr(gw, "otari_client", _FakeOtari("workflow answer"))
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")

    async def fake_search(query, objective=None):
        return {"results_text": f"results for {query}", "cost": 0.0, "provider": "stub", "objective": objective}

    monkeypatch.setattr(gw, "_web_search", fake_search)
    with _isolated_budget():
        body = _plan().json()
        r = client.post("/api/v1/workflow/run", json=body["graph"])
    assert r.status_code == 200
    steps = {s["nodeId"]: s for s in r.json()["steps"]}
    assert steps["search-pricing"]["output"] == "results for current pricing"
    assert "report" in steps


# --- honest failures, never a preset ----------------------------------------

def test_plan_rejects_unparseable_model_output(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroq("sorry, I cannot help"))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 422
    assert "rejected" in r.json()["detail"]


def test_plan_rejects_invalid_graph(monkeypatch):
    bad = {"nodes": [{"id": "a", "type": "hack-the-planet", "prompt": "x"}]}
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(bad)))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 422
    assert "unknown type" in r.json()["detail"]


def test_plan_rejects_cycle(monkeypatch):
    cyclic = {
        "nodes": [{"id": "a", "type": "chat", "prompt": "x"}, {"id": "b", "type": "chat", "prompt": "y"}],
        "edges": [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}],
    }
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(cyclic)))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 422
    assert "cycle" in r.json()["detail"]


def test_plan_503_without_real_provider(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 503
    assert "Groq" in r.json()["detail"]


def test_plan_400_on_missing_or_oversized_task(monkeypatch):
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(VALID_PLAN)))
    assert _plan(task="").status_code == 400
    assert _plan(task="x" * (planner.PLANNER_MAX_TASK_CHARS + 1)).status_code == 400


def test_plan_rejects_too_many_nodes(monkeypatch):
    big = {"nodes": [{"id": f"n{i}", "type": "chat", "prompt": "x"} for i in range(planner.PLANNER_MAX_NODES + 1)]}
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(big)))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        r = _plan()
    assert r.status_code == 422


def test_unknown_model_fields_dropped_with_warning(monkeypatch):
    plan = json.loads(json.dumps(VALID_PLAN))
    plan["nodes"][0]["evil"] = "ignore-me"
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(json.dumps(plan)))
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "_groq_model_cache", "llama-3.3-70b-versatile")
    with _isolated_budget():
        body = _plan().json()
    assert "evil" not in body["graph"]["nodes"][0]["data"]
    assert any("dropped unknown field" in w for w in body["warnings"])
