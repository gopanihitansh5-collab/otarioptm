"""Dependents of a failed node are blocked by default.

A downstream node must not present an analysis as complete when one of its
inputs never computed: it is skipped with an explicit status, the run is
labeled partial, and independent branches still execute. A node opts out
explicitly with data.handles_failure = true, in which case it receives a
short failure marker - never the raw traceback.
"""

import asyncio

import pytest

import src.gateway.main as gw


def _graph(chat_data=None):
    nodes = [
        {"id": "a", "type": "code-exec", "data": {"code": "boom"}},
        {"id": "b", "type": "code-exec", "data": {"code": "print(1)"}},
        {"id": "c", "type": "chat", "data": chat_data or {"prompt": "use {{a}} and {{b}}"}},
    ]
    edges = [{"source": "a", "target": "c"}, {"source": "b", "target": "c"}]
    return nodes, edges


@pytest.fixture
def harness(monkeypatch):
    calls = {"chat_prompts": []}

    async def fake_run_code(code):
        if "boom" in code:
            return {"ok": False, "output": "\n--- stderr ---\nNameError: name 'reqs' is not defined",
                    "error": "program exited with code 1"}
        return {"ok": True, "output": "1"}

    async def fake_chat(node, messages, models, max_tokens):
        calls["chat_prompts"].append(messages[-1]["content"])
        return {"nodeId": str(node["id"]), "output": "answer", "model": "m",
                "chain": ["groq"], "cost": 0.0, "demo": False}

    async def fake_log(event):
        return None

    monkeypatch.setattr(gw, "_run_code", fake_run_code)
    monkeypatch.setattr(gw, "execute_chat_step", fake_chat)
    monkeypatch.setattr(gw, "_log_activity", fake_log)
    return calls


def _run(nodes, edges):
    ordered = gw._topo_order(nodes, edges)
    return asyncio.run(gw._execute_graph(ordered, edges, models=[], max_tokens=64))


def test_failed_upstream_blocks_dependent(harness):
    nodes, edges = _graph()
    payload = _run(nodes, edges)
    by_id = {r["nodeId"]: r for r in payload["steps"]}
    assert harness["chat_prompts"] == []  # chat node never called a provider
    assert by_id["c"]["status"] == "skipped"
    assert "upstream node 'a' failed" in by_id["c"]["error"]
    assert by_id["b"]["status"] == "completed"  # independent branch still ran
    assert payload["partial"] is True
    assert payload["failedNodes"] == ["a", "c"]


def test_handles_failure_opt_in_gets_marker_not_traceback(harness):
    nodes, edges = _graph({"prompt": "use {{a}} and {{b}}", "handles_failure": True})
    payload = _run(nodes, edges)
    assert len(harness["chat_prompts"]) == 1
    prompt = harness["chat_prompts"][0]
    assert "[node a failed: program exited with code 1]" in prompt
    assert "NameError" not in prompt and "stderr" not in prompt
    assert "use " in prompt and " 1" in prompt  # successful upstream substituted
    assert payload["partial"] is True
    assert payload["failedNodes"] == ["a"]
