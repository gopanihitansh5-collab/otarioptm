"""Node-development stage: strengthen each chat node's prompt.

One model call for all chat nodes (bounded spend). The model receives the
shared PlanningContext - the original task, the validated plan, and the
assignments - so enhanced prompts stay consistent with the whole flow and
reference real upstream nodes with {{node-id}} placeholders. Validated
strictly against the plan's chat node ids; rejected entries keep the
node's original prompt with an explicit warning.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from .context import PlanningContext

ENHANCEMENT_SYSTEM = """You are the NODE-DEVELOPMENT agent in a workflow planner.

You receive a shared context JSON with:
- "task": the user's overall goal
- "plan": an already-validated workflow graph (nodes + edges)
- "assignments": the model/route chosen per chat node

Rewrite the "system" and "prompt" of every "chat" node so it does its exact
part of the task well:
- Keep the node's role from the plan; do not add, remove or retype nodes.
- Reference upstream results with {{node-id}} placeholders - only node ids
  that actually have an edge into this node.
- Make prompts specific to "task": what to extract, compute or write, in
  what shape, with explicit assumptions to state when data is missing.
- The final synthesis node must produce a self-contained, useful
  deliverable (not meta-commentary about the workflow).

Return ONLY JSON, no prose:
{"enhanced": [{"id": "<chat node id>", "system": "<=2000 chars>",
"prompt": "<=4000 chars"}]}
Include every chat node exactly once."""

MAX_SYSTEM_CHARS = 2000
MAX_ENHANCED_PROMPT_CHARS = 4000


def enhancement_messages(ctx: PlanningContext) -> List[Dict[str, Any]]:
    payload = {
        "task": ctx.task,
        "plan": ctx.plan,
        "assignments": ctx.assignments,
    }
    return [
        {"role": "system", "content": ENHANCEMENT_SYSTEM},
        {"role": "user", "content": json.dumps(payload)},
    ]


def validate_enhancement(
    obj: Any, ctx: PlanningContext
) -> Tuple[Dict[str, Dict[str, str]], List[str]]:
    """Validate the model's JSON; bad entries are dropped, originals stay."""
    if not isinstance(obj, dict) or not isinstance(obj.get("enhanced"), list):
        raise ValueError("missing 'enhanced' array")
    chat_ids = set(ctx.chat_node_ids())
    warnings: List[str] = []
    known_keys = {"id", "system", "prompt"}
    out: Dict[str, Dict[str, str]] = {}
    for entry in obj["enhanced"]:
        if not isinstance(entry, dict):
            warnings.append("dropped a non-object enhancement entry")
            continue
        dropped = sorted(set(entry) - known_keys)
        if dropped:
            warnings.append(f"dropped unknown enhancement fields: {', '.join(dropped)}")
        nid = str(entry.get("id") or "")
        if nid not in chat_ids:
            warnings.append(f"dropped enhancement for unknown chat node '{nid}'")
            continue
        if nid in out:
            warnings.append(f"dropped duplicate enhancement for '{nid}'")
            continue
        prompt = str(entry.get("prompt") or "").strip()
        if not prompt:
            warnings.append(f"empty enhanced prompt for '{nid}', keeping original")
            continue
        if len(prompt) > MAX_ENHANCED_PROMPT_CHARS:
            warnings.append(f"enhanced prompt for '{nid}' too long, keeping original")
            continue
        system = str(entry.get("system") or "")
        if len(system) > MAX_SYSTEM_CHARS:
            warnings.append(f"enhanced system prompt for '{nid}' too long, truncated")
            system = system[:MAX_SYSTEM_CHARS]
        out[nid] = {"system": system, "prompt": prompt}
    return out, warnings
