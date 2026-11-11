"""Free-only mode (OTARIOPTM_FREE_ONLY): paid Otari routing stays off even
when a key is present, Groq free tier serves chat steps, and a demo-tier
fallback is always explicitly labeled and never counts as real inference."""

import asyncio
import contextlib

import src.gateway.main as gw


@contextlib.contextmanager
def _isolated_budget():
    saved_spend = gw.budget.spend
    saved_reservations = dict(gw.budget.reservations)
    gw.budget.spend = 0.0
    gw.budget.reservations.clear()
    try:
        yield gw.budget
    finally:
        gw.budget.spend = saved_spend
        gw.budget.reservations.clear()
        gw.budget.reservations.update(saved_reservations)


def test_free_only_startup_disables_otari_even_with_key(monkeypatch):
    """With the flag on, an installed OTARI_API_KEY must not create a client."""
    monkeypatch.setattr(gw, "FREE_ONLY", True)
    monkeypatch.setenv("OTARI_API_KEY", "installed-but-must-stay-unused")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    saved_otari, saved_groq = gw.otari_client, gw.groq_client
    gw.otari_client = None
    try:
        asyncio.run(gw.startup())
        assert gw.otari_client is None
    finally:
        gw.otari_client, gw.groq_client = saved_otari, saved_groq


def test_default_startup_keeps_otari_first(monkeypatch):
    """Without the flag, behavior is unchanged: Otari client is created."""
    monkeypatch.setattr(gw, "FREE_ONLY", False)
    monkeypatch.setenv("OTARI_API_KEY", "present")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    saved_otari, saved_groq = gw.otari_client, gw.groq_client
    gw.otari_client = None
    try:
        asyncio.run(gw.startup())
        assert gw.otari_client is not None
    finally:
        gw.otari_client, gw.groq_client = saved_otari, saved_groq


def test_free_only_groq_is_real_inference(monkeypatch):
    """Groq serving a chat step: chain ['groq'], demo False, realInference True."""
    async def fake_groq(messages, max_tokens):
        return {
            "model": "allam-2-7b",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "real answer"}}],
            "usage": {"total_tokens": 20},
            "cost": 0.0,
        }

    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "groq_client", object())  # truthy: provider configured
    monkeypatch.setattr(gw, "_groq_chat", fake_groq)

    with _isolated_budget():
        res = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                gw.FALLBACK_CATALOG,
                100,
            )
        )
    assert res["chain"] == ["groq"]
    assert res["demo"] is False
    assert res["realInference"] is True
    assert res["output"] == "real answer"


def test_free_only_demo_fallback_is_labeled_and_not_real_inference(monkeypatch):
    """Groq failing drops to the demo tier: labeled, and not real inference."""
    async def boom(messages, max_tokens):
        raise RuntimeError("groq down")

    monkeypatch.setattr(gw, "otari_client", None)
    monkeypatch.setattr(gw, "groq_client", object())
    monkeypatch.setattr(gw, "_groq_chat", boom)

    with _isolated_budget():
        res = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                gw.FALLBACK_CATALOG,
                100,
            )
        )
    assert res["chain"] == ["groq->demo"]
    assert res["demo"] is True
    assert res["realInference"] is False
    assert res["output"].startswith("[DEMO")


def test_workflow_run_reports_demo_nodes_and_free_only_flag():
    """The workflow response names demo-tier nodes so they are never counted
    as real inference, and reports whether free-only mode is active."""
    from fastapi.testclient import TestClient

    client = TestClient(gw.app)
    resp = client.post(
        "/api/v1/workflow/run",
        json={
            "nodes": [{"id": "c1", "type": "chat", "data": {"prompt": "hello"}}],
            "edges": [],
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    # This test session runs keyless: every chat node is demo tier.
    assert "c1" in body["demoNodes"]
    assert body["freeOnly"] is False
    chat = next(s for s in body["steps"] if s.get("type") == "chat")
    assert chat["demo"] is True
    assert chat["realInference"] is False


def test_health_reports_free_only_flag():
    from fastapi.testclient import TestClient

    client = TestClient(gw.app)
    body = client.get("/api/v1/health").json()
    assert "free_only" in body
    assert body["free_only"] is False  # default: flag off


def test_groq_picker_skips_non_chat_models(monkeypatch):
    """TTS/audio/guard models must never be picked for a chat step: they 400
    and the run silently degrades to demo. Regression for the orpheus gap."""

    class _Resp:
        status_code = 200

        def json(self):
            return {"data": [
                {"id": "whisper-large-v3"},
                {"id": "canopylabs/orpheus-v1-english"},
                {"id": "meta-llama/llama-prompt-guard-2-86m"},
                {"id": "openai/gpt-oss-safeguard-20b"},
                {"id": "allam-2-7b"},
                {"id": "qwen/qwen3.8-27b"},
            ]}

    class _FakeGroq:
        async def get(self, path):
            return _Resp()

    monkeypatch.setattr(gw, "groq_client", _FakeGroq())
    monkeypatch.setattr(gw, "_groq_model_cache", None)
    picked = asyncio.run(gw._groq_pick_model())
    assert picked in ("allam-2-7b", "qwen/qwen3.8-27b")
    assert "orpheus" not in picked and "whisper" not in picked and "guard" not in picked


def test_otari_error_falls_back_to_groq(monkeypatch):
    """Otari-first order: any Otari failure (incl. wallet/402-class errors)
    lands on Groq next, and a real Groq answer counts as real inference."""

    class _BrokeOtari:
        async def chat_completions(self, model, messages, max_tokens):
            raise RuntimeError("wallet returned 402 insufficient balance")

    async def fake_groq(messages, max_tokens):
        return {
            "model": "allam-2-7b",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "real answer"}}],
            "usage": {"total_tokens": 20},
            "cost": 0.0,
        }

    monkeypatch.setattr(gw, "otari_client", _BrokeOtari())
    monkeypatch.setattr(gw, "groq_client", object())
    monkeypatch.setattr(gw, "_groq_chat", fake_groq)

    with _isolated_budget():
        res = asyncio.run(
            gw.execute_chat_step(
                {"id": "n1", "type": "chat"},
                [{"role": "user", "content": "hi"}],
                gw.FALLBACK_CATALOG,
                100,
            )
        )
    assert res["chain"] == ["otari->groq"]
    assert res["demo"] is False
    assert res["realInference"] is True
    assert "otari error" in (res.get("note") or "")
