"""Assignment stage: pick a concrete model and route for every chat node.

One model call for the whole graph (bounded spend, not one call per node).
The model sees the shared PlanningContext: task, validated plan, and the
live catalog. Its JSON is strictly validated against the plan's own node
ids and the live catalog ids before anything is applied; anything unknown
is dropped with a warning, never silently invented.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from .context import PlanningContext

ASSIGNMENT_SYSTEM = """You are the ASSIGNMENT agent in a workflow planner.

You receive a shared context JSON with:
- "task": the user's overall goal
- "plan": an already-validated workflow graph (nodes + edges)
- "catalog": the live model catalog ids
- "fast": catalog ids measured to answer quickly on the primary provider

Assign ONE chat model to each "chat" node so the workflow actually completes:
- Prefer "fast" ids for every node that must answer inside a short timeout.
- Use a stronger model only for the final synthesis node, and only if it is
  also in "fast"; a slow reasoner that times out is a failed demo, not a
  better one.
- Every chat node executes primary-provider-first with the free Groq tier
  as fallback; the model you pick must come from "catalog" so the primary
  provider can actually serve it.

Return ONLY JSON, no prose:
{"assignments": [{"id": "<chat node id>", "model": "<catalog id>",
"reason": "<=120 chars"}]}
Assign every chat node exactly once. Use only ids from "plan" and models
from "catalog"."""


def assignment_messages(ctx: PlanningContext) -> List[Dict[str, Any]]:
    payload = {
        "task": ctx.task,
        "plan": ctx.plan,
        "catalog": ctx.catalog_ids,
        "fast": ctx.fast_otari_ids,
    }
    return [
        {"role": "system", "content": ASSIGNMENT_SYSTEM},
        {"role": "user", "content": json.dumps(payload)},
    ]


def validate_assignment(
    obj: Any, ctx: PlanningContext
) -> Tuple[Dict[str, Dict[str, Any]], List[str]]:
    """Validate the model's JSON; unknown ids/models/fields are dropped."""
    if not isinstance(obj, dict) or not isinstance(obj.get("assignments"), list):
        raise ValueError("missing 'assignments' array")
    chat_ids = set(ctx.chat_node_ids())
    catalog = set(ctx.catalog_ids)
    warnings: List[str] = []
    known_keys = {"id", "model", "route", "reason"}
    out: Dict[str, Dict[str, Any]] = {}
    for entry in obj["assignments"]:
        if not isinstance(entry, dict):
            warnings.append("dropped a non-object assignment entry")
            continue
        dropped = sorted(set(entry) - known_keys)
        if dropped:
            warnings.append(f"dropped unknown assignment fields: {', '.join(dropped)}")
        nid = str(entry.get("id") or "")
        if nid not in chat_ids:
            warnings.append(f"dropped assignment for unknown chat node '{nid}'")
            continue
        if nid in out:
            warnings.append(f"dropped duplicate assignment for '{nid}'")
            continue
        model = str(entry.get("model") or "")
        if model not in catalog:
            warnings.append(f"dropped unknown model '{model}' for '{nid}'")
            model = ""
        out[nid] = {
            "model": model or None,
            "reason": str(entry.get("reason") or "")[:120] or None,
        }
    missing = chat_ids - set(out)
    if missing:
        warnings.append(f"no assignment for chat nodes: {', '.join(sorted(missing))}")
    return out, warnings
