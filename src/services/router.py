"""Cost-optimized model selection for OtariOptm.

Scores every candidate on the same 0-1 scale before combining:
  score = 0.45 * cost_norm + 0.35 * latency_norm - 0.20 * health_norm
so cheaper + faster + healthier models win regardless of unit.
"""

from typing import Any, Dict, List, Optional, Tuple


def _f(x: Any, default: float) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


def _norm(value: float, low: float, high: float) -> float:
    """Map value into [0, 1]; missing data maps to a neutral 1.0 (worst)."""
    if low >= high or value is None:
        return 1.0
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
    """Health on any scale (1-5, 0-1, 0-100) -> normalized 0-1."""
    raw = m.get("health")
    if raw is None:
        return 1.0
    h = _f(raw, 1.0)
    for divisor in (5.0, 1.0, 100.0):
        if h <= divisor and divisor != 1.0:
            return min(1.0, h / divisor)
    return min(1.0, max(0.0, h))


def rank_models(
    available_models: List[Dict[str, Any]],
    step_type: str = "normal",
) -> List[Tuple[Dict[str, Any], float, str]]:
    """Return all candidates sorted best-first with (model, score, reason)."""
    if not available_models:
        return []

    costs = [_model_cost(m) for m in available_models]
    lats = [_model_latency(m) for m in available_models]
    cost_low, cost_high = min(costs), max(costs)
    lat_low, lat_high = min(lats), max(lats)

    # Code steps favor precision over raw cost; search steps favor speed.
    cost_w, lat_w = {"code": (0.30, 0.25), "search": (0.40, 0.45)}.get(
        step_type, (0.45, 0.35)
    )
    health_w = max(0.05, 1.0 - cost_w - lat_w)

    ranked: List[Tuple[Dict[str, Any], float, str]] = []
    for m in available_models:
        cost = _model_cost(m)
        lat = _model_latency(m)
        health = _model_health(m)

        cost_score = 0.0 if cost_high <= cost_low else _norm(cost, cost_low, cost_high)
        lat_score = 0.0 if lat_high <= lat_low else _norm(lat, lat_low, lat_high)
        score = cost_w * cost_score + lat_w * lat_score - health_w * (health - 0.5)

        name = _model_name(m)
        reason = (
            f"{name}: cost={cost:.3e}/token, latency={lat:.0f}ms, "
            f"health={health:.2f} -> score={score:+.3f}"
        )
        ranked.append((m, score, reason))

    ranked.sort(key=lambda t: t[1])
    return ranked


def select_model(
    available_models: List[Dict[str, Any]],
    budget_remaining: float,
    step_type: str = "normal",
) -> Tuple[Optional[Dict[str, Any]], float, str]:
    """Pick the cheapest-healthy model that still fits the remaining budget."""
    ranked = rank_models(available_models, step_type)
    if not ranked:
        return None, 0.0, "No available models"

    # Prefer affordable candidates; free/zero-cost models always pass.
    for model, score, reason in ranked:
        cost = _model_cost(model)
        if cost <= 0 or cost <= (budget_remaining if budget_remaining > 0 else cost):
            if cost > 0 and budget_remaining > 0 and cost > budget_remaining:
                continue
            return model, score, reason

    if budget_remaining <= 0:
        # Out of budget entirely -> lean on zero-cost fallbacks if any exist.
        for model, score, reason in ranked:
            if _model_cost(model) <= 0:
                return model, score, reason
        return None, 0.0, "No affordable models within budget"

    return None, 0.0, "No affordable models within budget"
