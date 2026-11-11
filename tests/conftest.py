"""Shared test fixtures: every test starts with empty rate-limit buckets."""

import pytest

import src.gateway.main as gw


@pytest.fixture(autouse=True)
def _fresh_rate_limiters():
    gw._limiter._buckets.clear()
    gw._global_limiter._buckets.clear()
    yield
    gw._limiter._buckets.clear()
    gw._global_limiter._buckets.clear()
