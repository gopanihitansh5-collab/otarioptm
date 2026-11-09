from typing import Optional, Tuple, List, Dict, Any


def select_model(
    available_models: List[Dict[str, Any]],
    budget_remaining: float,
    step_type: str = "normal",
) -> Tuple[Optional[Dict[str, Any]], float, str]:
    """
    Select the best model based on cost/quality ratio + latency + health.
    
    Args:
        available_models: List of model dicts with keys: name, cost_per_token, latency, health
        budget_remaining: Remaining budget for this step
        step_type: "normal" or "code" or "search"
    
    Returns:
        (selected_model_dict, score, reason)
    """
    if not available_models:
        return (None, 0.0, "No available models")

    # Filter models within budget
    affordable = []
    for m in available_models:
        cost = m.get("cost_per_token", 0) or 0
        if cost == 0 or cost <= budget_remaining:
            affordable.append(m)

    if not affordable:
        return (0.0, "No affordable models within budget")

    # Score each model: lower cost/token is better, lower latency is better, higher health is better
    best_model = None
    best_score = float("inf")

    for m in affordable:
        cost = m.get("cost_per_token", 0) or 0
        latency = m.get("latency", 999) or 999
        health = m.get("health", 0) or 0

        # Composite score: cost_ratio * 0.5 + latency * 0.3 - health * 0.2
        # Normalize so cheaper/healthier = lower score (we want to minimize)
        cost_ratio = cost / max(1e-6, budget_remaining)
        score = cost_ratio + latency * 0.3 - health * 0.2

        if score < best_score:
            best_score = score
            best_model = m

    if best_model is None:
        return (None, 0.0, "No model selected")

    reason = f"Selected {best_model['name']}: cost/quality+latency/health optimization (score={best_score:.2f})"
    return (best_model, best_score, reason)