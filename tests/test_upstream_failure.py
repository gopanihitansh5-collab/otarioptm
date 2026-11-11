"""Dependents of a failed node are blocked by default, and chat system
messages get the same template substitution as prompts.

A downstream node must not present an analysis as complete when one of its
inputs never computed: it is skipped with an explicit status, the run is
labeled partial, and independent branches still execute. A node opts out
explicitly with data.handles_failure = true, in which case it receives a
short failure marker - never the raw traceback. System messages reference
upstream outputs too, so they are substituted as well (observed live: an
enhanced system prompt naming literal {{node-id}} placeholders made the
model echo them).
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
    calls = {"chat_messages": []}

    async def fake_run_code(code):
        if "boom" in code:
            return {"ok": False, "output": "\n--- stderr ---\nNameError: name 'reqs' is not defined",
                    "error": "program exited with code 1"}
        return {"ok": True, "output": "1"}

    async def fake_chat(node, messages, models, max_tokens):
        calls["chat_messages"].append(list(messages))
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
    assert harness["chat_messages"] == []  # chat node never called a provider
    assert by_id["c"]["status"] == "skipped"
    assert "upstream node 'a' failed" in by_id["c"]["error"]
    assert by_id["b"]["status"] == "completed"  # independent branch still ran
    assert payload["partial"] is True
    assert payload["failedNodes"] == ["a", "c"]


def test_handles_failure_opt_in_gets_marker_not_traceback(harness):
    nodes, edges = _graph({"prompt": "use {{a}} and {{b}}", "handles_failure": True})
    payload = _run(nodes, edges)
    assert len(harness["chat_messages"]) == 1
    prompt = harness["chat_messages"][0][-1]["content"]
    assert "[node a failed: program exited with code 1]" in prompt
    assert "NameError" not in prompt and "stderr" not in prompt
    assert prompt.endswith("and 1")  # successful upstream substituted
    assert payload["partial"] is True
    assert payload["failedNodes"] == ["a"]


def test_system_message_is_substituted(harness):
    nodes = [
        {"id": "b", "type": "code-exec", "data": {"code": "print(1)"}},
        {"id": "c", "type": "chat",
         "data": {"prompt": "summarize", "system": "Report the value from {{b}} verbatim."}},
    ]
    edges = [{"source": "b", "target": "c"}]
    _run(nodes, edges)
    assert len(harness["chat_messages"]) == 1
    system_msg = [m for m in harness["chat_messages"][0] if m["role"] == "system"][0]
    assert system_msg["content"] == "Report the value from 1 verbatim."


def _run_with_chat_output(chat_output):
    import unittest.mock as mock

    async def fake_run_code(code):
        return {"ok": True, "output": "{'Model A': 1.5, 'Model B': 3.0, 'Model C': 18.4}"}

    async def fake_chat(node, messages, models, max_tokens):
        return {"nodeId": str(node["id"]), "output": chat_output, "model": "m",
                "chain": ["groq"], "cost": 0.0, "demo": False}

    async def fake_log(event):
        return None

    nodes = [
        {"id": "calc", "type": "code-exec", "data": {"code": "print(1)"}},
        {"id": "rec", "type": "chat", "data": {"prompt": "report {{calc}}"}},
    ]
    edges = [{"source": "calc", "target": "rec"}]
    with mock.patch.object(gw, "_run_code", fake_run_code), \
         mock.patch.object(gw, "execute_chat_step", fake_chat), \
         mock.patch.object(gw, "_log_activity", fake_log):
        payload = _run(nodes, edges)
    return {r["nodeId"]: r for r in payload["steps"]}


def test_consistency_cited_when_numbers_appear():
    steps = _run_with_chat_output("Model A costs $1.50, B $3.00, C $18.40. Pick A.")
    assert steps["rec"]["consistency"]["status"] == "cited"


def test_consistency_mismatch_labels_fabrication():
    steps = _run_with_chat_output("Model A costs $0.15, B $0.30, C $1.84 per month.")
    c = steps["rec"]["consistency"]
    assert c["status"] == "mismatch"
    assert 1.5 in c["missing"] and 18.4 in c["missing"]
    assert "unverified" in c["note"]


def test_consistency_absent_without_upstream_numbers():
    import unittest.mock as mock

    async def fake_run_code(code):
        return {"ok": True, "output": "done"}

    async def fake_chat(node, messages, models, max_tokens):
        return {"nodeId": str(node["id"]), "output": "summary", "model": "m",
                "chain": ["groq"], "cost": 0.0, "demo": False}

    async def fake_log(event):
        return None

    nodes = [
        {"id": "calc", "type": "code-exec", "data": {"code": "print('done')"}},
        {"id": "rec", "type": "chat", "data": {"prompt": "report {{calc}}"}},
    ]
    with mock.patch.object(gw, "_run_code", fake_run_code), \
         mock.patch.object(gw, "execute_chat_step", fake_chat), \
         mock.patch.object(gw, "_log_activity", fake_log):
        payload = _run(nodes, [{"source": "calc", "target": "rec"}])
    rec = [r for r in payload["steps"] if r["nodeId"] == "rec"][0]
    assert "consistency" not in rec
