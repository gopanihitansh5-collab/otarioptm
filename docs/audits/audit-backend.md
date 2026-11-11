# Backend Audit - OtariOptm Gateway (FastAPI)

Audit target: `otarioptm/src/**`, `config/*.yml`, `tests/*.py`, `run_server.py`
Date: 2026-11-11 | Mode: READ-ONLY (no files were modified)

> Audit evidence, published copy. Scope: the FastAPI gateway (`src/gateway/**`), its services, the config files and the test suite. Ran 2026-11-11, read-only. Findings, severity counts and recommended fixes are reproduced unchanged from the original audit.

Files read in full: `src/gateway/main.py` (1031 lines), `src/services/router.py` (122),
`src/services/budget.py` (130), `src/services/otari_client.py` (68), `src/services/search.py` (69),
`src/services/groq_fallback.py` (133), `config/example.yml`, `tests/test_api.py`,
`tests/test_budget.py`, `tests/test_gateway_features.py`, `tests/test_router.py`, `run_server.py`,
`requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.env` (keys present on disk, gitignored).

Findings: **4 critical, 18 major, 22 minor**, plus 12 test-gap findings and 7 dead-code findings.

---

## 0. How the system actually works

### Request lifecycle
1. `run_server.py:12` imports `src.gateway.main`. Module import side effects create the
   process-global singletons: `budget = BudgetManager()` (`main.py:37`), `hub` (`main.py:71`),
   `_limiter` (`main.py:736`), `ACTIVITY_LOG` (`main.py:43`), then `app = create_app()` (`main.py:1031`).
2. `BudgetManager.__init__` reads `OTARIOPTM_CONFIG` or the **CWD-relative** `config/config.yml`
   (`budget.py:43`); that file does not exist in the repo (only `config/example.yml`), so every
   deployment silently runs on `DEFAULT_CONFIG` (`budget.py:7-36`): cap $5.00, 10 steps, 4000 tokens.
3. Middleware stack, outermost to innermost: `CORSMiddleware` -> `_rate_limit_middleware`.
   (`add_middleware` inserts at position 0, so CORS ends up outside the limiter - correct, 429s keep CORS headers.)
4. The limiter only touches `POST/PUT/PATCH/DELETE` on `/api/v1/*` (`main.py:742`), keyed by
   `request.client.host` (`main.py:743`), token bucket capacity 30 / refill 1/s, max 10 000 IPs.
5. `startup()` (`main.py:74-89`, registered via the deprecated `on_event` at `main.py:1014`) builds
   `otari_client` and `groq_client` from env keys. **No key => demo mode forever.**
6. Routes: `GET /api/v1/{health,budget,models,templates,templates/{id},export,activity}`,
   `POST /api/v1/{chat/completions,chat/completions/stream,workflow/run}`,
   `WS  /api/v1/activity`.

### Budget lifecycle
- `reserve(est)` (`budget.py:79-98`) takes an `asyncio.Lock`, computes
  `available = cap - (spend + sum(reservations))`, refuses if `est > available`, else parks `est`
  in `reservations[rid]` and returns `(True, rid)`.
- `record(rid, actual)` (`budget.py:105-111`) pops the reservation and adds `actual` to `spend`.
  **It never re-checks the cap.**
- `release(rid)` (`budget.py:100-103`) pops the reservation without charging. Used in exactly one
  place: the provider-error fallback path (`main.py:258`).
- `snapshot()` (`budget.py:121-130`) -> cap / spent / reserved / committed / remaining,
  where `remaining = cap - committed` (spend + open reservations).
- Per chat step: `est = (prompt_chars/4) * cost_per_token + 0.05`, floored at 0.01
  (`main.py:110-117`, `main.py:214`) -> `reserve(est)` -> provider call -> `record(actual)`.
- Per web-search node: `reserve(0.01)` -> search -> `record(provider_cost)` (`main.py:578-582`).

### Routing lifecycle
- `_model_catalog()` (`main.py:470-490`): OTARI `/models` (first 24, defaults latency 999 /
  health 0.9 / cost 0.0) else `FALLBACK_CATALOG`; a free `demo` model is always appended; ids deduped.
- `_probe_model_health(catalog)` (`main.py:771-792`): 60 s TTL cache; in live mode it copies the
  catalog's own `health` field (source `catalog`), in demo mode it hashes the model id
  (source `synthetic-demo`). Values are stamped onto each model as `health` + `health_probe`.
- `select_model(candidates, remaining, "chat")` (`router.py:97-122`) calls `rank_models`
  (`router.py:57-94`), which scores `0.45*cost_norm + 0.35*lat_norm - 0.20*(health_norm - 0.5)`
  (ascending, lower = better), then returns the first candidate whose **per-token cost** "fits"
  the remaining **dollar** budget.
- The chosen id is mapped to a provider chain: otari -> groq -> demo (`main.py:225-236`); any
  provider exception falls through to the next tier (`main.py:237-257`).
- Cost recorded: provider-reported cost wins; otherwise the reservation estimate is charged **only**
  when the chain is exactly `["otari"]`; groq/demo are recorded as $0.00 (`main.py:262-266`).

### Workflow lifecycle
- `POST /api/v1/workflow/run` with `{nodes, edges}`; `len(nodes) <= workflows.max_steps` (10)
  (`main.py:544-547`). `edges` is **not** bounded.
- `_topo_order` (`main.py:317-334`) is a DFS over reverse edges (parents first).
- Node types: `guardrails` (regex PII + banned terms, may abort the run), `web-search`
  (Exa or DuckDuckGo scrape), `code-exec` (in-process `exec` sandbox), `chat` (routing path).
- Outputs are stored per node id and substituted into downstream prompts via `{{nodeId}}` /
  `{{nodeId.field}}` (`main.py:301-314`).
- Each node emits an event into the 2000-entry `ACTIVITY_LOG` and fans out over the WebSocket hub
  plus a budget snapshot (`main.py:101-107`).
- A 402 anywhere aborts the run, sets `aborted`, and fires a fire-and-forget Resend email
  (`main.py:615-620`, `main.py:419-445`). The response carries `results`, `steps`, `budget`, `aborted`.

---

## 1. CRITICAL findings

### C-1 The `code-exec` sandbox is trivially escapable -> remote code execution
**File:** `src/gateway/main.py:384-416` (`SAFE_GLOBALS` 384-396, `_run_code` 399-416)
**Severity:** critical

Blocking `__import__` does not block imports. `exec` runs with full attribute access, so
`().__class__.__bases__[0].__subclasses__()` enumerates every loaded class and yields
`subprocess.Popen` / `os._wrap_close` / `importlib` - i.e. arbitrary code execution with no
`__import__` call anywhere. `SAFE_GLOBALS` also omits `getattr`/`open`/`eval` but that is
irrelevant, because attribute access does not need builtins.

This is reachable over HTTP: `POST /api/v1/workflow/run` with a node of `type: "code-exec"`
(`main.py:591-598`). The Docker image runs as `appuser` but the process environment holds
`OTARI_API_KEY`, `GROQ_API_KEY`, `EXA_API_KEY`, `RESEND_API_KEY` (Dockerfile:29-31,
docker-compose.yml:11-14), so an escape yields credential theft plus outbound network access
(SSRF from inside the container) with no container egress restriction.

The docstring at `main.py:400` ("not a security boundary") is honest but the endpoint is still
publicly reachable, so the risk is real rather than theoretical.

**Fix:** never `exec` user code in the gateway process. Run it in a separate, network-isolated
container/process (nsjail/gVisor/Firecracker) with a hard kill timeout and a scrubbed env;
if that is not possible for the hackathon, gate the node behind an env flag (e.g.
`profiles.code-exec: false`) and restrict the endpoint to localhost.

### C-2 Unbounded request payload -> memory/CPU exhaustion
**Files:** `src/gateway/main.py:539-540`, `:546`, `:575-576`, `:592`, `:512-513`, `:908-913`
**Severity:** critical

`nodes` is capped at 10 but **`edges` is not capped at all** (`main.py:540`). Each edge is walked
by `_topo_order` (O(V*E)) and by `_gather_upstream` for every node (O(E) each), so a 100k-edge
body is a CPU bomb. `messages` in `/chat/completions` (`main.py:512`) and `/chat/completions/stream`
(`main.py:909`) are unbounded in both count and length; the node `prompt` is unbounded except for
the search branch (`main.py:576` trims only the search query); `code` is unbounded
(`main.py:592`). `max_tokens` is taken verbatim from the client (`main.py:513`, `main.py:913`)
and is never clamped to `workflows.max_tokens` (`main.py:545`), so a client can request
`max_tokens=10**9` from the paid provider.

**Fix:** add explicit limits - `len(edges) <= 4*max_steps`, prompt/message/code character caps
(4-8 kB), and `max_tokens = min(int(body["max_tokens"]), config max_tokens)`; reject with 400/413.

### C-3 Budget cap bypass: `release()` then `record()` opens an overspend window
**Files:** `src/gateway/main.py:258`, `:266`; `src/services/budget.py:100-111`
**Severity:** critical

On a provider failure the code releases the reservation (`main.py:258`) and then, after the
fallback chain completes, records the actual cost against the same id (`main.py:266`).
`release()` removes the reservation from `reservations` (`budget.py:103`), so between the two
calls the freed amount is available again. A concurrent request can reserve it, and then
`record()` adds `actual_cost` on top of the other request's reservation -> `spend + reservations`
exceeds `project_cap`. `record()` (`budget.py:105-111`) performs no cap check at all, so the cap is
a soft cap even in the single-request case (`actual > est` overspends silently).

**Fix:** never release-then-record. On fallback, call `record(rid, actual)` directly (the
reservation is popped and the actual is charged). Add a cap assertion inside `record()`:
if `spend + actual > cap`, clamp/flag the overage.

### C-4 Leaked reservations permanently shrink the budget
**Files:** `src/gateway/main.py:237-258`, `:578-582`, `:623-625`
**Severity:** critical

The reserve/record pair has no `try/finally`:
- If the fallback chain itself raises (`_demo_chat` at `main.py:246`/`:249`/`:252`/`:255`), the
  exception escapes `execute_chat_step` with the reservation still held -> `reserved` never
  decreases -> the cap is permanently reduced by `est`.
- `asyncio.CancelledError` is a `BaseException` in Python 3.8+, so `except Exception`
  (`main.py:237`) does **not** catch it: a client disconnecting mid-step, or a workflow task
  being cancelled, leaks the reservation.
- The web-search node has the same shape (`main.py:578` reserve -> `:581` search -> `:582`
  record) with no `finally`; any exception between them (including cancellation) leaks $0.01.

**Fix:** wrap the reserve -> use -> record sequence in `try/finally` and release the
reservation id in the `finally` if `record()` was not reached (track a `recorded` flag).

---

## 2. MAJOR findings

### M-1 `_model_health` divides 0-1 health by 5 (router ignores health)
**File:** `src/services/router.py:45-54` | **Severity:** major
The divisor loop tries `(5.0, 1.0, 100.0)` in that order and skips `1.0`, so any `h <= 5` is
divided by 5. Verified: `health 0.9 -> 0.18`, `1.0 -> 0.2`, `0.5 -> 0.1`, `4.5 -> 0.9`, `80 -> 0.8`.
A 0-1 health value is therefore compressed to 1/5 of its magnitude, the neutral point 0.5 is
wrong, and the health term contributes ~1/5 of its intended weight - the headline
"cheapest-healthy" routing feature barely sees health.
**Fix:** normalize by range in ascending order: `h <= 1 -> h`, `h <= 5 -> h/5`, else `h/100`.

### M-2 The affordability check compares a per-token rate to a USD budget
**Files:** `src/services/router.py:108-113`; `src/gateway/main.py:211-217` | **Severity:** major
`select_model` receives `budget.get_remaining()` (dollars) and compares it to
`_model_cost(model)` (dollars **per token**). A model at 3e-6/token always "fits" a $0.001
remaining budget, so the router happily picks a paid model; the estimate then reserves $0.05+
and `reserve()` refuses -> HTTP 402 aborts the whole workflow even though a free model
(demo/Groq) is in the catalog.
**Fix:** pass the per-step estimate into the router and compare `est <= remaining`; keep the
zero-cost rule for free tiers.

### M-3 The "out of budget -> prefer free tier" branch is dead code
**File:** `src/services/router.py:108-120` | **Severity:** major
When `budget_remaining <= 0` the loop condition degenerates to `cost <= (budget_remaining if
budget_remaining > 0 else cost)` -> `cost <= cost` -> True, so the **first ranked** model is
returned even when it is paid. The `if budget_remaining <= 0:` block at `:115-120` that was
supposed to pick a zero-cost model is unreachable.
**Fix:** handle `budget_remaining <= 0` before the loop and select only zero-cost models there.

### M-4 CORS: `https://*.vercel.app` is matched literally -> the deployed web app is blocked
**File:** `src/gateway/main.py:1005-1009` | **Severity:** major
Starlette's `is_allowed_origin` does `return origin in self.allow_origins` (exact string
membership); wildcards are only supported through `allow_origin_regex`. The browser calls the
gateway cross-origin (`web/src/lib/api.ts:10`, `NEXT_PUBLIC_GATEWAY_URL`), so every request from
the Vercel deployment is rejected by the browser with a CORS error.
**Fix:** drop the literal and use
`allow_origin_regex=r"https://[a-z0-9-]+\.vercel\.app"` (plus the localhost entries in
`allow_origins`).

### M-5 `_topo_order` silently produces a wrong order for cyclic graphs
**File:** `src/gateway/main.py:317-334` | **Severity:** major
`seen.add(nid)` happens *before* recursing into parents, so on a cycle `a -> b -> a` the order is
`['b', 'a']` - the downstream node runs first. Verified. No cycle is detected and no error is
returned, so the workflow executes in a meaningless order.
**Fix:** use Kahn's algorithm over the forward graph and return 400 with "graph contains a cycle"
when nodes remain.

### M-6 A node without `id` raises an uncaught `KeyError` -> HTTP 500
**Files:** `src/gateway/main.py:328`, `:333`, `:558` | **Severity:** major
`str(n["id"])` raises `KeyError: 'id'` (verified) and there is no global exception handler, so
the client gets a 500 with an internal traceback instead of a 400.
**Fix:** validate the body with Pydantic models (node id required, type enum) and return 422.

### M-7 The background health-probe loop never runs
**File:** `src/gateway/main.py:97-98`, `:760`, `:795-804` | **Severity:** major
`_probe_task` is declared at `:760` and cancelled in `shutdown()` (`:97-98`) but is **never
assigned** - `_health_probe_loop` is unreachable. The 60 s TTL cache is therefore only refreshed
on demand. (If the loop were ever started it would poison the cache: `:799` probes
`FALLBACK_CATALOG` only, and `_models()` at `:813-816` would then find no stamp for the live
models and silently fall back to the raw catalog health.)
**Fix:** either start the task in `startup()` and probe the live catalog, or delete the loop and
the `_probe_task` global.

### M-8 The "health probe" performs no probe
**File:** `src/gateway/main.py:764-792` | **Severity:** major
Live mode copies the catalog's own `health` field (source `catalog`); demo mode returns a hash
of the model id (`_synthetic_health`, `:764-768`, source `synthetic-demo`). A checksum of the id
is not a health signal, yet it is published in `/api/v1/models` as `health_probe` and consumed by
the router as if it were a measurement.
**Fix:** implement a real probe (e.g. a cheap completion with a timeout, or a latency ping) or
rename the field to `health_estimate` and label it `unverified` in the API response.

### M-9 Rate limiting is per-process and per-socket-IP
**Files:** `src/gateway/main.py:718-733`; `run_server.py:15` | **Severity:** major
The key is `request.client.host` (`main.py:743`). `run_server.py` starts uvicorn without
`--proxy-headers`/`--forwarded-allow-ips`, so behind any reverse proxy (or with multiple
workers) all clients collapse into one bucket -> a global 30-request burst for the whole
deployment; with N workers the effective limit is N x cap. The limiter is also purely in-memory,
so a restart resets every bucket.
**Fix:** key on a proxy-supplied client IP only when a trusted proxy is configured; otherwise
document the per-process nature and use a shared store (Redis) if the cap must be global.

### M-10 The WebSocket activity endpoint is unlimited and holds sockets forever
**Files:** `src/gateway/main.py:658-671`, `:50` | **Severity:** major
The HTTP middleware does not apply to WebSockets, so `/api/v1/activity` has no rate limit and no
connection cap. `hub._clients` (`main.py:50`) grows without bound and
`await websocket.receive_text()` (`:665`) blocks indefinitely - no idle timeout, no ping/pong
deadline. A client that opens sockets and stops reading pins server memory.
**Fix:** cap concurrent sockets, add an idle timeout / server-side ping, and drop dead sockets
aggressively in `ActivityHub.emit`.

### M-11 The SSE producer can die without a terminal event -> the client hangs forever
**Files:** `src/gateway/main.py:925-936`, `:944-949` | **Severity:** major
`_produce` catches `HTTPException` and `Exception` but not `BaseException`. If the producer task
is cancelled (or any `BaseException` escapes), nothing is ever enqueued, the consumer keeps
waiting, and the endpoint emits `: heartbeat` every 15 s indefinitely - the connection is held
open with no completion and no error.
**Fix:** wrap the producer body in `try/except BaseException` and always enqueue a terminal
(`done`/`error`) event in a `finally`.

### M-12 The SSE producer task is never cancelled on client disconnect
**Files:** `src/gateway/main.py:938-940`, `:976-983` | **Severity:** major
On disconnect the generator re-raises and only logs `stream.disconnected`; the producer task
stays in `_bg_tasks` and keeps running. The comment ("the producer still finishes so budget
stays accounted for") is not a valid reason - accounting lives in `execute_chat_step`, which
reserves and records internally (and per C-4 is itself not exception-safe).
**Fix:** cancel the producer task in the `finally` and make `execute_chat_step` responsible for
reservation cleanup.

### M-13 Provider and internal error text is returned to the client
**Files:** `src/gateway/main.py:238`, `:245`, `:257`, `:624`, `:168`;
`src/services/otari_client.py:24`, `:51` | **Severity:** major
`fallback_note = f"{primary} error: {str(exc)[:140]}"` and
`results.append({"nodeId": nid, "error": str(exc)})` echo the raw exception text into the HTTP
response. The text originates from `f"OTARI chat error: {resp.text}"` (`otari_client.py:51`) and
`f"Groq error {resp.status_code}: {resp.text[:200]}"` (`main.py:168`) - i.e. the provider's raw
response body, which may echo the prompt, internal identifiers or key fragments. `otari_client.py:24`
also puts the raw body into an `HTTPException` detail.
**Fix:** translate provider failures into opaque codes (`provider_unavailable`, `provider_402`)
and log the detail server-side only.

### M-14 The 5 s sandbox timeout is not enforced
**File:** `src/gateway/main.py:413` | **Severity:** major
`asyncio.wait_for(asyncio.to_thread(run), timeout=5.0)` cancels the *await*, but the worker thread
keeps executing forever - `while True: pass` leaks a thread per request and eventually exhausts
the thread pool, blocking the whole event loop.
**Fix:** run untrusted code in a subprocess that can be killed (`asyncio.create_subprocess_exec`
+ `kill()` on timeout).

### M-15 The `profiles` config gate is never enforced
**Files:** `config/example.yml:19-22`; `src/services/budget.py:24-28` | **Severity:** major
`profiles: {code-exec, web-search, guardrails}` is defined in the config and the defaults but is
never read anywhere in `src/`. An operator who sets `code-exec: false` still gets arbitrary code
execution on the public endpoint (C-1).
**Fix:** check `budget.config["profiles"].get(<node type>, True)` before executing each node type.

### M-16 `config/config.yml` does not exist and the config path is CWD-relative
**Files:** `src/services/budget.py:43`; `.env` (`OTARIOPTM_CONFIG=config/config.yml`);
`src/gateway/main.py:440` | **Severity:** major
Only `config/example.yml` ships. `BudgetManager` silently falls back to `DEFAULT_CONFIG`
(`budget.py:51-64`), so the configured cap/steps/tokens are never applied in Docker
(Dockerfile:23 copies `config/`, which has no `config.yml`) or locally. Meanwhile the budget
alert email instructs the user to "Raise `budget.project_cap` in config/config.yml"
(`main.py:440`) - a file that does not exist.
**Fix:** ship `config/config.yml` (or resolve the path relative to the package root and log a
loud warning/error when the configured file is missing).

### M-17 `create_app()` shares every module-level singleton -> no isolation
**Files:** `src/gateway/main.py:996-1028`, `:37`, `:43`, `:71`, `:736` | **Severity:** major
The factory creates a new `FastAPI` but reuses the global `budget`, `hub`, `ACTIVITY_LOG` and
`_limiter`. A second app instance therefore mutates the first app's budget and log, and tests
cannot isolate state (the docstring at `:997-999` acknowledges this). The "single seam for tests,
embeddings, and alternate deployments" cannot deliver per-tenant config this way.
**Fix:** move the singletons into an app-scoped `GatewayState` created inside `create_app()` and
pass it through `app.state`.

### M-18 The rate limiter's IP table eviction is arbitrary and attacker-triggerable
**File:** `src/gateway/main.py:729-731` | **Severity:** major
On overflow the limiter deletes the first `N` entries in dict insertion order, i.e. the
*oldest-inserted*, not the least-recently-used. A client that cycles 10 000 source addresses
evicts honest clients' buckets (giving them a fresh burst) and its own. Refreshing an existing
bucket does not move it in the insertion order, so the eviction order is unrelated to activity.
**Fix:** evict by last-seen timestamp (or use an LRU) and expire idle buckets.

---

## 3. MINOR findings

| # | File:line | Defect | Fix |
|---|---|---|---|
| m-1 | `router.py:110` | The affordability comparison mixes units (per-token cost vs USD budget); the `reason` string also reports a per-token rate while the real gate is a per-step estimate. | Compare estimates, report the estimate. |
| m-2 | `main.py:117`, `:214` | `_estimate_cost` adds a flat `+0.05` completion pad that dominates cheap models, and the estimate is floored at `0.01` even for free tiers. | Derive the pad from `max_tokens`; skip the reserve for zero-cost models. |
| m-3 | `main.py:525` | The unknown-model fallback concatenates `FALLBACK_CATALOG` (which already contains the `demo` entry at `:466`) with another `demo` -> duplicate rows, and `_dedupe_ids` is not applied. | Reuse `_dedupe_ids`. |
| m-4 | `main.py:524-525` | An unknown `model` silently routes to the entire catalog; the client gets a different model than requested with no signal. | Return 400 for an unknown model, or echo `requested_model` + `routed_model`. |
| m-5 | `main.py:513`, `:913` | `max_tokens` from the client is never clamped to `workflows.max_tokens` (`:545`) and `int(...)` raises `ValueError` on a non-numeric value -> 500. | Clamp and validate; return 400. |
| m-6 | `main.py:510`, `:538`, `:908` | `await request.json()` raises on a malformed body -> 500 instead of 400. | Wrap in `try/except` and return 400. |
| m-7 | `main.py:631` | `"results": [r for r in results if r.get("type") != "chat" or "nodeId" in r]` is a no-op filter (every result has `nodeId`), so `results` and `steps` are identical duplicates. | Return one field or make the filter meaningful. |
| m-8 | `main.py:301-314` | `_substitute` cannot express nested fields - `{{n1.output.sub}}` is left literal (verified) - and unknown ids are silently left as `{{nope}}` with no warning. | Widen the regex / support dotted paths and warn on unresolved refs. |
| m-9 | `main.py:603-608` | A prompt consisting only of a placeholder stays literal: `prompt_text` is non-empty *before* substitution, so the "fall back to upstream" branch never fires. | Re-check emptiness after substitution. |
| m-10 | `main.py:364-382` | The credit-card regex `\b(?:\d[ -]?){13,19}\b` false-positives on any long digit run, and `banned` terms are matched as raw substrings (a banned term of `"a"` blocks everything). | Word-boundary the digits, require a minimum banned-term length. |
| m-11 | `main.py:125-146` | `_groq_model_cache` is never invalidated; if the chosen model id is retired every call fails until the process restarts. | Cache with a TTL and retry on a 404/400 model error. |
| m-12 | `budget.py:47`, `:113`; `budget.py:18`; `otari_client.py:6` | `BudgetManager.history` and `get_spent()` are never used; `budget.per_user`, `models.default`, `models.fallback`, `otari.base_url` and `otari.auth_token` are never read (the base URL is hardcoded at `otari_client.py:6`). | Delete or implement. |
| m-13 | `main.py:688` | `export_csv` reads `budget.spend` outside the lock -> torn read. | Use `await budget.get_spent()`. |
| m-14 | `main.py:59-68` | `ActivityHub.emit` awaits `send_text` serially for every client -> one slow consumer stalls all activity events. | Fan out with `asyncio.gather` and per-client timeouts. |
| m-15 | `main.py:183` | `_demo_chat` echoes up to 220 characters of the user's prompt into the assistant reply, which then flows downstream. | Trim or omit the echo. |
| m-16 | `main.py:352-359`, `:587` | Scraped web text is injected into downstream prompts with no sanitization -> prompt injection from arbitrary pages. | Wrap as untrusted data and instruct the model to ignore embedded instructions. |
| m-17 | `main.py:29` | `Depends` is imported but never used. | Remove the import. |
| m-18 | `main.py:163` | `import re as _re` re-imports the module-level `re` inside `_groq_chat`. | Use the module-level `re`. |
| m-19 | `main.py:1014-1015` | `on_event("startup"/"shutdown")` is deprecated in FastAPI >= 0.109 (this repo pins `fastapi>=0.110`, local 0.141). | Use a `lifespan` async context manager. |
| m-20 | `main.py:19-22` | `from typing import ... Tuple` etc. are fine, but `math`/`csv`/`io` are only used in narrow paths - no defect; listed to note the import surface is larger than needed. | Optional cleanup. |
| m-21 | `main.py:214` vs `:265` | The estimate is charged only when `chain[:1] == ["otari"]`; a chain of `["otari->groq"]` records $0 even though the OTARI call may already have been billed. | Charge the estimate whenever the otari tier was attempted. |
| m-22 | `main.py:176` | `_demo_chat` derives "workflow #N" by scanning the whole 2000-entry `ACTIVITY_LOG` on every call - O(n) per chat step and a confusing counter. | Keep a counter. |

---

## 4. Test gaps

**Never exercised at all (no test touches these lines):**
1. `startup()` / `shutdown()` (`main.py:74-98`) - `test_gateway_features.py:17-24` explicitly
   avoids the lifespan ("lifespan must not run"), so `create_app()` is never validated with
   startup. Consequence: the live path (`otari_client` / `groq_client` globals) has **zero**
   coverage - every test runs in demo mode.
2. The provider-failure fallback chain `otari -> groq -> demo` (`main.py:237-257`) - untested,
   which is exactly where C-3 (release/record race) and C-4 (leak) live.
3. The 402 budget-cap path (`main.py:216-217`, `:578-580`, `:615-620`): no test ever sets a
   small cap, so `aborted`, the `workflow.blocked` event and the Resend alert are untested.
4. `_topo_order` (`main.py:317-334`) - no test for cycles, missing node ids or disconnected nodes.
5. `_substitute` (`main.py:301-314`) - no test at all.
6. The WebSocket endpoint `activity_ws` (`main.py:658-671`) - no WebSocket test; hub fan-out,
   disconnect cleanup and ping/pong are unverified.
7. `_run_code` (`main.py:399-416`) - neither the blocklist nor the escape (C-1) is tested.
8. The SSE error branch (`main.py:970-971`) and heartbeat branch (`main.py:947-949`) -
   `test_gateway_features.py:84` asserts that NO heartbeat appears, so the heartbeat code never
   executes in the suite.
9. The rate-limiter refill over time (`main.py:722`) and the MAX_IPS eviction (`main.py:729-731`).
10. `_model_health` scale normalization (`router.py:45-54`) - the /5 bug (M-1) is invisible.
11. The guardrail PII patterns - email / api_key / credit_card (`main.py:365-367`); only the
    banned-term path is covered (`test_api.py:49-71`).
12. The "provider reports a non-zero cost" branch (`main.py:262-266`) - the suite is demo-only, so
    every recorded cost is $0.00 and the accounting path is unexercised.

**Fake / misleading tests:**
13. `tests/test_router.py:6-9` uses the key `avg_latency_ms`, which the router never reads
    (`router.py:42` reads `latency` / `latency_ms`). Every model's latency falls back to 999, so
    the latency dimension of the score is never exercised and `test_rank_prefers_lower_cost`
    passes for the wrong reason.
14. `tests/test_api.py:16` asserts `body["otari"] is False`; that is true because the lifespan
    never ran, not because no key is configured. It asserts "startup did not execute", not
    "demo mode".
15. `tests/test_gateway_features.py:17-24` is the only `create_app()` test and it never enters the
    lifespan and never checks the routes, middleware or `app.state` - it asserts `app2 is not
    gw.app` plus a 200 on `/health`.
16. `tests/test_gateway_features.py:102-117` mutates the *global* limiter's capacity/refill and
    clears the shared bucket table; the suite therefore depends on execution order and on no
    other test having consumed the bucket.
17. The module-level `budget` singleton is shared across all four test files and is never reset
    between tests - spend accumulates for the whole session, so any future cost assertion will be
    order-dependent.

**Missing test hygiene:** no `conftest.py`, no fixtures for a fresh `BudgetManager` /
`GatewayState`, no `pytest-asyncio` (tests use `asyncio.run`, which is fine but forces
per-test event loops - relevant to the `asyncio.Lock` created at import time in `budget.py:48`).

---

## 5. Dead code / duplication

| Location | Item |
|---|---|
| `src/services/groq_fallback.py` (whole file, 133 lines) | Never imported anywhere. `main.py` implements its own Groq path (`_groq_chat`, `:149`). `GroqFallback`, `groq_fallback`, `init_groq_fallback`, `groq_chat`, `groq_get_models`, `groq_health` are all unreachable, and `GROQ_MODELS` pins retired ids (`mixtral-8x7b-32768`). Delete it, or make `main.py` use it. |
| `main.py:795-804` | `_health_probe_loop` is never scheduled (see M-7). |
| `main.py:760`, `:97-98` | `_probe_task` is never assigned; `shutdown()` cancels `None`. |
| `otari_client.py:54-56` | `activity_stream` raises `NotImplementedError`. |
| `otari_client.py:64-68` | `get_otari_client()` is never called (main builds the client inline). |
| `budget.py:47`, `budget.py:113` | `history` list and `get_spent()` are never used. |
| `main.py:631` | No-op filter duplicating `steps`. |
| `main.py:29`, `main.py:163` | Unused `Depends` import; redundant local `import re as _re`. |
| config | `profiles`, `budget.per_user`, `models.default`, `models.fallback`, `otari.base_url`, `otari.auth_token` are read from YAML but never used by the code. |
| `router.py:20-24` | `_norm` is used, but `select_model`'s `budget_remaining` parameter is compared against a per-token cost (M-2) - the parameter's contract is broken. |

---

## 6. Severity tally

| Severity | Count |
|---|---|
| critical | 4 |
| major | 18 |
| minor | 22 |
| test-gap findings | 12 (+5 fake/misleading) |
| dead-code findings | 7 |

## 7. Recommended order of work

1. C-1 (sandbox escape) - remove `exec` from the request path or isolate it.
2. C-3 / C-4 (budget accounting) - one `try/finally` around reserve/record, no release-then-record.
3. C-2 + M-10 + M-11 (unbounded input, WS, SSE) - input caps, connection caps, terminal-event guarantee.
4. M-4 (CORS) - one-line fix that unblocks the deployed demo.
5. M-1 / M-2 / M-3 (router) - the routing feature currently does not do what it claims.
6. M-16 + M-15 (config) - ship `config/config.yml` and enforce `profiles`.
7. M-17 (factory seam) - app-scoped state, then real lifespan tests.
