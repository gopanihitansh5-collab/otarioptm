"""Explicit free-search enforcement and structured computed output.

A run-level searchProvider or node-level data.provider of "duckduckgo"
guarantees the paid search path is never invoked - without touching
credentials. computedJson carries the parsed structured output of code
nodes so report tables never read LLM prose.
"""

import asyncio
import unittest.mock as mock

import src.gateway.main as gw


def _run(nodes, edges, search_provider=None):
    ordered = gw._topo_order(nodes, edges)
    return asyncio.run(gw._execute_graph(ordered, edges, models=[], max_tokens=64,
                                         search_provider=search_provider))


def _search_graph(data=None):
    return ([{"id": "search-1", "type": "web-search", "data": data or {"query": "q"}}], [])


def _patches(calls):
    async def fake_ddg(query, objective=None):
        calls.append(("duckduckgo", query))
        return {"results_text": "free result", "cost": 0.0, "provider": "duckduckgo", "objective": objective}

    async def fake_web(query, objective=None):
        calls.append(("web", query))
        return {"results_text": "exa result", "cost": 0.007, "provider": "exa", "objective": objective}

    async def fake_log(event):
        return None

    return mock.patch.object(gw, "_duckduckgo_search", fake_ddg), \
           mock.patch.object(gw, "_web_search", fake_web), \
           mock.patch.object(gw, "_log_activity", fake_log)


def test_run_level_search_provider_forces_free_path():
    calls = []
    nodes, edges = _search_graph()
    p1, p2, p3 = _patches(calls)
    with p1, p2, p3:
        payload = _run(nodes, edges, search_provider="duckduckgo")
    assert [c[0] for c in calls] == ["duckduckgo"]
    assert payload["steps"][0]["provider"] == "duckduckgo"
    assert payload["steps"][0]["cost"] == 0.0


def test_node_level_provider_forces_free_path():
    calls = []
    nodes, edges = _search_graph({"query": "q", "provider": "duckduckgo"})
    p1, p2, p3 = _patches(calls)
    with p1, p2, p3:
        payload = _run(nodes, edges)
    assert [c[0] for c in calls] == ["duckduckgo"]


def test_default_uses_standard_search_path():
    calls = []
    nodes, edges = _search_graph()
    p1, p2, p3 = _patches(calls)
    with p1, p2, p3:
        _run(nodes, edges)
    assert [c[0] for c in calls] == ["web"]


def _code_payload(stdout):
    async def fake_run_code(code):
        return {"ok": True, "output": stdout}

    async def fake_log(event):
        return None

    nodes = [{"id": "calc", "type": "code-exec", "data": {"code": "..."}}]
    with mock.patch.object(gw, "_run_code", fake_run_code), \
         mock.patch.object(gw, "_log_activity", fake_log):
        return _run(nodes, [])


def test_computed_json_parses_json_object():
    payload = _code_payload('{"rows": [{"model": "a", "monthly_cost": 1.5}], "currency": "USD"}')
    assert payload["computedJson"]["calc"]["rows"][0]["monthly_cost"] == 1.5


def test_computed_json_parses_python_dict_repr():
    payload = _code_payload("{'Model A': 1.5, 'Model B': 3.0}")
    assert payload["computedJson"]["calc"] == {"Model A": 1.5, "Model B": 3.0}


def test_computed_json_absent_for_plain_text():
    payload = _code_payload("not structured at all")
    assert payload["computedJson"] == {}
    assert payload["computedData"] == {"calc": "not structured at all"}
