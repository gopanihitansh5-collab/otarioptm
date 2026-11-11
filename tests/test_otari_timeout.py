"""User-approved responsiveness target: the Otari leg gets 5s to answer,
then the gateway falls back. Also: Otari-first only works if the selected
Otari model can answer inside that window, so a measured-fast model is
preferred over the router's latency-blind pick. Zero keys: everything mocked."""

import asyncio
import contextlib
import os

import pytest

import src.gateway.main as gw
from src.services.otari_client import OTARIClient


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


def _provider_result(content, cost=0.0):
    return {
        "model": "fake-model",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
        "usage": {"total_tokens": 12},
        "cost": cost,
    }


class _RecordingOtari:
    def __init__(self):
        self.models_called = []

    async def chat_completions(self, model, messages, max_tokens):
        self.models_called.append(model)
        return _provider_result("ok")


def test_otari_client_default_timeout_is_five_seconds(monkeypatch):
    monkeypatch.delenv("OTARI_TIMEOUT_SECONDS", raising=False)
    client = OTARIClient("test-key")
    assert client.client.timeout.read == pytest.approx(5.0)


def test_otari_client_timeout_env_override(monkeypatch):
    monkeypatch.setenv("OTARI_TIMEOUT_SECONDS", "12")
    client = OTARIClient("test-key")
    assert client.client.timeout.read == pytest.approx(12.0)


def test_measured_fast_otari_model_preferred_over_router_pick(monkeypatch):
    fake = _RecordingOtari()
    monkeypatch.setattr(gw, "otari_client", fake)
    monkeypatch.setattr(gw, "groq_client", None)
    models = [
        # A slow reasoning model the latency-blind router would otherwise pick.
        {"id": "alibaba/qwen-3.5-35b-a3b", "name": "Qwen 3.5 35B A3B", "cost_per_token": 0.0, "latency": 999, "health": 0.99},
        {"id": "meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B", "cost_per_token": 0.0, "latency": 999, "health": 0.9},
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
    assert fake.models_called == ["meta/llama-3.1-8b-instruct"]
    assert result["chain"] == ["otari"]


def test_router_choice_kept_when_no_preferred_model_in_catalog(monkeypatch):
    fake = _RecordingOtari()
    monkeypatch.setattr(gw, "otari_client", fake)
    monkeypatch.setattr(gw, "groq_client", None)
    models = [
        {"id": "vendor/some-chat-model", "name": "Some Chat", "cost_per_token": 0.0, "latency": 999, "health": 0.9},
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
    assert fake.models_called == ["vendor/some-chat-model"]
    assert result["chain"] == ["otari"]
