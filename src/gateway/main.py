"""OtariOptm Gateway - FastAPI backend.

Compiles a React Flow graph into sequential steps, auto-routes each chat step
to the cheapest-healthy model via /api/v1/models ranking, enforces the project
budget cap atomically, and streams live activity to the dashboard over
WebSocket.

Execution chain per chat step:
  1. Otari hosted gateway (OTARI_API_KEY)      -> real usage/cost
  2. Groq free tier (GROQ_API_KEY)             -> free fallback
  3. Demo mode (no keys configured)            -> deterministic local response
"""

import asyncio
import csv
import io
import json
import os
import re
import time
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from src.services.budget import BudgetManager
from src.services.otari_client import OTARIClient
from src.services.router import _model_cost, select_model

app = FastAPI(title="OtariOptm Gateway", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

budget = BudgetManager()
otari_client: Optional[OTARIClient] = None
groq_client: Optional[httpx.AsyncClient] = None

DEMO_COMPLETION_COST = 0.0

ACTIVITY_LOG: List[Dict[str, Any]] = []


class ActivityHub:
    """Fan-out in-process event bus for the WebSocket activity stream."""

    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def emit(self, event: Dict[str, Any]) -> None:
        payload = json.dumps(event, default=str)
        dead: List[WebSocket] = []
        for ws in list(self._clients):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


hub = ActivityHub()


@app.on_event("startup")
async def startup() -> None:
    global otari_client, groq_client
    api_key = os.environ.get("OTARI_API_KEY")
    if api_key:
        otari_client = OTARIClient(api_key)
        print("OtariOptm: OTARI gateway enabled")
    else:
        print("OtariOptm: OTARI_API_KEY not set (fallback/demo mode)")
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        groq_client = httpx.AsyncClient(
            base_url="https://api.groq.com/openai/v1",
            headers={"Authorization": f"Bearer {groq_key}"},
            timeout=60.0,
        )
        print("OtariOptm: Groq fallback enabled")


@app.on_event("shutdown")
async def shutdown() -> None:
    if otari_client:
        await otari_client.close()
    if groq_client:
        await groq_client.aclose()


async def _log_activity(event: Dict[str, Any]) -> None:
    event = {**event, "ts": time.time()}
    ACTIVITY_LOG.append(event)
    if len(ACTIVITY_LOG) > 2000:
        del ACTIVITY_LOG[: len(ACTIVITY_LOG) - 2000]
    await hub.emit(event)
    await hub.emit(await budget.snapshot())


def _estimate_cost(model_map: Optional[Dict[str, Any]], messages: List[Dict[str, Any]], max_tokens: int) -> float:
    """Rough pre-flight cost estimate in USD (chars/4 ~ tokens)."""
    if not model_map or _model_cost(model_map) <= 0:
        return 0.0
    chars = sum(len(m.get("content") or "") for m in messages)
    prompt_tokens = chars / 4
    per_tok = _model_cost(model_map)
    return prompt_tokens * per_tok + 0.05  # + completion pad


async def _otari_chat(model: str, messages: List[Dict[str, Any]], max_tokens: int) -> Dict[str, Any]:
    assert otari_client is not None
    return await otari_client.chat_completions(model=model, messages=messages, max_tokens=max_tokens)


async def _groq_pick_model() -> str:
    """Discover a live Groq model id (catalog drifts; never hardcode)."""
    global _groq_model_cache
    if _groq_model_cache:
        return _groq_model_cache
    ids: List[str] = []
    try:
        resp = await groq_client.get("/models")  # type: ignore[union-attr]
        if resp.status_code == 200:
            ids = [m.get("id") for m in (resp.json().get("data") or []) if m.get("id")]
    except Exception:
        ids = []
    priority = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    chosen = next((i for i in priority if i in ids), None)
    if chosen is None:
        llamas = sorted(i for i in ids if "llama" in str(i))
        chosen = llamas[0] if llamas else (str(ids[0]) if ids else "llama-3.3-70b-versatile")
    _groq_model_cache = str(chosen)
    return str(chosen)


_groq_model_cache: Optional[str] = None


async def _groq_chat(messages: List[Dict[str, Any]], max_tokens: int) -> Dict[str, Any]:
    assert groq_client is not None
    model = await _groq_pick_model()
    async def _call(capped: int) -> httpx.Response:
        return await groq_client.post(
            "/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "max_tokens": capped,
            },
        )
    resp = await _call(max_tokens)
    if resp.status_code == 400 and "less than or equal to" in resp.text:
        import re as _re
        cap_match = _re.search(r"less than or equal to [`']?(\d+)", resp.text)
        if cap_match:
            resp = await _call(max(int(cap_match.group(1)), 64))  # honor the model's completion cap
    if resp.status_code != 200:
        raise RuntimeError(f"Groq error {resp.status_code}: {resp.text[:200] if resp.text else 'no body'}")
    return resp.json()


async def _demo_chat(messages: List[Dict[str, Any]], node_id: str) -> Dict[str, Any]:
    """Deterministic local completion so demos run without any API key."""
    user = next((m for m in reversed(messages) if m.get("role") == "user"), {})
    content = str(user.get("content", ""))
    ws_count = sum(1 for e in ACTIVITY_LOG if e.get("event") == "workflow.started")
    hint = (
        "Live provider unavailable in this environment; the gateway fell back."
        " Set OTARI_API_KEY (onboarded) or GROQ_API_KEY to enable live models."
    )
    demo = (
        f"[demo mode | node {node_id}] {len(content)} chars received, "
        f"workflow #{ws_count}. {hint} Echoing intent: {content[:220]}"
    )
    return {
        "id": f"demo-{node_id}-{int(time.time() * 1000)}",
        "model": "demo",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": demo}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": len(content) // 4, "completion_tokens": len(demo) // 4, "total_tokens": len(content) // 4 + len(demo) // 4},
        "cost": DEMO_COMPLETION_COST,
        "demo": True,
    }


async def execute_chat_step(
    node: Dict[str, Any],
    ctx_messages: List[Dict[str, Any]],
    models: List[Dict[str, Any]],
    max_tokens: int,
) -> Dict[str, Any]:
    """Run one chat node: budget-reserve -> route -> call best chain -> record spend."""
    node_id = str(node.get("id", "?"))
    # When a real provider is configured, keep the demo tier OUT of routing so
    # it can't win the free-model race; it re-enters only as last resort.
    has_provider = otari_client is not None or groq_client is not None
    candidates = [
        m for m in models
        if m and not (has_provider and str(m.get("id") or m.get("name")) == "demo")
    ] or [m for m in models if m]

    chosen, score, reason = select_model(candidates, await budget.get_remaining(), "chat")

    est = _estimate_cost(chosen, ctx_messages, max_tokens)
    est = max(0.01, est) if est > 0 else 0.01  # keep a floor reservation for paid calls
    ok, rid = await budget.reserve(est)
    if not ok:
        raise HTTPException(status_code=402, detail="Budget cap reached - step skipped")

    t0 = time.time()
    chain: List[str] = []
    primary: Optional[str] = None
    fallback_note: Optional[str] = None
    try:
        chosen_id = str(chosen.get("id") or chosen.get("name")) if chosen else ""
        if otari_client is not None and chosen_id and chosen_id != "demo":
            primary = "otari"
            result = await _otari_chat(chosen_id, ctx_messages, max_tokens)
            chain = ["otari"]
        elif groq_client is not None:
            primary = "groq"
            result = await _groq_chat(ctx_messages, max_tokens)
            chain = ["groq"]
        else:
            primary = "demo"
            result = await _demo_chat(ctx_messages, node_id)
            chain = ["demo"]
    except Exception as exc:  # provider failure (incl. wallet-level HTTP errors) -> next tier
        fallback_note = f"{primary} error: {str(exc)[:140]}"
        if primary == "otari":
            if groq_client is not None:
                try:
                    result = await _groq_chat(ctx_messages, max_tokens)
                    chain = ["otari->groq"]
                except Exception as _gexc:
                    fallback_note = f"{fallback_note}; groq error: {str(_gexc)[:140]}"
                    result = await _demo_chat(ctx_messages, node_id)
                    chain = ["otari->groq->demo"]
            else:
                result = await _demo_chat(ctx_messages, node_id)
                chain = ["otari->demo"]
        elif primary == "groq":
            result = await _demo_chat(ctx_messages, node_id)
            chain = ["groq->demo"]
        else:
            result = await _demo_chat(ctx_messages, node_id)
            chain = ["demo (fallback after error)"]
            fallback_note = f"primary error: {str(exc)[:140]}"
        await budget.release(rid)  # fresh actual replaced with record below
    latency_ms = (time.time() - t0) * 1000

    usage = result.get("usage") or {}
    reported = float(result.get("cost") or result.get("actual_cost") or 0.0)
    # When the provider doesn't report spend, charge the reservation estimate
    # so the cap can't be bypassed; demo/Groq tiers are explicitly free.
    actual_cost = reported if reported > 0 else (est if chain[:1] == ["otari"] else 0.0)
    await budget.record(rid, actual_cost)

    text = ""
    try:
        text = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        text = json.dumps(result)[:500]

    await _log_activity({
        "event": "node.completed",
        "nodeId": node_id,
        "model": result.get("model"),
        "chain": chain,
        "tokens": usage.get("total_tokens"),
        "cost": actual_cost,
        "latencyMs": round(latency_ms),
        "routing": reason,
        **({"fallbackNote": fallback_note} if fallback_note else {}),
    })

    return {
        "nodeId": node_id,
        "output": text,
        "model": result.get("model"),
        "chain": chain,
        "tokens": usage.get("total_tokens", 0),
        "cost": actual_cost,
        "latencyMs": round(latency_ms),
        "routing": reason,
        "demo": result.get("demo", False),
        "note": fallback_note,
    }


# Simple template substitution: {{nodeId}} or {{nodeId.field}}
_TEMPLATE_RE = re.compile(r"\{\{\s*([A-Za-z0-9_-]+)(?:\.(\w+))?\s*\}\}")


def _substitute(text: str, outputs: Dict[str, Dict[str, Any]]) -> str:
    def repl(m: re.Match) -> str:
        nid, field = m.group(1), m.group(2)
        node_out = outputs.get(nid)
        if not node_out:
            return m.group(0)
        if field:
            return str(node_out.get(field, m.group(0)))
        return str(node_out.get("output", m.group(0)))

    return _TEMPLATE_RE.sub(repl, text)


def _topo_order(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    order = []
    seen = set()

    def visit(nid: str) -> None:
        if nid in seen:
            return
        seen.add(nid)
        for e in edges:
            if str(e.get("target")) == nid:
                visit(str(e.get("source")))
        node = next((n for n in nodes if str(n["id"]) == nid), None)
        if node:
            order.append(node)

    for n in nodes:
        visit(str(n["id"]))
    return order


async def _web_search(query: str, objective: Optional[str] = None) -> Dict[str, Any]:
    """Exa-backed search (per agent-skills recommended request), DuckDuckGo fallback."""
    if os.environ.get("EXA_API_KEY"):
        try:
            from src.services.search import exa_search

            out = await exa_search(query, objective)
            out["objective"] = objective or "default downstream-context objective"
            return out
        except Exception:
            pass  # fall through to the free scrape
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
            resp = await client.post("https://html.duckduckgo.com/html/", data={"q": query})
            resp.raise_for_status()
            snippets = re.findall(
                r'class="result-snippet"[^>]*>(.*?)</a>', resp.text, flags=re.S
            ) or re.findall(r"<a[^>]*result[^>]*>(.*?)</a>", resp.text, flags=re.S)[:5]
            results = [re.sub(r"<[^>]+>", "", s).strip() for s in snippets[:5]]
            results = [r for r in results if r]
            if not results:
                return {"results_text": f"No results parsed for '{query}' (search provider may have changed layout).", "cost": 0.0, "provider": "duckduckgo", "objective": objective}
            return {"results_text": "\n".join(f"{i+1}. {r}" for i, r in enumerate(results)), "cost": 0.0, "provider": "duckduckgo", "objective": objective}
    except Exception as exc:
        return {"results_text": f"Search unavailable ({exc.__class__.__name__}). Continuing with prompt alone.", "cost": 0.0, "provider": "none", "objective": objective}


GUARD_PATTERNS: List[Dict[str, str]] = [
    {"name": "email", "pattern": r"[\w.+-]+@[\w-]+\.[\w.-]+"},
    {"name": "api_key", "pattern": r"(?:sk|pk|otk)_[A-Za-z0-9_-]{8,}"},
    {"name": "credit_card", "pattern": r"\b(?:\d[ -]?){13,19}\b"},
]

BANNED_DEFAULTS = ["weapon synthesis", "bomb making", "malware"]


def _apply_guardrails(text: str, banned_extra: List[str]) -> Dict[str, Any]:
    hits = []
    for spec in GUARD_PATTERNS:
        for m in re.finditer(spec["pattern"], text):
            hits.append({"rule": spec["name"], "sample": m.group(0)[:4] + "***"})
    lowered = text.lower()
    for term in (BANNED_DEFAULTS + banned_extra):
        if term and term.lower() in lowered:
            hits.append({"rule": "banned_term", "sample": term})
    return {"blocked": bool(hits), "violations": hits}

SAFE_GLOBALS = {
    "__builtins__": {
        "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict, "divmod": divmod,
        "enumerate": enumerate, "filter": filter, "float": float, "format": format,
        "frozenset": frozenset, "int": int, "len": len, "list": list, "map": map,
        "max": max, "min": min, "print": lambda *a, **k: None,
        "range": range, "repr": repr, "reversed": reversed, "round": round, "set": set,
        "sorted": sorted, "str": str, "sum": sum, "tuple": tuple, "zip": zip,
        "__import__": lambda name, *a, **k: (_ for _ in ()).throw(
            RuntimeError(f"import blocked in sandbox: {name}")
        ),
    }
}


async def _run_code(code: str) -> str:
    """Best-effort in-process sandbox. For hackathon MVP only - not a security boundary."""
    import asyncio as _asyncio

    stdout: List[str] = []

    def _fake_print(*args, **kwargs):
        stdout.append(" ".join(str(a) for a in args))

    gl = dict(SAFE_GLOBALS)
    gl["print"] = _fake_print
    try:
        def run() -> Any:
            exec(code, gl, {})  # noqa: S102 - intentional MVP sandbox
        await _asyncio.wait_for(_asyncio.to_thread(run), timeout=5.0)
        return "\n".join(stdout) or "(no output)"
    except BaseException as exc:  # noqa: BLE001
        return f"sandbox error: {exc.__class__.__name__}: {exc}"


async def _send_budget_alert(node_id: str) -> None:
    """Fire-and-forget usage alert via Resend when the budget cap blocks a run."""
    key = os.environ.get("RESEND_API_KEY")
    alert_to = os.environ.get("BUDGET_ALERT_EMAIL")
    if not key or not alert_to:
        return
    snap = await budget.snapshot()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "from": "onboarding@resend.dev",
                    "to": alert_to,
                    "subject": f"[OtariOptm] Budget cap reached (node {node_id})",
                    "html": (
                        f"<p>Workflow node <strong>{node_id}</strong> was blocked by the "
                        f"project budget cap.</p>"
                        f"<p>cap ${snap['cap']} &middot; spent ${snap['spent']} &middot; "
                        f"reserved ${snap['reserved']} &middot; remaining ${snap['remaining']}</p>"
                        "<p>Raise <code>budget.project_cap</code> in config/config.yml or reduce usage.</p>"
                    ),
                },
            )
    except Exception:
        pass  # alerts must never break workflow execution


@app.get("/api/v1/health")
async def health() -> Dict[str, Any]:
    snap = await budget.snapshot()
    return {
        "status": "ok",
        "otari": otari_client is not None,
        "groq": groq_client is not None,
        "budget": snap,
    }


@app.get("/api/v1/budget")
async def budget_state() -> Dict[str, Any]:
    return await budget.snapshot()


FALLBACK_CATALOG = [
    {"id": "alibaba/qwen-3.5-35b-a3b", "name": "qwen-3.5-35b", "cost_per_token": 0.0000003, "latency": 900, "health": 0.9},
    {"id": "anthropic:claude-sonnet-4-6", "name": "claude-sonnet-4-6", "cost_per_token": 0.000003, "latency": 1400, "health": 0.98},
    {"id": "openai:gpt-4o-mini", "name": "gpt-4o-mini", "cost_per_token": 0.00000015, "latency": 600, "health": 0.95},
    {"id": "demo", "name": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0},
]


async def _models() -> List[Dict[str, Any]]:
    if otari_client:
        try:
            models = await otari_client.fetch_models()
            normalized: List[Dict[str, Any]] = []
            for m in models[:24]:  # cap catalog size for routing
                if isinstance(m, str):
                    m = {"id": m}
                if not isinstance(m, dict):
                    continue
                m.setdefault("latency", 999)
                m.setdefault("health", 0.9)
                m.setdefault("cost_per_token", 0.0)
                normalized.append(m)
            # Always include the free demo tier so routing never runs out of options.
            normalized.append({"id": "demo", "name": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0})
            return _dedupe_ids(normalized)
        except Exception:
            pass
    # Always include the free demo tier so routing never runs out of options.
    return _dedupe_ids([*FALLBACK_CATALOG])


def _dedupe_ids(models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for m in models:
        mid = m.get("id") or m.get("name") or str(m)
        if mid in seen:
            continue
        seen.add(mid)
        out.append(m)
    return out


@app.get("/api/v1/models")
async def get_models() -> List[Dict[str, Any]]:
    return await _models()


@app.post("/api/v1/chat/completions")
async def chat_completions(request: Request) -> Dict[str, Any]:
    body = await request.json()
    model = body.get("model", "")
    messages = body.get("messages", [])
    max_tokens = int(body.get("max_tokens", 4000))
    if not messages:
        raise HTTPException(status_code=400, detail="messages are required")

    models = await _models()
    ctx = messages[:]
    body_node = {"id": "adhoc"}
    if model:
        chosen = next((m for m in models if (m.get("id") or m.get("name")) == model), None)
        if chosen:
            models = [chosen]
        else:  # unknown model -> full catalog + demo tier
            models = FALLBACK_CATALOG + [{"id": "demo", "name": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0}]

    result: Dict[str, Any] = await execute_chat_step(body_node, ctx, models, max_tokens)
    # Re-shape into OpenAI-compatible completion for direct client use.
    return {
        "model": result["model"],
        "choices": [{"index": 0, "message": {"role": "assistant", "content": result["output"]}, "finish_reason": "stop"}],
        "usage": {"total_tokens": result["tokens"], "cost": result["cost"]},
    }


@app.post("/api/v1/workflow/run")
async def workflow_run(request: Request) -> Dict[str, Any]:
    """Compile {nodes, edges} into topological steps and execute them."""
    body = await request.json()
    nodes: List[Dict[str, Any]] = body.get("nodes") or []
    edges: List[Dict[str, Any]] = body.get("edges") or []
    if not nodes:
        raise HTTPException(status_code=400, detail="workflow has no nodes")

    max_steps = int(budget.config["workflows"]["max_steps"])
    max_tokens = int(budget.config["workflows"]["max_tokens"])
    if len(nodes) > max_steps:
        raise HTTPException(status_code=400, detail=f"Workflow exceeds max_steps={max_steps}")

    models = await _models()
    ordered = _topo_order(nodes, edges)
    outputs: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []
    aborted: Optional[str] = None

    await _log_activity({"event": "workflow.started", "nodes": len(ordered), "edges": len(edges)})

    for node in ordered:
        nid = str(node["id"])
        ntype = node.get("type") or "chat"
        data = node.get("data") or {}

        try:
            if ntype == "guardrails":
                src = data.get("input") or _gather_upstream(nid, edges, outputs)
                verdict = _apply_guardrails(str(src), list(data.get("banned", [])))
                results.append({"nodeId": nid, "type": ntype, **verdict})
                outputs[nid] = {"output": "BLOCKED" if verdict["blocked"] else "PASS", "violations": verdict["violations"]}
                await _log_activity({"event": "node.completed", "nodeId": nid, "model": "guardrails",
                                     "blocked": verdict["blocked"], "cost": 0.0})
                if verdict["blocked"] and data.get("stop_on_block", True):
                    aborted = nid
                    break

            elif ntype == "web-search":
                query = _substitute(str(data.get("query", "")), outputs) or _gather_upstream(nid, edges, outputs)
                query = _trim(query)
                # Budget: reserve a padded estimate, charge the real Exa cost after.
                ok, rid = await budget.reserve(0.01)
                if not ok:
                    raise HTTPException(status_code=402, detail="Budget cap reached - search skipped")
                search_out = await _web_search(query)
                await budget.record(rid, float(search_out.get("cost") or 0.0))
                provider = search_out.get("provider", "duckduckgo")
                results.append({"nodeId": nid, "type": ntype, "output": search_out["results_text"],
                                "provider": provider, "cost": search_out.get("cost", 0.0),
                                **({"objective": search_out["objective"]} if search_out.get("objective") else {})})
                outputs[nid] = {"output": search_out["results_text"]}
                await _log_activity({"event": "node.completed", "nodeId": nid, "model": provider,
                                     "tokens": 0, "cost": search_out.get("cost", 0.0)})

            elif ntype == "code-exec":
                code = str(data.get("code", ""))
                code = _substitute(code, outputs)
                out = await _run_code(code)
                results.append({"nodeId": nid, "type": ntype, "output": out})
                outputs[nid] = {"output": out}
                await _log_activity({"event": "node.completed", "nodeId": nid, "model": "sandbox",
                                     "tokens": 0, "cost": 0.0})

            else:  # chat (ModelChat / default)
                node_data = data.get("data") if isinstance(data.get("data"), dict) else data
                upstream = _gather_upstream(nid, edges, outputs)
                prompt_text = str(node_data.get("prompt", "") or "").strip()
                if not prompt_text:
                    prompt_text = upstream
                prompt_text = _substitute(prompt_text, outputs)
                if not prompt_text.strip():
                    prompt_text = upstream
                messages = [{"role": "system", "content": str(node_data.get("system", ""))}] if node_data.get("system") else []
                messages.append({"role": "user", "content": prompt_text or "Hello"})
                res = await execute_chat_step(node, messages, models, max_tokens)
                res["type"] = ntype
                results.append(res)
                outputs[nid] = res
        except HTTPException as exc:
            if exc.status_code == 402:
                aborted = nid
                await _log_activity({"event": "workflow.blocked", "nodeId": nid, "reason": "budget cap"})
                asyncio.create_task(_send_budget_alert(nid))
                break
            results.append({"nodeId": nid, "type": ntype, "error": exc.detail})
            outputs[nid] = {"output": f"error: {exc.detail}"}
        except Exception as exc:
            results.append({"nodeId": nid, "type": ntype, "error": str(exc)})
            outputs[nid] = {"output": f"error: {exc}"}

    snap = await budget.snapshot()
    await _log_activity({"event": "workflow.finished", "aborted": aborted, "budget": snap})

    return {
        "results": [r for r in results if r.get("type") != "chat" or "nodeId" in r],
        "steps": results,
        "budget": snap,
        "aborted": aborted,
        "source": "otarioptm-gateway",
    }


def _gather_upstream(node_id: str, edges: List[Dict[str, Any]], outputs: Dict[str, Dict[str, Any]]) -> str:
    parts = []
    for e in edges:
        if str(e.get("target")) == node_id:
            src = str(e.get("source"))
            out = outputs.get(src, {}).get("output")
            if out:
                parts.append(f"[from {src}] {out}")
    return "\n---\n".join(parts)


def _trim(text: str, limit: int = 2000) -> str:
    return text if len(text) <= limit else text[:limit] + "..."


@app.get("/api/v1/activity")
async def activity_snapshot() -> Dict[str, Any]:
    return {"events": ACTIVITY_LOG[-200:], "budget": await budget.snapshot()}


@app.websocket("/api/v1/activity")
async def activity_ws(websocket: WebSocket) -> None:
    """Stream budget snapshots + node events to the dashboard."""
    await hub.connect(websocket)
    try:
        await websocket.send_text(json.dumps(await budget.snapshot(), default=str))
        while True:
            # Client pings keep the socket warm; server pushes events hub.emit.
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({"event": "pong", **await budget.snapshot()}))
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(websocket)


@app.get("/api/v1/export")
async def export_csv() -> Response:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ts", "event", "node", "model", "chain", "tokens", "cost_usd", "latency_ms", "routing"])
    for e in ACTIVITY_LOG:
        if e.get("event") == "workflow.started":
            continue
        if "event" in e and e.get("event") in ("node.completed", "workflow.blocked", "workflow.finished"):
            writer.writerow([
                round(e.get("ts", 0), 3), e.get("event"), e.get("nodeId", ""),
                e.get("model", ""), ",".join(e.get("chain", []) or []), e.get("tokens", ""),
                e.get("cost", ""), e.get("latencyMs", ""), (e.get("routing") or "").replace(",", ";"),
            ])
    remaining = await budget.get_remaining()
    writer.writerow(["TOTAL", "", "", "", "", "", round(budget.spend, 6), "remaining: " + str(round(remaining, 6))])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=otarioptm-activity.csv"},
    )
