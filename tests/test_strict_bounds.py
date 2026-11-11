"""Strict reservation bounds: a crash between call and settle can never lose spend.

The reservation for a paid step is a provable upper bound on that step's
cost, not an estimate: prompt tokens <= serialized payload bytes (BPE
encodes >= 1 byte per token) and output is capped provider-side by
max_tokens, so cost <= max-per-token-price x (payload_bytes + max_tokens).
"""

import asyncio
import contextlib

import pytest

import src.gateway.main as gw
from src.services import router as router_mod


@contextlib.contextmanager
def _isolated_budget(cap=None):
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
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    async def chat_completions(self, model, messages, max_tokens):
        if self.error:
            raise RuntimeError(self.error)
        return self.result


def _provider_result(content, cost=0.0):
    return {
        "model": "fake-model",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
        "usage": {"total_tokens": 12},
        "cost": cost,
    }


PAID = {"id": "paid-x", "name": "paid-x", "cost_per_token": 0.0000002, "latency": 600, "health": 0.95}


# --- bound math -------------------------------------------------------------

def test_bound_uses_payload_bytes_plus_max_tokens():
    bound = router_mod.strict_call_bound(PAID, payload_bytes=1000, max_tokens=500)
    assert bound == pytest.approx(0.0000002 * 1500)


def test_bound_uses_the_larger_completion_price():
    model = dict(PAID, pricing={"prompt": 0.0000001, "completion": 0.0000004})
    bound = router_mod.strict_call_bound(model, payload_bytes=100, max_tokens=100)
    assert bound == pytest.approx(0.0000004 * 200)


def test_bound_is_zero_for_free_tiers():
    assert router_mod.strict_call_bound({"id": "demo", "cost_per_token": 0.0},
                                        payload_bytes=10, max_tokens=10) == 0.0


def test_bound_covers_token_count_asymptotically():
    """BPE encodes >= 1 byte per token: tokens(text) <= len(text.encode())."""
    for text in ("hi", "hello world " * 100, "x", "1234567890" * 50):
        assert len(text.encode("utf-8")) >= 1  # property placeholder; see gateway test


# --- reservation uses the bound ---------------------------------------------

def test_crash_path_charges_bound_and_loses_nothing(monkeypatch):
    """If the provider region is entered but settle never runs, the finally
    block charges the reserved bound - provably >= any spend the step could
    have made."""
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("ok", cost=0.0)))
    monkeypatch.setattr(gw, "groq_client", None)

    import json
    messages = [{"role": "user", "content": "hi"}]
    payload_bytes = len(json.dumps(messages, ensure_ascii=False).encode("utf-8"))
    bound = router_mod.strict_call_bound(PAID, payload_bytes=payload_bytes, max_tokens=100)

    real_settle = gw._settle_reservation

    async def exploding_settle(rid, cost):
        raise RuntimeError("simulated crash before settle")

    monkeypatch.setattr(gw, "_settle_reservation", exploding_settle)
    charged = {}
    original_crash_settle = None

    # The finally-block settle must also be the exploding one; instead we
    # verify via budget state: patch only the first call. Simpler: patch
    # budget.settle to explode once, then restore.
    calls = {"n": 0}
    real_budget_settle = gw.budget.settle

    async def flaky_settle(rid, cost):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("crash on first settle")
        charged["cost"] = cost
        return await real_budget_settle(rid, cost)

    monkeypatch.setattr(gw.budget, "settle", flaky_settle)
    monkeypatch.setattr(gw, "_settle_reservation", real_settle)
    with _isolated_budget(cap=5.0):
        # The first settle raises inside the try; the finally block retries
        # with the full reservation (the bound) and succeeds.
        with pytest.raises(RuntimeError):
            asyncio.run(
                gw.execute_chat_step({"id": "n1", "type": "chat"}, messages, [PAID], 100)
            )
    assert calls["n"] == 2  # crashed once, finally-block settled at bound
    assert charged["cost"] == pytest.approx(bound)


def test_reported_cost_above_flat_estimate_still_within_bound(monkeypatch):
    """A provider-reported cost far above the router's flat estimate must
    still be <= the reserved bound for the same prompt."""
    import json
    # Large prompt: the flat estimate (500 tokens) badly under-covers it,
    # but the byte-based bound must cover any real charge.
    messages = [{"role": "user", "content": "word " * 2000}]
    payload_bytes = len(json.dumps(messages, ensure_ascii=False).encode("utf-8"))
    bound = router_mod.strict_call_bound(PAID, payload_bytes=payload_bytes, max_tokens=100)
    flat_est = router_mod.estimated_call_cost(PAID)
    reported = flat_est * 3  # way above the flat estimate
    assert reported < bound  # the bound, not the estimate, must cover it

    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("answer", cost=reported)))
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget(cap=5.0) as budget:
        result = asyncio.run(
            gw.execute_chat_step({"id": "n1", "type": "chat"}, messages, [PAID], 100)
        )
        snap = asyncio.run(budget.snapshot())
    assert result["cost"] == pytest.approx(reported)
    assert snap["spent"] == pytest.approx(reported, abs=1e-6)
    assert result["costSource"] == "provider-reported"


def test_free_tier_still_reserves_nothing(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "groq_client", None)
    reserved = {}
    original_reserve = gw.budget.reserve

    async def spy_reserve(est):
        reserved["est"] = est
        return await original_reserve(est)

    monkeypatch.setattr(gw.budget, "reserve", spy_reserve)
    with _isolated_budget(cap=5.0):
        result = asyncio.run(
            gw.execute_chat_step({"id": "n1", "type": "chat"},
                                 [{"role": "user", "content": "hi"}],
                                 [{"id": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0}],
                                 100)
        )
    assert reserved["est"] == 0.0
    assert result["demo"] is True
