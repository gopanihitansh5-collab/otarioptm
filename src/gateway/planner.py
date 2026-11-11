"""LLM-driven task decomposition: a complex task -> a validated workflow DAG.

REAL planning, never a preset: the graph is produced by the configured
model provider chain for THIS task text, then strictly validated against
the same rules the workflow runner enforces. If the provider is
unavailable, its output is unparseable, or the graph fails validation,
planning fails honestly - no template or canned graph is ever
substituted. The model's raw output is untrusted: only whitelisted node
types and fields survive validation, and cycles/unknown references are
rejected.
"""

import ast
import builtins
import json
import re
from typing import Any, Dict, List, Tuple

PLANNER_NODE_TYPES = {"chat", "web-search", "code-exec", "guardrails"}
PLANNER_MAX_NODES = 8
PLANNER_MAX_TASK_CHARS = 8000
_NODE_ID_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")

PLANNER_SYSTEM = """You decompose a complex task into a workflow DAG for the OtariOptm engine.
Reply with ONLY a JSON object - no prose, no code fences:
{"nodes": [...], "edges": [...], "rationale": "one sentence"}

Node types (the ONLY types), with their fields:
- {"id": "...", "type": "web-search", "query": "<real-time web search query>"}
- {"id": "...", "type": "chat", "prompt": "<instruction>", "system": "<optional role>"}
- {"id": "...", "type": "code-exec", "code": "<python program; print() the result>"}
  Code rules: plain stdlib Python, define every variable before use and keep
  names consistent - generated code is statically checked and run as-is.
  When computing or comparing, print() EXACTLY ONE JSON object with named
  fields (e.g. {"rows": [{"model": "...", "input_rate": 0.0, "output_rate":
  0.0, "volume": 0, "monthly_cost": 0.0}], "currency": "USD"}) - the final
  report table is built from that JSON, never from chat text.
Edges: {"source": "<node id>", "target": "<node id>"} - source output feeds target.
Inside any prompt/query/code, {{node-id}} inserts that node's output.

Rules:
- 3 to 8 nodes. Use one web-search per distinct sub-question needing current
  facts (they run independently), code-exec for computation or data shaping,
  and ALWAYS end with exactly one chat node that synthesizes every upstream
  result into the final deliverable.
- The final chat node's prompt must name the expected deliverable (report,
  comparison table, plan...) and reference its inputs with {{node-id}}.
- NEVER use a chat node to restate, reformat, or extract task data - chat
  models can invent values. Numbers and facts from the task go directly
  into code-exec / downstream prompts via {{node-id}} only when computed.
- Node ids: lowercase letters/digits/dashes, unique, meaningful.
- No cycles. Every node except the final one feeds at least one other node.
"""


def _extract_json(text: str) -> Dict[str, Any]:
    """Parse the planner's reply as one JSON object; raise ValueError."""
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw.strip())
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("planner returned no JSON object")
    try:
        obj = json.loads(raw[start:end + 1])
    except json.JSONDecodeError as exc:
        raise ValueError(f"planner output is not valid JSON ({exc.msg})") from exc
    if not isinstance(obj, dict):
        raise ValueError("planner output is not a JSON object")
    return obj


def _require_str(node: Dict[str, Any], field: str, node_id: str) -> str:
    val = node.get(field)
    if not isinstance(val, str) or not val.strip():
        raise ValueError(f"node '{node_id}' ({node.get('type')}) needs a non-empty '{field}'")
    return val


_ALLOWED_NODE_FIELDS = {
    "chat": {"id", "type", "prompt", "system"},
    "web-search": {"id", "type", "query"},
    "code-exec": {"id", "type", "code"},
    "guardrails": {"id", "type", "banned"},
}


def _code_warnings(node_id: str, code: str) -> List[str]:
    """Static, inspectable checks on generated code. NEVER edits the code:
    problems surface as plan warnings so a human can inspect and decide.

    Catches the failure mode observed live: the model defined `requests`
    then referenced `reqs`, and the node only failed at run time.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return [f"node '{node_id}': code has a syntax error at line {exc.lineno} ({exc.msg}) - it will fail at run time"]
    assigned = set(dir(builtins)) | {"__name__", "__file__"}
    loaded: List[str] = []
    for item in ast.walk(tree):
        if isinstance(item, ast.Name):
            if isinstance(item.ctx, ast.Load):
                loaded.append(item.id)
            else:
                assigned.add(item.id)
        elif isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            assigned.add(item.name)
        elif isinstance(item, (ast.Import, ast.ImportFrom)):
            for alias in item.names:
                assigned.add((alias.asname or alias.name).split(".")[0])
        elif isinstance(item, ast.arg):
            assigned.add(item.arg)
        elif isinstance(item, ast.ExceptHandler) and item.name:
            assigned.add(item.name)
        elif isinstance(item, (ast.Global, ast.Nonlocal)):
            assigned.update(item.names)
    undefined = sorted({n for n in loaded if n not in assigned})
    if undefined:
        return [f"node '{node_id}': code may use undefined name(s) {', '.join(undefined[:5])} - inspect before running (static check, code unchanged)"]
    return []


def validate_plan(obj: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """Validate + sanitize a parsed plan. Returns (nodes, edges, warnings).

    Nodes come out as {"id", "type", "data": {...}, "position": {...}};
    edges as {"id", "source", "target"}. Unknown model-supplied fields are
    DROPPED (untrusted output) and named in warnings. Raises ValueError
    with the reason on anything structural.
    """
    nodes_raw = obj.get("nodes")
    edges_raw = obj.get("edges") or []
    if not isinstance(nodes_raw, list) or not nodes_raw:
        raise ValueError("plan has no nodes")
    if len(nodes_raw) > PLANNER_MAX_NODES:
        raise ValueError(f"plan has {len(nodes_raw)} nodes (max {PLANNER_MAX_NODES})")
    if not isinstance(edges_raw, list):
        raise ValueError("plan 'edges' must be an array")

    warnings: List[str] = []
    seen: set = set()
    nodes: List[Dict[str, Any]] = []
    for i, raw in enumerate(nodes_raw):
        if not isinstance(raw, dict):
            raise ValueError(f"node at index {i} is not an object")
        node_id = str(raw.get("id") or "").strip()
        if not _NODE_ID_RE.fullmatch(node_id):
            raise ValueError(f"node at index {i} has an invalid id")
        if node_id in seen:
            raise ValueError(f"duplicate node id '{node_id}'")
        seen.add(node_id)
        ntype = str(raw.get("type") or "")
        if ntype not in PLANNER_NODE_TYPES:
            raise ValueError(f"node '{node_id}' has unknown type '{ntype}'")
        dropped = sorted(set(raw) - _ALLOWED_NODE_FIELDS[ntype])
        if dropped:
            warnings.append(f"node '{node_id}': dropped unknown field(s) {', '.join(dropped)}")
        if ntype == "chat":
            data = {"prompt": _require_str(raw, "prompt", node_id)}
            system = raw.get("system")
            if isinstance(system, str) and system.strip():
                data["system"] = system
        elif ntype == "web-search":
            data = {"query": _require_str(raw, "query", node_id)}
        elif ntype == "code-exec":
            data = {"code": _require_str(raw, "code", node_id)}
            warnings.extend(_code_warnings(node_id, data["code"]))
        else:  # guardrails
            data = {}
            banned = raw.get("banned")
            if isinstance(banned, list):
                if len(banned) > 20:
                    warnings.append(f"node '{node_id}': banned list truncated to 20 entries")
                data["banned"] = [str(b) for b in banned[:20]]
        nodes.append({"id": node_id, "type": ntype, "data": data, "position": {"x": 0, "y": 0}})

    edges: List[Dict[str, Any]] = []
    for raw in edges_raw:
        if not isinstance(raw, dict):
            raise ValueError("each edge must be an object")
        source = str(raw.get("source") or "")
        target = str(raw.get("target") or "")
        if source not in seen:
            raise ValueError(f"edge references unknown node '{source}'")
        if target not in seen:
            raise ValueError(f"edge references unknown node '{target}'")
        if source == target:
            raise ValueError(f"node '{source}' cannot feed itself")
        edges.append({"id": f"e-{source}-{target}", "source": source, "target": target})

    _check_acyclic(seen, edges)
    _layout(nodes, edges)
    return nodes, edges, warnings


def _check_acyclic(node_ids: set, edges: List[Dict[str, Any]]) -> None:
    parents: Dict[str, set] = {nid: set() for nid in node_ids}
    for e in edges:
        parents[e["target"]].add(e["source"])
    remaining = {nid: set(p) for nid, p in parents.items()}
    ready = [nid for nid in node_ids if not remaining[nid]]
    done = 0
    while ready:
        nid = ready.pop()
        done += 1
        for other, ps in remaining.items():
            if nid in ps:
                ps.discard(nid)
                if not ps:
                    ready.append(other)
    if done != len(node_ids):
        raise ValueError("plan graph has a cycle")


def _layout(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> None:
    """Simple layered layout: x by topo depth, y by index within the layer."""
    parents: Dict[str, List[str]] = {n["id"]: [] for n in nodes}
    for e in edges:
        parents[e["target"]].append(e["source"])
    depth: Dict[str, int] = {}

    def d(nid: str) -> int:
        if nid not in depth:
            depth[nid] = 0 if not parents[nid] else 1 + max(d(p) for p in parents[nid])
        return depth[nid]

    per_layer: Dict[int, int] = {}
    for n in nodes:
        layer = d(n["id"])
        idx = per_layer.get(layer, 0)
        per_layer[layer] = idx + 1
        n["position"] = {"x": layer * 320, "y": idx * 170}
