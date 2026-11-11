"""Planning-stage model calls: provider chain, budget accounting, provenance.

Provider policy (user-directed, 2026-11-11): planning and prompt development
run on the FREE GROQ TIER ONLY. There is no Otari fallback for planning -
the user approved the Otari balance for workflow testing, not for silently
rerouting planning onto a paid wallet; when Groq is absent or fails, the
stage fails honestly (503 for decompose, a warning for later stages). The
demo tier never plans. The model's raw output is untrusted input to the
stage validators - nothing here is applied without validation.

Groq's free tier reports no per-call cost, so a stage records "free".
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import HTTPException


async def run_planning_stage(
    stage: str, messages: List[Dict[str, Any]], max_tokens: int
) -> Dict[str, Any]:
    """Run one planning-stage call: Groq first, Otari fallback, never demo.

    Returns {output, provider, chain, cost, costSource, failures}. Raises 503
    when no real provider is configured or none answered; 402/503 on budget
    store states, matching the gateway's fail-closed rules.
    """
    import src.gateway.main as gw  # late import: main imports this package

    if gw.groq_client is None:
        raise HTTPException(
            status_code=503,
            detail=f"planning stage '{stage}' requires the free Groq tier "
            "(planning is Groq-only by user direction; the demo tier cannot plan)",
        )

    remaining = await gw.budget.get_remaining()
    reservation = gw.MIN_RESERVATION if remaining <= 0 else 0.0
    ok, rid = await gw.budget.reserve(reservation)
    if not ok:
        if getattr(gw.budget, "_ledger_error", None):
            raise HTTPException(
                status_code=503,
                detail="Budget store unavailable - planning blocked before any spend (fail-closed)",
            )
        raise HTTPException(status_code=402, detail="Budget cap reached - planning stage skipped")

    result: Dict[str, Any] = {}
    failures: List[str] = []
    reported = 0.0
    provider: str = ""
    settled = False
    try:
        try:
            result = await gw._groq_chat(messages, max_tokens)
            gw._raise_if_empty(result, "groq")
            provider = "groq"
        except Exception as exc:
            # A failed attempt that still billed keeps its reported cost.
            reported += gw._reported_cost(result)
            result = {}
            if isinstance(exc, gw.EmptyCompletion):
                failures.append(str(exc))
            else:
                failures.append(gw._safe_provider_error("groq", exc))
        if not provider:
            raise HTTPException(
                status_code=503,
                detail=f"planning stage '{stage}' failed: the free Groq tier did not answer",
            )
        reported += gw._reported_cost(result)
        if reported > 0:
            cost_source = "provider-reported"
        else:
            cost_source = "free"
        actual, _over = await gw._settle_reservation(rid, reported)
        settled = True
    finally:
        if not settled:
            await gw._settle_reservation(rid, reservation)

    chain = ["groq"]
    await gw._log_activity({
        "event": "planning.stage",
        "stage": stage,
        "model": result.get("model"),
        "chain": chain,
        "cost": actual,
        "costSource": cost_source,
        **({"failures": failures} if failures else {}),
    })
    return {
        "output": gw._completion_text(result),
        "provider": provider,
        "chain": chain,
        "cost": actual,
        "costSource": cost_source,
        "failures": failures,
    }
