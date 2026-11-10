"""Router scoring unit tests: ranking and budget-aware selection."""

from src.services.router import rank_models, select_model

MODELS = [
    {"model": "cheap", "cost_per_token": 1e-6, "avg_latency_ms": 500, "health": 0.9},
    {"model": "pricey", "cost_per_token": 1e-4, "avg_latency_ms": 500, "health": 0.9},
    {"model": "free", "cost_per_token": 0.0, "avg_latency_ms": 800, "health": 0.9},
]


def test_rank_empty():
    assert rank_models([]) == []


def test_rank_prefers_lower_cost():
    ranked = rank_models(MODELS)
    names = [m["model"] for m, _, _ in ranked]
    assert names[0] == "free"
    assert names[-1] == "pricey"
    # Scores are sorted ascending (lower is better).
    scores = [s for _, s, _ in ranked]
    assert scores == sorted(scores)


def test_select_with_budget_skips_unaffordable():
    # 5e-5 remaining: cheap (1e-6) fits, pricey (1e-4) does not.
    model, score, reason = select_model(MODELS, budget_remaining=5e-5)
    assert model is not None
    assert model["model"] in {"free", "cheap"}


def test_select_with_zero_budget_picks_free():
    model, _, _ = select_model(MODELS, budget_remaining=0.0)
    assert model is not None
    assert model["cost_per_token"] == 0.0


def test_select_empty_returns_none():
    model, score, reason = select_model([], budget_remaining=1.0)
    assert model is None
    assert "No available models" in reason
