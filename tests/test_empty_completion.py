"""Regression tests: empty provider completions fall back truthfully (and
failed paid attempts keep their real cost), plus the global per-instance
burst cap. Zero keys: everything mocked."""

import asyncio
import contextlib

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


def _provider_result(content, cost=0.0, tool_calls=None):
    message = {"role": "assistant", "content": content}
    if tool_calls is not None:
        message["tool_calls"] = tool_calls
    return {
        "model": "fake-model",
        "choices": [{"index": 0, "message": message, "finish_reason": "stop"}],
        "usage": {"total_tokens": 12},
        "cost": cost,
    }


class _FakeOtari:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    async def chat_completions(self, model, messages, max_tokens):
        if self.error:
            raise RuntimeError(self.error)
        return self.result


class _FakeGroq:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    async def post(self, path, *args, **kwargs):
        if self.error:
            raise RuntimeError(self.error)

        class _Resp:
            status_code = 200
            text = ""

            def json(self):
                return self._payload

        resp = _Resp()
        resp._payload = self.result
        return resp


def _run_step(models=None, max_tokens=100):
    return asyncio.run(
        gw.execute_chat_step(
            {"id": "n1", "type": "chat"},
            [{"role": "user", "content": "hi"}],
            models if models is not None else gw.FALLBACK_CATALOG,
            max_tokens,
        )
    )


# --- Empty completion handling ---------------------------------------------

def test_empty_otari_completion_falls_back_to_groq_and_keeps_billed_cost(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("", cost=0.0004)))
    monkeypatch.setattr(gw, "groq_client", _FakeGroq(result=_provider_result("real groq answer")))
    with _isolated_budget() as budget:
        result = _run_step()
        snap = asyncio.run(budget.snapshot())
    assert result["chain"] == ["otari->groq"]
    assert result["output"] == "real groq answer"
    assert result["demo"] is False
    # The failed paid attempt was billed by the provider and stays billed.
    assert snap["spent"] == pytest.approx(0.0004)
    assert result["note"] and "no completion content" in result["note"]
    assert result["costSource"] == "provider-reported"


def test_empty_otari_without_groq_falls_to_labeled_demo(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("   ")))
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget():
        result = _run_step()
    assert result["chain"] == ["otari->demo"]
    assert result["demo"] is True
    assert result["output"].startswith("[DEMO")
    assert result["note"] and "no completion content" in result["note"]
    assert result["costSource"] == "estimate"


def test_empty_completion_with_unreported_cost_charges_estimate_not_zero(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("", cost=0.0)))
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget() as budget:
        result = _run_step()
        snap = asyncio.run(budget.snapshot())
    assert result["chain"] == ["otari->demo"]
    # A 200 with no content and no cost report can still have billed: the
    # shared estimate is charged, never a silently free paid attempt.
    assert snap["spent"] > 0.0
    assert result["costSource"] == "estimate"
    # snapshot() rounds spend to 6 decimals for display; compare within that.
    assert snap["spent"] == pytest.approx(result["cost"], abs=1e-6)


def test_tool_call_only_response_is_a_failure_not_an_empty_success(monkeypatch):
    tool_calls = [{"id": "c1", "type": "function", "function": {"name": "f", "arguments": "{}"}}]
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result(None, cost=0.0, tool_calls=tool_calls)))
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget():
        result = _run_step()
    assert result["chain"] == ["otari->demo"]
    assert result["demo"] is True
    # Tool-call-only responses must be explained, not flattened into a
    # generic provider error.
    assert result["note"] and "tool calls only" in result["note"]


def test_valid_otari_completion_unchanged(monkeypatch):
    monkeypatch.setattr(gw, "otari_client", _FakeOtari(result=_provider_result("solid answer", cost=0.001)))
    monkeypatch.setattr(gw, "groq_client", None)
    with _isolated_budget() as budget:
        result = _run_step()
        snap = asyncio.run(budget.snapshot())
    assert result["chain"] == ["otari"]
    assert result["output"] == "solid answer"
    assert result["note"] is None
    assert result["costSource"] == "provider-reported"
    assert snap["spent"] == pytest.approx(0.001)


# --- Global per-instance burst cap -----------------------------------------

def test_global_burst_cap_returns_429(monkeypatch):
    monkeypatch.setattr(gw._global_limiter, "capacity", 2.0)
    monkeypatch.setattr(gw._global_limiter, "refill", 0.0)
    codes = [
        client.post("/api/v1/chat/completions", json={"messages": [{"role": "user", "content": "hi"}]}).status_code
        for _ in range(4)
    ]
    assert 429 in codes
    assert codes[0] != 429  # normal first request unaffected
