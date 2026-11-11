"""Deploy-risk hardening: inbound body cap and proxy-aware rate limiting.

Covers the two serverless deployment risks fixed alongside the runtime
labels: oversized JSON bodies are refused before they are read into
memory, and on Vercel the per-IP rate limiter keys on x-forwarded-for
(the platform proxy hides the real peer otherwise).
"""

from fastapi.testclient import TestClient

import src.gateway.main as gw

client = TestClient(gw.app)


def test_oversized_declared_body_is_413():
    resp = client.post(
        "/api/v1/chat/completions",
        content=b" ",
        headers={"Content-Length": str(gw.MAX_BODY_BYTES + 1), "Content-Type": "application/json"},
    )
    assert resp.status_code == 413
    assert "too large" in resp.json()["detail"]


def test_invalid_content_length_is_400():
    resp = client.post(
        "/api/v1/chat/completions",
        content=b"{}",
        headers={"Content-Length": "not-a-number", "Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_normal_sized_body_still_accepted():
    resp = client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 200


def test_rate_limit_keys_on_forwarded_for_on_vercel(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    gw._limiter._buckets.clear()
    # Burn the whole bucket for one forwarded IP.
    limited = None
    for _ in range(int(gw._limiter.capacity) + 2):
        limited = client.post(
            "/api/v1/chat/completions",
            json={"messages": [{"role": "user", "content": "hi"}]},
            headers={"X-Forwarded-For": "203.0.113.7"},
        )
    assert limited is not None and limited.status_code == 429
    assert limited.headers.get("Retry-After")
    # A different forwarded IP still has its own bucket.
    other = client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
        headers={"X-Forwarded-For": "203.0.113.8"},
    )
    assert other.status_code == 200
    gw._limiter._buckets.clear()


def test_forwarded_for_ignored_off_vercel(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    gw._limiter._buckets.clear()
    resp = client.post(
        "/api/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
        headers={"X-Forwarded-For": "198.51.100.9"},
    )
    assert resp.status_code == 200
    # Bucket keyed on the direct peer, not the spoofable header.
    assert "198.51.100.9" not in gw._limiter._buckets
    gw._limiter._buckets.clear()
