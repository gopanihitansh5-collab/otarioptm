"""Router scoring unit tests: ranking, health signal, budget-aware selection.

These tests lock in the three behaviours the product claims:

1. health is a REWARD with the correct scale (a 0..1 catalog health is used
   as-is, never divided by 5) and the correct sign (healthier ranks higher),
2. affordability compares an ESTIMATED COST PER CALL with the USD budget,
   never a per-token price against a USD budget,
3. the normalization never divides by zero and the per-step weights really
   differ per step type.
"""

import inspect

import pytest

from src.services.router import (
    DEFAULT_TOKEN_ESTIMATE,
    HEALTH_REWARD_SPAN,
    _estimated_call_cost,
    estimated_call_cost,
    rank_models,
    select_model,
    step_weights,
)


def _model(name, cost_per_token, latency, health):
    return {
        "id": name,
        "name": name,
        "cost_per_token": cost_per_token,
        "latency": latency,
        "health": health,
    }


def _fitness(model, step_type="chat"):
    ranked = rank_models([model], step_type)
    assert ranked, "a single candidate must still be ranked"
    return ranked[0][1]


# --- (a) sign test: a healthy cheap model beats an unhealthy cheap model -----

def test_healthy_cheap_model_beats_unhealthy_cheap_model():
    healthy = _model("healthy", 1e-6, 500, 1.0)
    unhealthy = _model("unhealthy", 1e-6, 500, 0.0)

    chosen, _score, _reason = select_model([unhealthy, healthy], step_type="chat")
    assert chosen is not None
    assert chosen["name"] == "healthy", "health must be a reward, not a penalty"

    names = [m["name"] for m, _, _ in rank_models([unhealthy, healthy])]
    assert names[0] == "healthy"


def test_health_is_not_divided_by_five():
    """A 0..1 catalog health is used as-is (the /5 bug made health invisible)."""
    assert _fitness(_model("m", 1e-6, 500, 1.0)) > _fitness(_model("m", 1e-6, 500, 0.2))
    # A 0..100 percentage and a 1..5 rating are scaled to 0..1.
    scored_100 = _fitness(_model("m", 1e-6, 500, 80))    # -> 0.8
    scored_5 = _fitness(_model("m", 1e-6, 500, 4.5))    # -> 0.9
    scored_1 = _fitness(_model("m", 1e-6, 500, 1.0))    # -> 1.0
    assert scored_1 > scored_5 > scored_100


# --- (b) scale test: score difference == health_w * 0.5 ------------------------

def test_health_score_difference_equals_half_the_health_weight():
    cost_w, lat_w, health_w = step_weights("chat")
    assert health_w == pytest.approx(0.20)

    healthy = _model("healthy", 1e-6, 500, 1.0)
    unhealthy = _model("unhealthy", 1e-6, 500, 0.0)

    delta = _fitness(healthy) - _fitness(unhealthy)
    assert delta == pytest.approx(health_w * 0.5)
    assert delta == pytest.approx(0.10)
    # The centred reward spans +/- health_w * HEALTH_REWARD_SPAN.
    assert HEALTH_REWARD_SPAN == pytest.approx(0.5)
    assert _fitness(healthy) - _fitness(_model("neutral", 1e-6, 500, 0.5)) == pytest.approx(
        health_w * HEALTH_REWARD_SPAN * 0.5
    )


# --- (c) budget awareness: estimated cost per call vs the USD budget ---------

def test_paid_model_is_skipped_when_its_call_cost_does_not_fit():
    paid = _model("paid", 3e-6, 500, 1.0)
    free = _model("free", 0.0, 500, 1.0)

    # The comparison is USD per CALL (3e-6 * 500 tokens = $0.0015), not the
    # per-token rate (3e-6) against a USD budget.
    est_paid = paid["cost_per_token"] * DEFAULT_TOKEN_ESTIMATE
    assert est_paid == pytest.approx(0.0015)

    chosen, _score, reason = select_model(
        [paid, free], budget_remaining=0.0001, step_type="chat"
    )
    assert chosen is not None
    assert chosen["name"] == "free"
    assert "zero-cost tier" in reason or "est_call" in reason

    # With enough budget the paid model is affordable again.
    chosen, _score, reason = select_model([paid], budget_remaining=0.05, step_type="chat")
    assert chosen is not None
    assert chosen["cost_per_token"] == paid["cost_per_token"]
    assert "est_call=$0.001500" in reason and "<= budget" in reason


def test_zero_budget_still_returns_a_zero_cost_model():
    paid = _model("paid", 3e-6, 500, 1.0)
    free = _model("free", 0.0, 500, 1.0)
    chosen, _score, _reason = select_model([paid, free], budget_remaining=0.0)
    assert chosen is not None
    assert chosen["cost_per_token"] == 0.0


def test_no_affordable_model_returns_none():
    paid = _model("paid", 3e-6, 500, 1.0)
    chosen, _score, reason = select_model([paid], budget_remaining=0.0001)
    assert chosen is None
    assert "No affordable models" in reason


# --- (d) min == max normalization must not divide by zero -------------------

def test_equal_cost_and_latency_do_not_raise():
    models = [
        _model("a", 1e-6, 500, 0.9),
        _model("b", 1e-6, 500, 0.5),
        _model("c", 1e-6, 500, 0.1),
    ]
    ranked = rank_models(models)
    assert len(ranked) == 3
    assert all(isinstance(score, float) for _, score, _ in ranked)
    # With identical cost and latency only health separates the candidates.
    assert ranked[0][0]["name"] == "a"


def test_single_candidate_normalization_does_not_raise():
    ranked = rank_models([_model("only", 1e-6, 500, 0.9)])
    assert len(ranked) == 1
    assert isinstance(ranked[0][1], float)


# --- (e) per-step weights differ per step type ------------------------------

def test_step_weights_differ_per_step_type():
    code = step_weights("code")
    search = step_weights("search")
    chat = step_weights("chat")

    assert code != search
    assert code != chat and search != chat
    assert code[2] != search[2], "the health weight is per step type too"
    assert sum(code) == pytest.approx(1.0)
    assert sum(search) == pytest.approx(1.0)


def test_ranking_changes_with_the_step_type():
    cheap_but_slow = _model("cheap-slow", 1e-7, 2000, 1.0)
    pricey_but_fast = _model("pricey-fast", 1e-6, 100, 1.0)

    code_first = rank_models([cheap_but_slow, pricey_but_fast], "code")[0][0]["name"]
    search_first = rank_models([cheap_but_slow, pricey_but_fast], "search")[0][0]["name"]
    assert code_first == "cheap-slow"
    assert search_first == "pricey-fast"


# --- (f) public cost-estimate helper (the router <-> gateway contract) --------

def test_public_cost_estimate_is_the_router_affordability_number():
    """`estimated_call_cost` is the exact number the router checks."""
    paid = _model("paid", 3e-6, 500, 1.0)

    # Default estimate: 3e-6 per token x DEFAULT_TOKEN_ESTIMATE tokens.
    assert estimated_call_cost(paid) == pytest.approx(3e-6 * DEFAULT_TOKEN_ESTIMATE)
    assert estimated_call_cost(paid) == pytest.approx(0.0015)

    # The model's own max_tokens hint wins over the default estimate.
    hinted = dict(paid, max_tokens=2000)
    assert estimated_call_cost(hinted) == pytest.approx(3e-6 * 2000)

    # An explicit token count overrides the hint when it is positive.
    assert estimated_call_cost(hinted, tokens=500) == pytest.approx(3e-6 * 500)

    # Zero-cost tiers are free and the estimate is never negative.
    assert estimated_call_cost(_model("free", 0.0, 500, 1.0)) == 0.0
    assert estimated_call_cost(_model("negative", -1e-6, 500, 1.0)) == 0.0

    # The router's own decision uses this number: $0.0015 fits $0.002 but not
    # $0.001, and the affordable verdict quotes the same estimate.
    chosen, _score, reason = select_model([paid], budget_remaining=0.002, step_type="chat")
    assert chosen is not None
    assert f"est_call=${estimated_call_cost(paid):.6f}" in reason
    assert select_model([paid], budget_remaining=0.001, step_type="chat")[0] is None


def test_private_cost_estimate_stays_an_alias_of_the_public_one():
    """The old private name still works and returns the same number."""
    paid = _model("paid", 3e-6, 500, 1.0)
    assert _estimated_call_cost(paid) == pytest.approx(estimated_call_cost(paid))
    assert _estimated_call_cost(dict(paid, max_tokens=2000)) == pytest.approx(
        estimated_call_cost(dict(paid, max_tokens=2000))
    )


# --- public API contract with the gateway ------------------------------------

def test_gateway_keyword_call_signature():
    params = inspect.signature(select_model).parameters
    assert "budget_remaining" in params
    assert "step_type" in params

    models = [_model("a", 1e-6, 500, 0.9), _model("b", 0.0, 500, 1.0)]
    chosen, score, reason = select_model(
        models, budget_remaining=1.0, step_type="chat"
    )
    assert chosen is not None
    assert isinstance(score, float)
    assert isinstance(reason, str)

    # The legacy positional form is still understood.
    legacy, _score, _reason = select_model(models, 1.0, "chat")
    assert legacy is not None


def test_empty_catalog():
    assert rank_models([]) == []
    model, score, reason = select_model([], budget_remaining=1.0)
    assert model is None
    assert score == 0.0
    assert "No available models" in reason
