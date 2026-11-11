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

import ast
import asyncio
import csv
import io
import json
import math
import os
import re
import time
import sys
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv()

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from src.services import router as router_mod
from src.services.budget import BudgetManager
from src.services.otari_client import OTARIClient
from src.services.router import _model_cost, estimated_call_cost, select_model

budget = BudgetManager()
otari_client: Optional[OTARIClient] = None
groq_client: Optional[httpx.AsyncClient] = None

# Free-only mode (OTARIOPTM_FREE_ONLY=1): never create the Otari client even
# when OTARI_API_KEY is present, so chat steps route to the free Groq tier
# and then to the explicitly labeled demo tier. No paid provider is called.
FREE_ONLY = os.environ.get("OTARIOPTM_FREE_ONLY", "").strip().lower() in ("1", "true", "yes")

DEMO_COMPLETION_COST = 0.0

# Smallest reservation the gateway takes when nothing is left in the budget.
# It is only used to turn an EXHAUSTED cap into the documented 402; a paid
# model is always reserved with exactly the router's affordability estimate.
MIN_RESERVATION = 0.01

# Inbound payload caps (P0-3). Every one of them answers 400, never 500.
MAX_WORKFLOW_NODES = 100
MAX_WORKFLOW_EDGES = 300
MAX_MESSAGES = 50
MAX_PROMPT_CHARS = 8000
MAX_CODE_CHARS = 8000
MAX_TOKENS_MIN = 1
MAX_TOKENS_MAX = 4096
MAX_TEMPLATE_ID_CHARS = 64

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


async def startup() -> None:
    global otari_client, groq_client
    api_key = os.environ.get("OTARI_API_KEY")
    if api_key and not FREE_ONLY:
        otari_client = OTARIClient(api_key)
        print("OtariOptm: OTARI gateway enabled")
    elif api_key and FREE_ONLY:
        print("OtariOptm: free-only mode - OTARI_API_KEY present but paid Otari routing disabled")
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
    # Start the background health probe so the 60 s TTL cache is refreshed
    # periodically instead of only on demand.
    _schedule_health_probe()


async def shutdown() -> None:
    global _probe_task
    if otari_client:
        await otari_client.close()
    if groq_client:
        await groq_client.aclose()
    task, _probe_task = _probe_task, None
    if task is not None:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


async def _log_activity(event: Dict[str, Any]) -> None:
    event = {**event, "ts": time.time()}
    ACTIVITY_LOG.append(event)
    if len(ACTIVITY_LOG) > 2000:
        del ACTIVITY_LOG[: len(ACTIVITY_LOG) - 2000]
    await hub.emit(event)
    await hub.emit(await budget.snapshot())


def _router_call_estimate(model_map: Optional[Dict[str, Any]]) -> float:
    """Estimated USD cost of ONE call to ``model_map``.

    This is the router's own affordability estimate (per-token cost x a token
    estimate: the model's ``max_tokens`` hint, else
    ``router.DEFAULT_TOKEN_ESTIMATE``), taken from the router's PUBLIC
    ``estimated_call_cost`` helper. The gateway reserves with the SAME
    number, so a model the router called affordable is never rejected by
    ``reserve()`` with a 402.
    """
    if not model_map:
        return 0.0
    try:
        return max(0.0, float(estimated_call_cost(model_map)))
    except Exception:
        pass
    # Defensive mirror of the router formula (used only if the router helper
    # ever misbehaves) - keep it identical to router.estimated_call_cost.
    per_tok = _model_cost(model_map)
    if per_tok <= 0:
        return 0.0
    hint = float(model_map.get("max_tokens") or 0.0)
    tokens = hint if hint > 0 else float(getattr(router_mod, "DEFAULT_TOKEN_ESTIMATE", 500))
    return per_tok * tokens


def _estimate_cost(model_map: Optional[Dict[str, Any]], messages: List[Dict[str, Any]], max_tokens: int) -> float:
    """Pre-flight cost estimate in USD, SHARED with the router.

    ``messages``/``max_tokens`` are kept for call-site compatibility; the
    estimate itself is the router's per-call estimate so the gateway can never
    reserve more than the router considered affordable.
    """
    return _router_call_estimate(model_map)


# Largest inbound JSON body accepted (bytes). Every documented payload cap
# (messages/prompt/code limits above) sits far below this, so a legitimately
# formed request never comes close; anything larger is a memory-exhaustion
# attempt and is refused with 413 BEFORE the body is read into memory.
MAX_BODY_BYTES = 1_000_000


async def _json_body(request: Request) -> Dict[str, Any]:
    """Parse a JSON object body; malformed input is a 400, not a 500.

    The accumulated read is bounded regardless of headers: a missing,
    false or chunked Content-Length cannot grow memory past
    MAX_BODY_BYTES, because the cap is enforced while streaming.
    """
    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            declared_len = int(declared)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid content-length header")
        if declared_len > MAX_BODY_BYTES:
            raise HTTPException(status_code=413, detail="request body too large")
    chunks: List[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            raise HTTPException(status_code=413, detail="request body too large")
        chunks.append(chunk)
    try:
        body = json.loads(b"".join(chunks))
    except Exception:
        raise HTTPException(status_code=400, detail="request body must be valid JSON")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="request body must be a JSON object")
    return body


def _clamp_max_tokens(value: Any, default: int = 4000) -> int:
    """Clamp max_tokens into [1, 4096]; non-numeric input is a 400."""
    if value is None:
        value = default
    try:
        tokens = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="max_tokens must be an integer")
    return max(MAX_TOKENS_MIN, min(MAX_TOKENS_MAX, tokens))


def _validate_messages(messages: Any) -> List[Dict[str, Any]]:
    """Validate the inbound chat message list against the payload caps."""
    if not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="messages must be an array")
    if len(messages) > MAX_MESSAGES:
        raise HTTPException(
            status_code=400,
            detail=f"too many messages ({len(messages)} > {MAX_MESSAGES})",
        )
    if not messages:
        raise HTTPException(status_code=400, detail="messages are required")
    for msg in messages:
        if not isinstance(msg, dict):
            raise HTTPException(status_code=400, detail="each message must be an object")
        content = msg.get("content")
        if isinstance(content, str) and len(content) > MAX_PROMPT_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"message content exceeds {MAX_PROMPT_CHARS} characters",
            )
    return messages


def _validate_node_payload(node: Dict[str, Any], node_id: str) -> None:
    """Reject oversized node payloads (prompt / code / query) with a 400."""
    data = node.get("data") or {}
    if not isinstance(data, dict):
        return
    node_data = data.get("data") if isinstance(data.get("data"), dict) else data
    prompt = node_data.get("prompt")
    if isinstance(prompt, str) and len(prompt) > MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"node '{node_id}' prompt exceeds {MAX_PROMPT_CHARS} characters",
        )
    system = node_data.get("system")
    if isinstance(system, str) and len(system) > MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"node '{node_id}' system prompt exceeds {MAX_PROMPT_CHARS} characters",
        )
    code = data.get("code")
    if isinstance(code, str) and len(code) > MAX_CODE_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"node '{node_id}' code exceeds {MAX_CODE_CHARS} characters",
        )
    query = data.get("query")
    if isinstance(query, str) and len(query) > MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"node '{node_id}' query exceeds {MAX_PROMPT_CHARS} characters",
        )


async def _release_reservation(reservation_id: Optional[str]) -> None:
    """Release a still-outstanding reservation exactly once (no leaks)."""
    if not reservation_id:
        return
    try:
        await asyncio.shield(budget.release(reservation_id))
    except Exception:
        pass


async def _settle_reservation(reservation_id: str, actual_cost: Any) -> Tuple[float, bool]:
    """Charge a reservation exactly once through the canonical budget primitive.

    ``BudgetManager.settle`` owns the exactly-once ledger, the cap clamp and
    the over-budget flag, so the gateway never hand-rolls the accounting.
    Returns (charged, over_budget).
    """
    cost = max(0.0, float(actual_cost or 0.0))
    return await budget.settle(reservation_id, cost)


def _routing_step_type(node: Optional[Dict[str, Any]]) -> str:
    """Map a workflow node onto the router's step-type weights."""
    ntype = str((node or {}).get("type") or "chat")
    return {"code-exec": "code", "web-search": "search"}.get(ntype, "chat")


def _select_model(candidates: List[Dict[str, Any]], remaining: float, step_type: str) -> Tuple[Optional[Dict[str, Any]], float, str]:
    """Call the router with keyword arguments so extra optional params are safe."""
    try:
        return select_model(candidates, budget_remaining=remaining, step_type=step_type)
    except TypeError:
        return select_model(candidates, remaining, step_type)


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
    chat_ids = [i for i in ids if not _NON_CHAT_ID.search(str(i))]
    priority = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    chosen = next((i for i in priority if i in chat_ids), None)
    if chosen is None:
        llamas = sorted(i for i in chat_ids if "llama" in str(i))
        chosen = llamas[0] if llamas else (str(chat_ids[0]) if chat_ids else "llama-3.3-70b-versatile")
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
        # Status only: the provider's response body can echo prompts, key
        # material or internal payloads and must never reach a client.
        raise RuntimeError(f"Groq returned {resp.status_code}")
    return resp.json()


_PROVIDER_STATUS_RE = re.compile(r"(?:status|returned|http|code)\s*[:=]?\s*(\d{3})", re.IGNORECASE)


def _safe_provider_error(provider: str, exc: BaseException) -> str:
    """Provider failure context that is safe to return to a client.

    Only the provider name, an HTTP status code (when the exception carries
    one in a known shape) and the exception class survive: a raw provider
    response body can echo prompts, key material or internal payloads, so it
    is never copied into a note, an activity event or an HTTP response.
    """
    status = ""
    match = _PROVIDER_STATUS_RE.search(str(exc))
    if match:
        status = f" {match.group(1)}"
    return f"{provider} error{status} ({exc.__class__.__name__})"


def _demo_answer_lines(content: str) -> List[str]:
    """Pull up to five presentable lines out of a node's input for the demo answer.

    Numbered search results and bullet lines survive intact; prose is wrapped
    into short chunks. Everything returned here is a verbatim excerpt of the
    node's real input, never invented content.
    """
    lines: List[str] = []
    for raw in content.splitlines():
        line = raw.strip().lstrip("-* ").strip()
        if len(line) < 24 or line.endswith(":"):
            continue
        lines.append(line[:220])
        if len(lines) >= 5:
            break
    if not lines and content.strip():
        text = " ".join(content.split())
        while text and len(lines) < 3:
            lines.append(text[:220])
            text = text[220:].strip()
    return lines


async def _demo_chat(messages: List[Dict[str, Any]], node_id: str) -> Dict[str, Any]:
    """Deterministic local completion so demos run without any API key.

    The answer is built only from the input this node actually received
    (prompt plus upstream outputs) and is labeled as simulated on its first
    line, so a demo run shows a real, readable answer shape without ever
    pretending a live model produced it.
    """
    user = next((m for m in reversed(messages) if m.get("role") == "user"), {})
    content = str(user.get("content", ""))
    ws_count = sum(1 for e in ACTIVITY_LOG if e.get("event") == "workflow.started")
    hint = (
        "Simulated answer - no live model is connected in this environment."
        " Set OTARI_API_KEY or GROQ_API_KEY for real model output."
    )
    bullets = _demo_answer_lines(content)
    if bullets:
        body = "\n".join(f"- {line}" for line in bullets)
        demo = (
            f"[DEMO | node {node_id} | workflow #{ws_count}] {hint}\n\n"
            f"Key points from this node's input:\n{body}"
        )
    else:
        demo = (
            f"[DEMO | node {node_id} | workflow #{ws_count}] {hint}\n\n"
            "This node received an empty prompt, so there is nothing to answer."
        )
    return {
        "id": f"demo-{node_id}-{int(time.time() * 1000)}",
        "model": "demo",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": demo}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": len(content) // 4, "completion_tokens": len(demo) // 4, "total_tokens": len(content) // 4 + len(demo) // 4},
        "cost": DEMO_COMPLETION_COST,
        "demo": True,
    }


class EmptyCompletion(RuntimeError):
    """A provider answered 200 but produced no completion text.

    Seen live with reasoning models whose whole token budget went to hidden
    reasoning (content == ""), and possible with tool-call-only responses,
    which this gateway cannot render (it never sends tools). Treated as a
    provider failure so the chain falls to the next tier instead of recording
    an empty output as a successful answer.
    """


def _completion_text(result: Dict[str, Any]) -> str:
    """Stripped assistant text of the first choice; "" when absent."""
    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return ""
    if content is None:
        return ""
    return str(content).strip()


def _has_tool_calls(result: Dict[str, Any]) -> bool:
    """True when the first choice carries tool calls instead of text."""
    try:
        message = result["choices"][0]["message"]
    except (KeyError, IndexError, TypeError):
        return False
    return isinstance(message, dict) and bool(message.get("tool_calls"))


def _raise_if_empty(result: Dict[str, Any], provider: str) -> None:
    """Reject a 200 response that carries no renderable answer."""
    if _completion_text(result):
        return
    detail = f"{provider} returned no completion content"
    if _has_tool_calls(result):
        detail += " (tool calls only - tool execution is not supported by this gateway)"
    raise EmptyCompletion(detail)


def _reported_cost(result: Dict[str, Any]) -> float:
    """Provider-reported USD spend of ONE attempt (0.0 when unreported)."""
    if not isinstance(result, dict):
        return 0.0
    try:
        return max(0.0, float(result.get("cost") or result.get("actual_cost") or 0.0))
    except (TypeError, ValueError):
        return 0.0


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

    step_type = _routing_step_type(node)
    remaining = await budget.get_remaining()
    chosen, score, reason = _select_model(candidates, remaining, step_type)

    # ONE estimate, shared with the router: the router judged this model
    # affordable with exactly this number, so the reservation can never be
    # larger than what the router checked.
    est = _estimate_cost(chosen, ctx_messages, max_tokens)
    if est > 0:
        reservation = est
    else:
        # Zero-cost tier: reserve nothing, unless the cap is already exhausted
        # - then a minimal reservation keeps the documented 402 behaviour.
        reservation = MIN_RESERVATION if remaining <= 0 else 0.0
    ok, rid = await budget.reserve(reservation)
    if not ok:
        raise HTTPException(status_code=402, detail="Budget cap reached - step skipped")

    t0 = time.time()
    chain: List[str] = []
    primary: Optional[str] = None
    failures: List[str] = []
    settled = False
    over_budget = False
    actual_cost = 0.0
    # Spend from FAILED attempts (e.g. an empty completion that still billed),
    # kept separate by source so the ledger never presents an estimate as a
    # provider-reported charge.
    reported_failed = 0.0
    estimated_failed = 0.0
    result: Dict[str, Any] = {}
    try:
        try:
            chosen_id = str(chosen.get("id") or chosen.get("name")) if chosen else ""
            if otari_client is not None and chosen_id and chosen_id != "demo":
                primary = "otari"
                result = await _otari_chat(chosen_id, ctx_messages, max_tokens)
                _raise_if_empty(result, "otari")
                chain = ["otari"]
            elif groq_client is not None:
                primary = "groq"
                result = await _groq_chat(ctx_messages, max_tokens)
                _raise_if_empty(result, "groq")
                chain = ["groq"]
            else:
                primary = "demo"
                result = await _demo_chat(ctx_messages, node_id)
                chain = ["demo"]
        except Exception as exc:  # provider failure (incl. wallet-level HTTP errors) -> next tier
            if isinstance(exc, EmptyCompletion):
                # Self-authored safe message (provider name + fixed text); it
                # must explain the failure, e.g. tool-call-only responses this
                # gateway cannot render, not pretend the model simply errored.
                failures.append(str(exc))
            else:
                failures.append(_safe_provider_error(primary or "provider", exc))
            # A failed attempt that still billed keeps its cost: the provider
            # charged it even though the answer is unusable.
            attempt_cost = _reported_cost(result)
            if attempt_cost > 0:
                reported_failed += attempt_cost
            elif isinstance(exc, EmptyCompletion) and primary == "otari":
                # A 200 with no content and no cost report (e.g. a reasoning
                # model that spent its tokens on hidden reasoning) can still
                # have billed: charge the shared estimate, clearly labeled as
                # an estimate, never record a paid attempt as free.
                estimated_failed += est
            if primary == "otari":
                if groq_client is not None:
                    try:
                        result = await _groq_chat(ctx_messages, max_tokens)
                        _raise_if_empty(result, "groq")
                        chain = ["otari->groq"]
                    except Exception as _gexc:
                        if isinstance(_gexc, EmptyCompletion):
                            failures.append(str(_gexc))
                        else:
                            failures.append(_safe_provider_error("groq", _gexc))
                        reported_failed += _reported_cost(result)
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
        latency_ms = (time.time() - t0) * 1000

        usage = result.get("usage") or {}
        reported_total = _reported_cost(result) + reported_failed
        # When the winning paid attempt doesn't report spend, charge the
        # shared estimate so the cap can't be bypassed; demo/Groq tiers are
        # explicitly free. Estimated portions are tracked separately from
        # provider-reported spend.
        estimated_total = estimated_failed
        if _reported_cost(result) == 0.0 and chain[:1] == ["otari"]:
            estimated_total += est
        actual_cost = reported_total + estimated_total
        if reported_total > 0 and estimated_total > 0:
            cost_source = "provider-reported+estimate"
        elif reported_total > 0:
            cost_source = "provider-reported"
        elif estimated_total > 0:
            cost_source = "estimate"
        else:
            cost_source = "free"
        actual_cost, over_budget = await _settle_reservation(rid, actual_cost)
        settled = True
    finally:
        if not settled:
            await _release_reservation(rid)

    # Safe, body-free provider context: names, statuses and exception classes.
    fallback_note: Optional[str] = "; ".join(failures) if failures else None
    if fallback_note and chain and chain[-1] == "demo":
        fallback_note += ", falling back to demo"

    text = _completion_text(result)
    if not text:
        # Defensive: real-provider empties are rejected above, so this only
        # fires for exotic payloads. A 200 payload without a completion can
        # still be an error body: only echo it when it clearly carries no
        # error payload.
        if isinstance(result, dict) and not result.get("error"):
            text = json.dumps(result)[:500]
        else:
            text = "[provider returned no completion content]"

    await _log_activity({
        "event": "node.completed",
        "nodeId": node_id,
        "model": result.get("model"),
        "chain": chain,
        "tokens": usage.get("total_tokens"),
        "cost": actual_cost,
        "costSource": cost_source,
        "latencyMs": round(latency_ms),
        "routing": reason,
        **({"fallbackNote": fallback_note} if fallback_note else {}),
        **({"overBudget": True} if over_budget else {}),
    })

    return {
        "nodeId": node_id,
        "output": text,
        "model": result.get("model"),
        "chain": chain,
        "tokens": usage.get("total_tokens", 0),
        "cost": actual_cost,
        "costSource": cost_source,
        "latencyMs": round(latency_ms),
        "routing": reason,
        "demo": result.get("demo", False),
        # A simulated demo-tier answer is never real inference, even when the
        # node completed: realInference is the field to count, not status.
        "realInference": not bool(result.get("demo", False)),
        "note": fallback_note,
        "overBudget": over_budget,
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
    """Order nodes parents-first, rejecting malformed or cyclic graphs.

    Uses Kahn's algorithm: a node is emitted only once every parent (edge
    source) has been emitted, so a cycle can never produce a partial order.
    """
    node_by_id: Dict[str, Dict[str, Any]] = {}
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise HTTPException(status_code=400, detail=f"workflow node at index {index} must be an object")
        raw_id = node.get("id")
        if raw_id is None or str(raw_id).strip() == "":
            raise HTTPException(status_code=400, detail=f"workflow node at index {index} is missing an 'id'")
        node_id = str(raw_id)
        if node_id in node_by_id:
            raise HTTPException(status_code=400, detail=f"duplicate node id '{node_id}'")
        node_by_id[node_id] = node

    parents: Dict[str, set] = {nid: set() for nid in node_by_id}
    for edge in edges or []:
        if not isinstance(edge, dict):
            raise HTTPException(status_code=400, detail="each edge must be an object")
        source = str(edge.get("source") or "")
        target = str(edge.get("target") or "")
        if source not in node_by_id:
            raise HTTPException(status_code=400, detail=f"edge references unknown node '{source}'")
        if target not in node_by_id:
            raise HTTPException(status_code=400, detail=f"edge references unknown node '{target}'")
        parents[target].add(source)

    remaining = {nid: set(p) for nid, p in parents.items()}
    order: List[Dict[str, Any]] = []
    ready = [nid for nid in node_by_id if not remaining[nid]]
    while ready:
        node_id = ready.pop(0)
        order.append(node_by_id[node_id])
        for other in node_by_id:
            if node_id in remaining[other]:
                remaining[other].discard(node_id)
                if not remaining[other]:
                    ready.append(other)

    if len(order) != len(node_by_id):
        stuck = sorted(nid for nid, p in remaining.items() if p)
        raise HTTPException(
            status_code=400,
            detail=f"workflow contains a cycle (involving: {', '.join(stuck)})",
        )
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

from src.gateway.sandbox_runner import sandbox_violation as _sandbox_violation

_SANDBOX_RUNNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandbox_runner.py")
_SANDBOX_WALL_TIMEOUT = 15.0

# Fail-closed kill switch. The code-exec node refuses every program until
# untrusted execution runs behind a genuine isolation boundary (separate
# container/user, no shared filesystem or network with the gateway). The
# fresh-interpreter runner below is a mitigation, NOT that boundary: same-UID
# filesystem/network escapes remain possible, so a benign spawn smoke test is
# NOT a re-enable criterion. There is never an in-process fallback.
CODE_EXEC_DISABLED = True


async def _run_code(code: str) -> Dict[str, Any]:
    """Run untrusted code in a FRESH interpreter subprocess; fail closed.

    The child is spawned (``python -I sandbox_runner.py``) with an EMPTY
    environment, not forked: it inherits no module globals, no loaded API
    clients and no env keys from this process, so there is nothing sensitive
    in its memory to reach. Inside the child, AST validation, a minimal
    builtins set and hard RLIMIT_CPU/RLIMIT_AS limits apply; the parent
    enforces a wall-clock timeout and kills the child.

    FAIL CLOSED: if the isolated subprocess cannot be spawned or does not
    return a well-formed result (e.g. killed by a resource limit), the step
    fails with an explanatory error. Untrusted code NEVER falls back to
    in-process execution. Returns ``{"output", "ok", "error"}``; a rejected
    program never raises and never reaches ``exec``.
    """
    if CODE_EXEC_DISABLED:
        return {
            "output": "code-exec unavailable: sandbox hardening in progress",
            "ok": False,
            "error": "code-exec temporarily disabled (sandbox hardening in progress)",
        }
    if CODE_EXEC_DISABLED:
        return {
            "output": "code-exec unavailable: sandbox hardening in progress",
            "ok": False,
            "error": "code-exec temporarily disabled (sandbox hardening in progress)",
        }
    violation = _sandbox_violation(code)
    if violation:
        return {"output": f"sandbox rejected: {violation}", "ok": False, "error": violation}

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-I", _SANDBOX_RUNNER,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env={},  # empty environment: no keys, no config, nothing to leak
            limit=128 * 1024,
        )
    except Exception as exc:  # spawn failed: refuse, never exec in-process
        detail = f"sandbox unavailable: isolated process could not start ({exc.__class__.__name__})"
        return {"output": detail, "ok": False, "error": detail}
    try:
        out, _ = await asyncio.wait_for(proc.communicate(code.encode()), timeout=_SANDBOX_WALL_TIMEOUT)
    except (asyncio.TimeoutError, Exception):  # noqa: BLE001
        try:
            proc.kill()
        except Exception:
            pass
        await proc.wait()
        return {"output": "sandbox error: execution killed (timeout or resource limit)", "ok": False, "error": "timeout"}
    try:
        line = out.decode(errors="replace").strip().splitlines()[-1]
        result = json.loads(line)
        return {"output": result["output"], "ok": bool(result["ok"]), "error": result.get("error")}
    except Exception:
        # Child died before answering (RLIMIT_SIGKILL etc.): fail closed.
        return {"output": "sandbox error: execution killed (timeout or resource limit)", "ok": False, "error": "killed"}


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


def _runtime_info() -> Dict[str, Any]:
    """Truthful runtime/transport labels for the dashboard.

    On Vercel serverless (VERCEL env set) the /api/v1/activity WebSocket
    cannot stay open, in-memory activity/budget state is per-invocation,
    and the supported live path is polling GET /api/v1/activity. The
    dashboard must render "polling" / "snapshot" state there instead of a
    fake live WebSocket panel. Locally both WebSocket and polling work.
    """
    serverless = bool(os.environ.get("VERCEL"))
    return {
        "runtime": "vercel-serverless" if serverless else "local",
        "activity_transport": "poll" if serverless else "websocket+poll",
        "activity_snapshot_path": "/api/v1/activity",
    }


async def health() -> Dict[str, Any]:
    snap = await budget.snapshot()
    return {
        "status": "ok",
        "otari": otari_client is not None,
        "groq": groq_client is not None,
        "free_only": FREE_ONLY,
        "budget": snap,
        **_runtime_info(),
    }


async def budget_state() -> Dict[str, Any]:
    return await budget.snapshot()


FALLBACK_CATALOG = [
    {"id": "alibaba/qwen-3.5-35b-a3b", "name": "qwen-3.5-35b", "cost_per_token": 0.0000003, "latency": 900, "health": 0.9},
    {"id": "anthropic:claude-sonnet-4-6", "name": "claude-sonnet-4-6", "cost_per_token": 0.000003, "latency": 1400, "health": 0.98},
    {"id": "openai:gpt-4o-mini", "name": "gpt-4o-mini", "cost_per_token": 0.00000015, "latency": 600, "health": 0.95},
    {"id": "demo", "name": "demo", "cost_per_token": 0.0, "latency": 1, "health": 1.0},
]


# Model ids that must never serve a chat step: classifiers, guardrails,
# embeddings, audio. Their ids are stable markers across providers.
_NON_CHAT_ID = re.compile(
    # orpheus = TTS voice family; without it the Groq picker can select a
    # speech model for chat and every run 400s into the demo fallback.
    r"guard|safeguard|embed|moderation|whisper|tts|orpheus|transcri|ocr|image",
    re.IGNORECASE,
)


def _is_chat_model(model: Dict[str, Any]) -> bool:
    """Keep only generative text-chat models in the routing catalog.

    Otari's catalog carries a ``type`` field (``chat`` / ``embedding`` / ...);
    our curated fallback entries have no type and are kept as-is. Guard and
    classifier ids are excluded even when a provider labels them ``chat``
    (they answer with scores, not text).
    """
    mtype = model.get("type")
    if mtype is not None and str(mtype).lower() != "chat":
        return False
    mid = str(model.get("id") or model.get("name") or "")
    return not _NON_CHAT_ID.search(mid)


async def _model_catalog() -> List[Dict[str, Any]]:
    if otari_client:
        try:
            models = await otari_client.fetch_models()
            # Otari answers {"object": "list", "data": [...]} - unwrap.
            if isinstance(models, dict):
                models = models.get("data") or []
            normalized: List[Dict[str, Any]] = []
            chat_seen = 0
            for m in models:
                if isinstance(m, str):
                    m = {"id": m}
                if not isinstance(m, dict):
                    continue
                if not _is_chat_model(m):
                    continue
                chat_seen += 1
                if chat_seen > 24:  # cap catalog size for routing
                    break
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


async def get_models() -> List[Dict[str, Any]]:
    return await _models()


async def chat_completions(request: Request) -> Dict[str, Any]:
    body = await _json_body(request)
    model = body.get("model", "")
    messages = _validate_messages(body.get("messages", []))
    max_tokens = _clamp_max_tokens(body.get("max_tokens"))

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


async def workflow_run(request: Request) -> Dict[str, Any]:
    """Compile {nodes, edges} into topological steps and execute them."""
    body = await _json_body(request)
    nodes: List[Dict[str, Any]] = body.get("nodes") or []
    edges: List[Dict[str, Any]] = body.get("edges") or []
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise HTTPException(status_code=400, detail="'nodes' and 'edges' must be arrays")
    if len(nodes) > MAX_WORKFLOW_NODES:
        raise HTTPException(
            status_code=400,
            detail=f"workflow has too many nodes ({len(nodes)} > {MAX_WORKFLOW_NODES})",
        )
    if len(edges) > MAX_WORKFLOW_EDGES:
        raise HTTPException(
            status_code=400,
            detail=f"workflow has too many edges ({len(edges)} > {MAX_WORKFLOW_EDGES})",
        )
    if not nodes:
        raise HTTPException(status_code=400, detail="workflow has no nodes")

    max_steps = int(budget.config["workflows"]["max_steps"])
    max_tokens = _clamp_max_tokens(budget.config["workflows"]["max_tokens"])
    if len(nodes) > max_steps:
        raise HTTPException(status_code=400, detail=f"Workflow exceeds max_steps={max_steps}")

    models = await _models()
    ordered = _topo_order(nodes, edges)
    for node in ordered:
        _validate_node_payload(node, str(node["id"]))
    outputs: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []
    aborted: Optional[str] = None

    await _log_activity({
        "event": "workflow.started",
        "nodeCount": len(ordered),
        "nodes": [str(n["id"]) for n in ordered],
        "edges": len(edges),
    })

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
                raw_objective = data.get("objective")
                objective = str(raw_objective) if raw_objective else None
                # Budget: reserve a padded estimate, charge the real Exa cost after.
                ok, rid = await budget.reserve(0.01)
                if not ok:
                    raise HTTPException(status_code=402, detail="Budget cap reached - search skipped")
                settled = False
                try:
                    search_out = await _web_search(query, objective)
                    search_cost, search_over_budget = await _settle_reservation(rid, float(search_out.get("cost") or 0.0))
                    settled = True
                finally:
                    if not settled:
                        await _release_reservation(rid)
                provider = search_out.get("provider", "duckduckgo")
                results.append({"nodeId": nid, "type": ntype, "output": search_out["results_text"],
                                "provider": provider, "cost": search_cost,
                                "overBudget": search_over_budget,
                                **({"objective": search_out["objective"]} if search_out.get("objective") else {})})
                outputs[nid] = {"output": search_out["results_text"]}
                await _log_activity({"event": "node.completed", "nodeId": nid, "model": provider,
                                     "tokens": 0, "cost": search_cost})

            elif ntype == "code-exec":
                code = str(data.get("code", ""))
                code = _substitute(code, outputs)
                sandbox = await _run_code(code)
                out = str(sandbox.get("output") or "")
                results.append({"nodeId": nid, "type": ntype, "output": out,
                                "status": "completed" if sandbox.get("ok") else "failed",
                                **({"error": sandbox["error"]} if sandbox.get("error") else {})})
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
            # Never echo a raw exception string: it can carry a provider
            # response body. The exception class is safe and enough to triage.
            detail = exc.__class__.__name__
            results.append({"nodeId": nid, "type": ntype, "error": detail})
            outputs[nid] = {"output": f"error: {detail}"}

    snap = await budget.snapshot()
    await _log_activity({"event": "workflow.finished", "aborted": aborted, "budget": snap})

    return {
        "results": [r for r in results if r.get("type") != "chat" or "nodeId" in r],
        "steps": results,
        "budget": snap,
        "aborted": aborted,
        "overBudget": any(bool(r.get("overBudget")) for r in results),
        # Nodes whose answer came from the simulated demo tier. These never
        # count as successful real inference; they are labeled, not hidden.
        "demoNodes": [str(r.get("nodeId")) for r in results if r.get("demo")],
        "freeOnly": FREE_ONLY,
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


async def activity_snapshot() -> Dict[str, Any]:
    # Serverless-compatible activity feed: this snapshot is the supported
    # transport where WebSockets cannot stay open (see _runtime_info).
    return {"events": ACTIVITY_LOG[-200:], "budget": await budget.snapshot(), **_runtime_info()}


async def activity_ws(websocket: WebSocket) -> None:
    """Stream budget snapshots + node events to the dashboard."""
    await hub.connect(websocket)
    try:
        await websocket.send_text(json.dumps(await budget.snapshot(), default=str))
        while True:
            # Client pings keep the socket warm; server pushes events hub.emit.
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({"event": "pong", "type": "pong", **await budget.snapshot()}))
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(websocket)


async def export_csv() -> Response:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ts", "event", "node", "model", "chain", "tokens", "cost_usd", "cost_source", "latency_ms", "routing"])
    for e in ACTIVITY_LOG:
        if e.get("event") == "workflow.started":
            continue
        if "event" in e and e.get("event") in ("node.completed", "workflow.blocked", "workflow.finished"):
            writer.writerow([
                round(e.get("ts", 0), 3), e.get("event"), e.get("nodeId", ""),
                e.get("model", ""), ",".join(e.get("chain", []) or []), e.get("tokens", ""),
                e.get("cost", ""), e.get("costSource", ""), e.get("latencyMs", ""), (e.get("routing") or "").replace(",", ";"),
            ])
    remaining = await budget.get_remaining()
    writer.writerow(["TOTAL", "", "", "", "", "", round(budget.spend, 6), "remaining: " + str(round(remaining, 6))])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=otarioptm-activity.csv"},
    )


# ---------------------------------------------------------------------------
# Per-IP token-bucket rate limiting (mutating endpoints; /health exempt).
# ---------------------------------------------------------------------------

class _TokenBucketLimiter:
    """In-memory token bucket keyed by client IP.

    Reads defaults from ``gateway.rate_limit`` in config/config.yml
    (falling back to built-in defaults) and stays O(1) per request with a
    bounded IP table so a flood of spoofed IPs cannot grow memory forever.
    """

    MAX_IPS = 10_000

    def __init__(self, capacity: float = 30.0, refill_per_sec: float = 1.0, enabled: bool = True) -> None:
        gw = budget.config.get("gateway") or {}
        rl = gw.get("rate_limit") or {}
        self.enabled = bool(rl.get("enabled", enabled))
        self.capacity = float(rl.get("capacity", capacity))
        self.refill = float(rl.get("refill_per_sec", refill_per_sec))
        self._buckets: Dict[str, Tuple[float, float]] = {}  # ip -> (tokens, last_ts)

    def check(self, ip: str) -> Tuple[bool, int]:
        """Consume one token for ``ip``; return (allowed, retry_after_seconds)."""
        now = time.time()
        tokens, last = self._buckets.get(ip, (self.capacity, now))
        tokens = min(self.capacity, tokens + (now - last) * self.refill)
        if tokens >= 1.0:
            tokens -= 1.0
            allowed, retry_after = True, 0
        else:
            allowed = False
            retry_after = max(1, math.ceil((1.0 - tokens) / self.refill)) if self.refill > 0 else 60
        if ip not in self._buckets and len(self._buckets) >= self.MAX_IPS:
            for stale_ip in list(self._buckets)[: len(self._buckets) - self.MAX_IPS + 1]:
                del self._buckets[stale_ip]
        self._buckets[ip] = (tokens, now)
        return allowed, retry_after


_limiter = _TokenBucketLimiter()

# Global (all-IP) per-instance burst cap on mutating endpoints. The per-IP
# bucket above is trivially rotated past with fresh source IPs; this second
# bucket bounds the TOTAL mutating traffic one instance serves, which blunts
# distributed abuse. A normal user hits the per-IP limit long before this
# one. It is still per-instance: it slows abuse, it is NOT a durable
# cross-instance spend bound.
_rl_cfg = (budget.config.get("gateway") or {}).get("rate_limit") or {}
_global_limiter = _TokenBucketLimiter(enabled=bool(_rl_cfg.get("enabled", True)))
# _TokenBucketLimiter.__init__ reads the per-IP keys, so set the global ones
# explicitly afterwards.
_global_limiter.capacity = float(_rl_cfg.get("global_capacity", 120.0))
_global_limiter.refill = float(_rl_cfg.get("global_refill_per_sec", 5.0))

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _client_ip(request: Request) -> str:
    """Best available client key for rate limiting.

    On Vercel (VERCEL env set) every request arrives from the platform's
    edge proxies, so request.client.host is the proxy, not the caller.
    Vercel's documented behaviour is to OVERWRITE x-forwarded-for with
    the client IP (anti-spoofing); x-real-ip and x-vercel-forwarded-for
    carry the same edge-observed value, and x-vercel-forwarded-for
    survives a proxy in front of Vercel, so it is preferred, with
    x-real-ip then the (single-value) x-forwarded-for as fallbacks.
    Off Vercel the direct peer is used and the spoofable headers are
    ignored.
    """
    if os.environ.get("VERCEL"):
        for header in ("x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"):
            value = request.headers.get(header)
            if value:
                first = value.split(",")[0].strip()
                if first:
                    return first
    return request.client.host if request.client else "unknown"


async def _rate_limit_middleware(request: Request, call_next: Any) -> Any:
    if _limiter.enabled and request.method in _MUTATING_METHODS and request.url.path.startswith("/api/v1/"):
        ip = _client_ip(request)
        allowed, retry_after = _limiter.check(ip)
        if allowed:
            allowed, retry_after = _global_limiter.check("global")
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded - slow down and retry"},
                headers={"Retry-After": str(retry_after)},
            )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Background model-health probe (60s TTL cache feeding the router).
# ---------------------------------------------------------------------------

HEALTH_PROBE_TTL = 60.0
_probe_cache: Dict[str, Any] = {"ts": 0.0, "values": {}}
_probe_task: Optional[asyncio.Task] = None
_bg_tasks: set = set()


def _synthetic_health(model_id: str) -> float:
    """Deterministic pseudo-health in [0.5, 1.0] derived from the model id."""
    seed = sum(ord(c) for c in model_id)
    wiggle = ((seed % 7) - 3) / 100.0  # -0.03..+0.03
    return round(max(0.5, min(1.0, 1.0 + wiggle)), 4)


async def _probe_model_health(models: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Refresh the model-health cache when older than the TTL.

    Demo mode gets deterministic synthetic values, clearly labeled
    ``synthetic-demo``; with live providers the catalog-reported health is
    labeled ``catalog`` until a real probe tier exists. The router consumes
    the stamped values via ``_models()``.
    """
    now = time.time()
    if now - _probe_cache["ts"] < HEALTH_PROBE_TTL and _probe_cache["values"]:
        return _probe_cache
    live = otari_client is not None or groq_client is not None
    values: Dict[str, Any] = {}
    for m in models:
        mid = str(m.get("id") or m.get("name") or "?")
        if live:
            values[mid] = {"value": round(float(m.get("health", 0.9) or 0.0), 4), "source": "catalog", "ts": now}
        else:
            values[mid] = {"value": _synthetic_health(mid), "source": "synthetic-demo", "ts": now}
    _probe_cache["ts"] = now
    _probe_cache["values"] = values
    return _probe_cache


async def _health_probe_loop() -> None:
    """Background refresh so the cache is warm even between requests."""
    while True:
        try:
            await _probe_model_health([dict(m) for m in FALLBACK_CATALOG])
        except asyncio.CancelledError:
            raise
        except Exception:
            pass  # a probe failure must never break the gateway
        await asyncio.sleep(HEALTH_PROBE_TTL)


def _schedule_health_probe() -> Optional[asyncio.Task]:
    """Start the background health-probe loop (at most one at a time).

    Called from the FastAPI startup handler so the 60 s TTL cache is
    refreshed periodically instead of only when a request asks for the
    catalog. Returns the running task, or ``None`` when there is no running
    event loop.
    """
    global _probe_task
    if _probe_task is not None and not _probe_task.done():
        return _probe_task
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return None
    _probe_task = loop.create_task(_health_probe_loop())
    _bg_tasks.add(_probe_task)
    _probe_task.add_done_callback(_bg_tasks.discard)
    return _probe_task


async def _models() -> List[Dict[str, Any]]:
    catalog = await _model_catalog()
    probe = await _probe_model_health(catalog)
    out: List[Dict[str, Any]] = []
    for m in catalog:
        mm = dict(m)
        stamped = probe["values"].get(str(mm.get("id") or mm.get("name") or "?"))
        if stamped:
            mm["health"] = stamped["value"]
            mm["health_probe"] = {"value": stamped["value"], "source": stamped["source"], "ts": round(stamped["ts"], 3)}
        out.append(mm)
    return out


# ---------------------------------------------------------------------------
# Starter workflow templates (gallery; each graph is runnable as-is via
# POST /api/v1/workflow/run, including zero-key demo mode).
# ---------------------------------------------------------------------------

def _template(tid: str, name: str, description: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "id": tid,
        "name": name,
        "description": description,
        "nodeCount": len(nodes),
        "graph": {"nodes": nodes, "edges": edges},
    }


WORKFLOW_TEMPLATES: List[Dict[str, Any]] = [
    _template(
        "research-then-summarize",
        "Research then summarize",
        "Web search feeds a chat step that condenses the findings into a short brief.",
        [
            {"id": "search-1", "type": "web-search", "data": {"query": "Mozilla Otari gateway"}, "position": {"x": 0, "y": 0}},
            {"id": "summarize-1", "type": "chat", "data": {"system": "You are a concise research assistant.", "prompt": "Summarize the key points from this research:\n\n{{search-1}}"}, "position": {"x": 240, "y": 0}},
        ],
        [{"id": "e1", "source": "search-1", "target": "summarize-1"}],
    ),
    _template(
        "guarded-chat",
        "Guarded chat",
        "A chat step whose output is screened by guardrails before it can continue downstream.",
        [
            {"id": "chat-1", "type": "chat", "data": {"system": "You are a helpful assistant.", "prompt": "Tell me about your weekend plans."}, "position": {"x": 0, "y": 0}},
            {"id": "guard-1", "type": "guardrails", "data": {"banned": [], "stop_on_block": True}, "position": {"x": 240, "y": 0}},
        ],
        [{"id": "e1", "source": "chat-1", "target": "guard-1"}],
    ),
    _template(
        "code-review",
        "Code review",
        "A sandboxed static check runs first, then a chat step reviews the snippet with that context.",
        [
            {"id": "prepare-1", "type": "code-exec", "data": {"code": "sample = \"def add(a, b):\\n    return a + b\"\nprint(\"functions:\", sample.count(\"def\"))\nprint(\"lines:\", len(sample.splitlines()))"}, "position": {"x": 0, "y": 0}},
            {"id": "review-1", "type": "chat", "data": {"system": "You are a senior code reviewer.", "prompt": "Review this Python snippet for bugs and style:\n\ndef add(a, b):\n    return a + b\n\nStatic check output:\n{{prepare-1}}"}, "position": {"x": 240, "y": 0}},
        ],
        [{"id": "e1", "source": "prepare-1", "target": "review-1"}],
    ),
    _template(
        "web-fact-check",
        "Web fact check",
        "Search results are fact-checked by a chat step, then screened by guardrails.",
        [
            {"id": "search-1", "type": "web-search", "data": {"query": "OtariOptm cost-aware model routing"}, "position": {"x": 0, "y": 0}},
            {"id": "check-1", "type": "chat", "data": {"system": "You are a careful fact-checker.", "prompt": "Fact-check the claims in these search results and flag anything unverified:\n\n{{search-1}}"}, "position": {"x": 240, "y": 0}},
            {"id": "guard-1", "type": "guardrails", "data": {"banned": [], "stop_on_block": False}, "position": {"x": 480, "y": 0}},
        ],
        [{"id": "e1", "source": "search-1", "target": "check-1"}, {"id": "e2", "source": "check-1", "target": "guard-1"}],
    ),
]


def _templates_by_id() -> Dict[str, Dict[str, Any]]:
    return {t["id"]: t for t in WORKFLOW_TEMPLATES}


async def list_templates() -> List[Dict[str, Any]]:
    return WORKFLOW_TEMPLATES


async def get_template(template_id: str) -> Dict[str, Any]:
    if len(template_id) > MAX_TEMPLATE_ID_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"template id exceeds {MAX_TEMPLATE_ID_CHARS} characters",
        )
    tpl = _templates_by_id().get(template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail=f"Unknown template '{template_id}'")
    return tpl


# ---------------------------------------------------------------------------
# SSE chat stream: event: delta chunks, 15s heartbeat comments, event: done,
# event: error. Budget is recorded through the same execute_chat_step path as
# the non-streaming endpoint; client disconnects cancel the stream and leave a
# node.completed trail in the activity log.
# ---------------------------------------------------------------------------

_SSE_HEARTBEAT_SECONDS = 15.0
_SSE_CHUNK_CHARS = 24


async def chat_completions_stream(request: Request) -> Response:
    body = await _json_body(request)
    messages = _validate_messages(body.get("messages") or [])
    model = str(body.get("model", "") or "")
    max_tokens = _clamp_max_tokens(body.get("max_tokens"))

    models = await _models()
    if model:
        chosen = next((m for m in models if (m.get("id") or m.get("name")) == model), None)
        if chosen:
            models = [chosen]

    async def _sse() -> Any:
        queue: asyncio.Queue = asyncio.Queue()
        stream_state: Dict[str, Any] = {}

        async def _produce() -> None:
            try:
                result = await execute_chat_step({"id": "adhoc-stream"}, messages, models, max_tokens)
                stream_state["result"] = result
                text = str(result.get("output") or "")
                for i in range(0, len(text), _SSE_CHUNK_CHARS):
                    await queue.put(("delta", text[i:i + _SSE_CHUNK_CHARS]))
                await queue.put(("done", ""))
            except HTTPException as exc:
                await queue.put(("error", str(exc.detail)))
            except Exception:
                await queue.put(("error", "stream failed"))  # never echo raw provider errors

        producer = asyncio.create_task(_produce())
        _bg_tasks.add(producer)
        producer.add_done_callback(_bg_tasks.discard)

        disconnected = False
        try:
            while True:
                try:
                    kind, payload = await asyncio.wait_for(queue.get(), timeout=_SSE_HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"  # keep intermediaries from closing an idle stream
                    continue
                if kind == "delta":
                    yield f"event: delta\ndata: {json.dumps({'delta': payload})}\n\n"
                elif kind == "done":
                    result = stream_state.get("result") or {}
                    await _log_activity({
                        "event": "stream.completed",
                        "nodeId": "adhoc-stream",
                        "model": result.get("model"),
                        "cost": result.get("cost", 0.0),
                    })
                    yield (
                        "event: done\ndata: "
                        + json.dumps({
                            "model": result.get("model"),
                            "tokens": result.get("tokens", 0),
                            "cost": result.get("cost", 0.0),
                        })
                        + "\n\n"
                    )
                    break
                else:  # error
                    yield f"event: error\ndata: {json.dumps({'error': payload})}\n\n"
                    break
        except (asyncio.CancelledError, GeneratorExit):
            disconnected = True
            raise
        finally:
            if disconnected:
                # Consumer is gone; the producer still finishes so budget stays
                # accounted for (reserve/record are never dropped mid-flight).
                try:
                    await _log_activity({"event": "stream.disconnected", "nodeId": "adhoc-stream"})
                except Exception:
                    pass

    return StreamingResponse(
        _sse(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# App factory: the single seam for tests, embeddings, and alternate deployments.
# ---------------------------------------------------------------------------

def _allowed_origins() -> List[str]:
    """Explicit origins: local dev and the production deployment.

    Production calls the API same-origin through /api rewrites, so the
    production origin is belt-and-braces; no broad wildcard is needed.
    Extra origins come from ALLOWED_ORIGINS (comma-separated).
    """
    origins = ["http://localhost:3000", "http://localhost:5173", "https://otarioptm.vercel.app"]
    for raw in (os.environ.get("ALLOWED_ORIGINS") or "").split(","):
        origin = raw.strip()
        if origin and origin not in origins:
            origins.append(origin)
    return origins


# Preview deployments are scoped to the project's own Vercel team: Vercel
# preview URLs end with "-<team-slug>.vercel.app" (both the git-branch
# and deployment-hash forms), so this admits only this team's previews.
# The regex is END-ANCHORED - an unanchored pattern would also match
# attacker domains such as "https://x.vercel.app.evil.example".
# Override with ALLOWED_ORIGIN_REGEX for other setups.
_PREVIEW_ORIGIN_REGEX = r"https://.*-hitanshuser50s-projects\.vercel\.app$"


def _allow_origin_regex() -> str:
    return os.environ.get("ALLOWED_ORIGIN_REGEX") or _PREVIEW_ORIGIN_REGEX


def create_app() -> FastAPI:
    """Build a fully-wired gateway app. Module-level singletons (budget, hub,
    activity log) are shared across instances, matching the historical
    module-level ``app`` behavior."""
    application = FastAPI(title="OtariOptm Gateway", version="0.2.0")
    # Rate limiting first so it sits inside CORS (429s still get CORS headers).
    application.middleware("http")(_rate_limit_middleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_origin_regex=_allow_origin_regex(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.on_event("startup")(startup)
    application.on_event("shutdown")(shutdown)

    application.add_api_route("/api/v1/health", health, methods=["GET"])
    application.add_api_route("/api/v1/budget", budget_state, methods=["GET"])
    application.add_api_route("/api/v1/models", get_models, methods=["GET"])
    application.add_api_route("/api/v1/chat/completions", chat_completions, methods=["POST"])
    application.add_api_route("/api/v1/chat/completions/stream", chat_completions_stream, methods=["POST"])
    application.add_api_route("/api/v1/workflow/run", workflow_run, methods=["POST"])
    application.add_api_route("/api/v1/templates", list_templates, methods=["GET"])
    application.add_api_route("/api/v1/templates/{template_id}", get_template, methods=["GET"])
    application.add_api_route("/api/v1/export", export_csv, methods=["GET"])
    application.add_api_route("/api/v1/activity", activity_snapshot, methods=["GET"])
    application.add_api_websocket_route("/api/v1/activity", activity_ws)
    return application


app = create_app()
