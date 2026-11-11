"""Cost-optimized model selection for OtariOptm.

Every candidate is scored on the same 0..1 scale before the weights are
applied, so the terms are comparable regardless of unit:

    fitness = cost_w   * (1 - cost_norm)
            + lat_w    * (1 - latency_norm)
            + health_w * HEALTH_REWARD_SPAN * (health - 0.5)

HIGHER fitness is better: cheap + fast + *healthy* models win.

Health is a REWARD with the CORRECT SIGN: the term is added with a positive
coefficient and the neutral point is 0.5, so a healthier model scores HIGHER
and is ranked ahead of an equally cheap/fast but unhealthy one. The centred
reward is scaled by ``HEALTH_REWARD_SPAN`` (0.5) so the healthy-vs-unhealthy
score difference is exactly ``health_w * 0.5`` (0.10 for a chat step).

Per-step weights (cost, latency); health takes the remainder:

    normal/chat   cost 0.45  latency 0.35  health 0.20
    code          cost 0.30  latency 0.25  health 0.45
    search        cost 0.40  latency 0.45  health 0.15

Health normalization: a catalog health in 0..1 is used AS-IS (it is NOT
divided by 5), a 1..5 rating is divided by 5, a 0..100 percentage is divided
by 100; the result is clamped to 0..1. A missing health value is treated as
neutral (0.5).

Budget awareness: `select_model` compares the ESTIMATED COST OF ONE CALL
(per-token cost x a token estimate - 500 by default, or the model's own
`max_tokens` hint when it has one) against the remaining budget in USD. A
model whose estimate does not fit is skipped; zero-cost models (demo / Groq
tiers) always fit and are used when no paid model is affordable. A per-token
price is never compared directly against a USD budget.
"""

from typing import Any, Dict, List, Optional, Tuple

# Tokens assumed for one model call when the catalog does not carry a
# `max_tokens` hint. Used to turn a per-token price into a per-call estimate.
DEFAULT_TOKEN_ESTIMATE = 500

# Scale of the centred health reward. The reward spans
# +/- health_w * HEALTH_REWARD_SPAN, so the score difference between a
# perfectly healthy model (health = 1.0) and a fully unhealthy one
# (health = 0.0) is health_w * 0.5.
HEALTH_REWARD_SPAN = 0.5

# Per-step weights: (cost, latency); health takes the remainder.
STEP_WEIGHTS: Dict[str, Tuple[float, float]] = {
    "code": (0.30, 0.25),
    "search": (0.40, 0.45),
}
DEFAULT_STEP_WEIGHTS = (0.45, 0.35)


def _f(x: Any, default: float) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


def _norm(value: float, low: float, high: float) -> float:
    """Map value into [0, 1] (0 = best/cheapest, 1 = worst/most expensive).

    A degenerate range (low >= high, e.g. every candidate has the same cost)
    carries no information, so it maps to the neutral 0.5 instead of dividing
    by zero.
    """
    if value is None:
        return 1.0
    if high <= low:
        return 0.5
    return min(1.0, max(0.0, (value - low) / (high - low)))


def _model_name(m: Dict[str, Any]) -> str:
    return m.get("name") or m.get("id") or m.get("model") or "unknown"


def _model_cost(m: Dict[str, Any]) -> float:
    """Per-token cost; tolerant of Otari/OpenAI-style nested pricing."""
    pricing = m.get("pricing") or {}
    if isinstance(pricing, dict):
        for key in ("prompt_per_1k", "input", "prompt", "per_token", "cost_per_token"):
            if pricing.get(key) is not None:
                return _f(pricing.get(key), 0.0)
    return _f(m.get("cost_per_token"), 0.0)


def _model_latency(m: Dict[str, Any]) -> float:
    return _f(m.get("latency") or m.get("latency_ms"), 999.0)


def _model_health(m: Dict[str, Any]) -> float:
    """Catalog health on any scale -> normalized 0..1.

    * 0..1 (the gateway's own scale) is used AS-IS - it is NOT divided by 5;
    * a 1..5 rating is divided by 5;
    * a 0..100 percentage is divided by 100;
    * the result is clamped to 0..1, missing/unknown health is neutral (0.5).
    """
    raw = m.get("health")
    if raw is None:
        return 0.5
    h = _f(raw, 0.5)
    if h < 0.0:
        return 0.0
    if h <= 1.0:
        return h
    if h <= 5.0:
        return h / 5.0
    return min(1.0, h / 100.0)


def _model_token_estimate(m: Dict[str, Any]) -> float:
    """Tokens assumed for one call to this model."""
    hint = _f(m.get("max_tokens"), 0.0)
    if hint > 0:
        return hint
    return float(DEFAULT_TOKEN_ESTIMATE)


def _max_model_cost(m: Dict[str, Any]) -> float:
    """Largest per-token price across every known pricing key.

    Prompt and completion prices can differ; a strict bound must use the
    larger of the two, so this reads completion-side keys in addition to
    the prompt-side ones ``_model_cost`` checks.
    """
    pricing = m.get("pricing") or {}
    vals: List[float] = []
    if isinstance(pricing, dict):
        for key in (
            "prompt_per_1k", "input", "prompt", "per_token", "cost_per_token",
            "completion_per_1k", "output", "completion",
        ):
            if pricing.get(key) is not None:
                vals.append(_f(pricing.get(key), 0.0))
    vals.append(_f(m.get("cost_per_token"), 0.0))
    return max(vals, default=0.0)


# Conservative per-message allowance for provider chat-template overhead
# (role wrappers, special tokens). Those tokens are added provider-side and
# are NOT in the serialized payload, so the byte bound alone does not cover
# them. 32 tokens/message covers common templates (typical: 3-20); larger
# provider injections are an explicitly documented residual, below.
TEMPLATE_TOKENS_PER_MESSAGE = 32


def strict_call_bound(m: Dict[str, Any], *, payload_bytes: int, max_tokens: int,
                      message_count: int = 0) -> float:
    """Conditional conservative upper bound on the USD cost of ONE call to ``m``.

    Basis: BPE tokenizers encode every token as at least one byte, so
    payload-derived prompt tokens never exceed the serialized request's
    byte length; output tokens are capped provider-side by ``max_tokens``;
    and ``message_count`` x TEMPLATE_TOKENS_PER_MESSAGE conservatively
    covers chat-template overhead. Therefore, UNDER THE CONDITIONS BELOW,

        cost <= max-per-token-price
                x (payload_bytes + template_allowance + max_tokens)

    conservatively upper-bounds the call. This is NOT an unconditional
    guarantee. Conditions / documented residuals:
      * the provider bills only prompt+completion tokens - no uncapped
        hidden reasoning tokens;
      * provider-injected system/tool prompts beyond the template
        allowance are NOT covered (they never appear in this payload);
      * the config's prices must not lag the provider's.
    When these hold, a crash after the call loses no spend: the
    reservation is the bound. When they do not, the loss is limited to
    (actual - bound) for that call. Scope note: the $5/month account
    ceiling backstops OTARI spend only; it does not cover other
    providers' billing (e.g. Exa bills its own credit balance).
    """
    price = _max_model_cost(m)
    if price <= 0:
        return 0.0
    tokens = (max(0, int(payload_bytes))
              + TEMPLATE_TOKENS_PER_MESSAGE * max(0, int(message_count))
              + max(0, int(max_tokens)))
    return max(0.0, price * tokens)


def estimated_call_cost(m: Dict[str, Any], *, tokens: Optional[int] = None) -> float:
    """Estimated USD cost of ONE call: per-token cost x token estimate.

    This is the router's own affordability estimate, exposed publicly so the
    gateway can reserve exactly the number the router checked (a model the
    router called affordable is never rejected by ``reserve()`` with a 402).

    The token estimate is the model's own ``max_tokens`` hint when it has
    one, else ``DEFAULT_TOKEN_ESTIMATE``. An explicit ``tokens`` argument
    overrides that estimate when it is positive. Zero-cost tiers cost nothing
    and the result is never negative.
    """
    cost = _model_cost(m)
    if cost <= 0:
        return 0.0
    token_estimate = _model_token_estimate(m)
    if tokens is not None:
        override = _f(tokens, 0.0)
        if override > 0:
            token_estimate = override
    return max(0.0, cost * token_estimate)


def _estimated_call_cost(m: Dict[str, Any]) -> float:
    """Back-compat alias for the public :func:`estimated_call_cost`."""
    return estimated_call_cost(m)


def step_weights(step_type: str) -> Tuple[float, float, float]:
    """Return (cost_w, latency_w, health_w) for a step type.

    The weights sum to 1.0; health takes whatever is left after cost and
    latency, so the health signal is always part of the decision.
    """
    cost_w, lat_w = STEP_WEIGHTS.get(step_type, DEFAULT_STEP_WEIGHTS)
    health_w = max(0.05, 1.0 - cost_w - lat_w)
    return cost_w, lat_w, health_w


def rank_models(
    available_models: List[Dict[str, Any]],
    step_type: str = "normal",
) -> List[Tuple[Dict[str, Any], float, str]]:
    """Return all candidates sorted best-first with (model, fitness, reason).

    The fitness is a REWARD: higher is better, so the list is ordered by
    DESCENDING fitness.
    """
    if not available_models:
        return []

    costs = [_model_cost(m) for m in available_models]
    lats = [_model_latency(m) for m in available_models]
    cost_low, cost_high = min(costs), max(costs)
    lat_low, lat_high = min(lats), max(lats)

    # Code steps favor precision over raw cost; search steps favor speed.
    cost_w, lat_w, health_w = step_weights(step_type)

    ranked: List[Tuple[Dict[str, Any], float, str]] = []
    for m in available_models:
        cost = _model_cost(m)
        lat = _model_latency(m)
        health = _model_health(m)

        cost_score = _norm(cost, cost_low, cost_high)
        lat_score = _norm(lat, lat_low, lat_high)
        # Health is a REWARD: a healthier model must score HIGHER (better).
        fitness = (
            cost_w * (1.0 - cost_score)
            + lat_w * (1.0 - lat_score)
            + health_w * HEALTH_REWARD_SPAN * (health - 0.5)
        )

        name = _model_name(m)
        reason = (
            f"{name}: cost={cost:.3e}/token (est ${estimated_call_cost(m):.6f}/call), "
            f"latency={lat:.0f}ms, health={health:.2f} -> fitness={fitness:+.3f}"
        )
        ranked.append((m, fitness, reason))

    ranked.sort(key=lambda t: t[1], reverse=True)
    return ranked


def select_model(
    available_models: List[Dict[str, Any]],
    step_type: str = "chat",
    *legacy: Any,
    budget_remaining: Optional[float] = None,
) -> Tuple[Optional[Dict[str, Any]], float, str]:
    """Pick the cheapest-healthy model whose estimated call cost fits the budget.

    `budget_remaining` is the USD still available and is OPTIONAL: when it is
    None the best-ranked model wins, unconstrained by budget. When it is given,
    a candidate is affordable only if its estimated cost per call
    (per-token cost x token estimate) fits in it; zero-cost models always fit
    and are preferred over paid models that would not.

    Back-compat: the pre-fix contract was
    `select_model(models, budget_remaining, step_type)`; that positional call
    is still understood.
    """
    if legacy:
        # Legacy positional call: (models, budget_remaining, step_type).
        if budget_remaining is None:
            budget_remaining = step_type
        step_type = str(legacy[0])
    elif isinstance(step_type, (int, float)) and not isinstance(step_type, bool):
        # Legacy positional call: (models, budget_remaining).
        if budget_remaining is None:
            budget_remaining = step_type
        step_type = "chat"

    ranked = rank_models(available_models, step_type)
    if not ranked:
        return None, 0.0, "No available models"

    if budget_remaining is None:
        model, score, reason = ranked[0]
        return model, score, reason

    budget = max(0.0, _f(budget_remaining, 0.0))

    # Best-ranked candidate whose estimated per-call cost fits the budget.
    # A zero-cost model always fits (its estimate is $0), so it is used
    # whenever no paid model is affordable.
    for model, score, reason in ranked:
        est = estimated_call_cost(model)
        if est <= budget:
            note = f"{reason} | est_call=${est:.6f} <= budget=${budget:.6f}"
            if est <= 0.0:
                note += " (zero-cost tier)"
            return model, score, note

    return None, 0.0, "No affordable models within budget"
