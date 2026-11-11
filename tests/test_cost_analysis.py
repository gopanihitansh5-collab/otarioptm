"""Deterministic cost-only analysis derived from computed rows only."""

import asyncio
import unittest.mock as mock

import src.gateway.main as gw


def _payload(stdout):
    async def fake_run_code(code):
        return {"ok": True, "output": stdout}

    async def fake_log(event):
        return None

    nodes = [{"id": "calc", "type": "code-exec", "data": {"code": "..."}}]
    with mock.patch.object(gw, "_run_code", fake_run_code), \
         mock.patch.object(gw, "_log_activity", fake_log):
        ordered = gw._topo_order(nodes, [])
        return asyncio.run(gw._execute_graph(ordered, [], models=[], max_tokens=64))


def test_cost_analysis_orders_and_names_cheapest():
    payload = _payload('{"results": [{"model": "b", "monthly_cost": 3.0}, {"model": "a", "monthly_cost": 1.5}], "currency": "USD"}')
    ca = payload["costAnalysis"]
    assert ca["cheapest"] == {"model": "a", "monthly_cost": 1.5}
    assert [r["model"] for r in ca["rows"]] == ["a", "b"]
    assert ca["basis"] == "cost-only"
    assert "not benchmarked" in ca["note"]


def test_cost_analysis_rows_key():
    payload = _payload('{"rows": [{"model": "x", "monthly_cost": 9.9}]}')
    assert payload["costAnalysis"]["cheapest"]["model"] == "x"


def test_cost_analysis_absent_without_cost_rows():
    payload = _payload('{"answer": 42}')
    assert payload["costAnalysis"] is None
    payload2 = _payload("plain text")
    assert payload2["costAnalysis"] is None
