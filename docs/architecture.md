# OtariOptm Architecture

## System diagram

```
┌────────────────────────────────────────────────────────────┐
│ Browser (localhost:3000)                                   │
│  ┌──────────────────────────────┐  ┌────────────────────┐  │
│  │ /studio (React Flow editor)  │  │ / landing (shipped)│  │
│  │  nodes: Chat/Search/Code/    │  └────────────────────┘  │
│  │  Guardrails                  │                          │
│  │  templates gallery, run      │                          │
│  │  history, JSON import/export │                          │
│  │  localStorage:               │                          │
│  │  otarioptm.workflow.v1       │                          │
│  └──────────┬───────────────────┘                          │
└─────────────┼──────────────────────────────────────────────┘
              │ REST (web/src/lib/api.ts)      │ WebSocket
              ▼                               ▼
┌────────────────────────────────────────────────────────────┐
│ FastAPI gateway  src/gateway/main.py  (run_server.py :8000)│
│                                                            │
│  POST /api/v1/workflow/run                                 │
│    → topological sort of {nodes, edges}                    │
│    → per step: {{nodeId}} template substitution            │
│    → guardrails node may abort the run                     │
│                                                            │
│  Per-step execution chain:                                 │
│    1. BudgetManager.reserve (atomic, asyncio.Lock)         │
│    2. Otari client (OTARI_API_KEY)      ── real usage/cost │
│       ↓ on failure / not configured                        │
│    3. Groq free tier (GROQ_API_KEY)     ── free fallback   │
│       ↓ on failure / not configured                        │
│    4. Demo mode (no keys)               ── cost 0, "demo"  │
│    5. BudgetManager.record actual spend                    │
│                                                            │
│  Model selection: src/services/router.py                   │
│    score = cost_w·norm_cost + lat_w·norm_latency           │
│            + health_w·(health - 0.5)   (health is a reward)│
│    weights per step type; free demo tier kept              │
│    as last-resort candidate                                 │
│                                                            │
│  ActivityHub: in-process WS fan-out (budget snapshots +    │
│  node events); GET /api/v1/activity; CSV export w/ TOTAL   │
└────────────────────────────────────────────────────────────┘
```

## App factory

`create_app()` (`src/gateway/main.py:1263-1292`) is the single seam for tests
and alternate deployments. It builds a `FastAPI(title="OtariOptm Gateway",
version="0.2.0")` instance, registers the middleware, the startup/shutdown
handlers and every route. The module-level `app = create_app()` at
`src/gateway/main.py:1295` is what `run_server.py` serves.

Module-level singletons (the `BudgetManager`, the `ActivityHub` and the
activity log) are shared across app instances, so calling `create_app()` twice
in one process does not create two independent budgets. That is intentional
and matches the historical module-level behavior.

Middleware order matters and is explicit in the factory: the rate-limit
middleware is registered first so it sits inside CORS, which means a `429`
still carries the CORS headers a browser client needs to read it
(`src/gateway/main.py:1268-1270`).

Startup (`src/gateway/main.py:85-100`) creates the Otari client when
`OTARI_API_KEY` is set and the Groq client when `GROQ_API_KEY` is set.
Shutdown (`src/gateway/main.py:103-109`) closes both HTTP clients and cancels
the background health-probe task.

## Endpoints

The full route table is registered in `create_app()`
(`src/gateway/main.py:1281-1291`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Health check plus budget snapshot |
| GET | `/api/v1/budget` | Budget state |
| GET | `/api/v1/models` | Model catalog (cost/latency/health, `health_probe` stamp) |
| POST | `/api/v1/chat/completions` | Single completion through the fallback chain |
| POST | `/api/v1/chat/completions/stream` | SSE completion: `event: delta` / `done` / `error`, 15s heartbeat |
| POST | `/api/v1/workflow/run` | Execute workflow graph |
| GET | `/api/v1/templates` | Starter workflow gallery (4 templates) |
| GET | `/api/v1/templates/{template_id}` | One template with its runnable `graph` |
| GET | `/api/v1/export` | Activity log CSV with TOTAL row |
| GET | `/api/v1/activity` | Activity log snapshot (last 200 events) |
| WS | `/api/v1/activity` | Live budget snapshots + node events (ping → pong) |

The HTTP `GET` and the WebSocket share the path `/api/v1/activity`; FastAPI
routes them independently and both work at the same time.

## Middleware and guards

### Per-IP rate limiting

`_TokenBucketLimiter` (`src/gateway/main.py:954-987`) is an in-memory token
bucket keyed by client IP. It is configured from `gateway.rate_limit` in
`config/config.yml` (default: enabled, capacity 30, refill 1.0 token per
second) and falls back to the built-in defaults in
`src/services/budget.py:30-36`.

`_rate_limit_middleware` (`src/gateway/main.py:995-1005`) only applies it to
`POST`, `PUT`, `PATCH` and `DELETE` requests under `/api/v1/`, so every `GET`
route (including `/api/v1/health`) stays open to dashboards and uptime probes.
When the bucket is empty the response is HTTP `429` with a `Retry-After`
header. The IP table is bounded at 10,000 entries so a flood of spoofed IPs
cannot grow memory without limit.

### Health-probe TTL cache

`_probe_model_health` (`src/gateway/main.py:1025-1046`) stamps a health value
onto every catalog entry and caches the result for `HEALTH_PROBE_TTL = 60.0`
seconds (`src/gateway/main.py:1012`). Within the TTL the cached values are
reused; after it, the cache is rebuilt.

The source of the value is labeled honestly:

- `catalog`: a live provider is configured, so the catalog-reported health is
  used (`src/gateway/main.py:1041`).
- `synthetic-demo`: no provider key is set, so the value is a deterministic
  pseudo-health in `[0.5, 1.0]` derived from the model id
  (`src/gateway/main.py:1018-1022`, `src/gateway/main.py:1043`).

Each model in `GET /api/v1/models` therefore carries a `health_probe` block
with `value`, `source` and `ts` (`src/gateway/main.py:1070`). A background
task refreshes the cache every TTL so it stays warm even between requests
(`_health_probe_loop`, `src/gateway/main.py:1049-1058`).

## Per-step flow

1. **Estimate** a cost for the step.
2. **Reserve** it atomically via `BudgetManager` (`src/services/budget.py`): reserve/release/record all run under an `asyncio.Lock`, so concurrent runs cannot overspend. At the project cap the step is rejected with HTTP 402.
3. **Call** the provider: Otari hosted gateway first, then Groq free tier, then local demo mode.
4. **Record** actual spend. If the provider doesn't report usage/cost, a conservative estimate is charged instead. A reservation is settled exactly once: `record` charges and closes it, `release` closes it without charging (`src/gateway/main.py:208-233`).

## Budget

- Cap: `budget.project_cap` in `config/config.yml` (default $5.00); if no config file is present, built-in defaults in `src/services/budget.py` (`DEFAULT_CONFIG`) apply. `config/config.yml` is the live file and `config/example.yml` is the template.
- Auto-block: HTTP 402 once spend reaches the cap, before any provider request is made.
- State is in-process.

## Routing

`src/services/router.py` scores each catalog model on a shared 0 to 1 scale:

```
score = cost_w * cost_norm + lat_w * latency_norm + health_w * (health - 0.5)
```

Lower is better. Health enters with a **positive** sign, so a healthier model
lowers the score: health is a reward, not a penalty. The health weight is the
remainder, `max(0.05, 1.0 - cost_w - lat_w)` (`src/services/router.py:131`).

| step type | cost weight | latency weight | health weight |
|---|---|---|---|
| chat (default) | 0.45 | 0.35 | 0.20 |
| code | 0.30 | 0.25 | 0.45 |
| search | 0.40 | 0.45 | 0.15 |

The gateway maps a node onto a step type before routing: `code-exec` becomes
`code`, `web-search` becomes `search`, everything else becomes `chat`
(`_routing_step_type`, `src/gateway/main.py:236-239`). Health is normalized
from any scale: a 0 to 1 value is used as-is, a 1 to 5 rating is divided by
5, a 0 to 100 percentage is divided by 100
(`_model_health`, `src/services/router.py:77-95`).

Routing is also budget aware: a candidate whose estimated per-call cost does
not fit the remaining budget is skipped, and the free demo tier is used when
no paid model is affordable (`src/services/router.py:155-206`).

## Deployment topology (Vercel services)

The root `vercel.json` declares a two-service project. The gateway and the
frontend are deployed as separate Vercel services and joined by rewrites.

| Service | Root | Framework | Entry point | Serves |
|---|---|---|---|---|
| `app` | `.` | `fastapi` | `api/index.py` | Every `/api/v1/...` route and the SSE stream. `api/index.py` re-exports `app` from `src/gateway/main.py`. |
| `web` | `web` | `nextjs` | Next.js App Router | The landing page at `/` and the studio at `/studio`. |

Rewrite split, in order:

| Source | Destination service |
|---|---|
| `/api/(.*)` | `app` (the FastAPI gateway) |
| `/(.*)` | `web` (the Next.js frontend) |

The `web` service declares a binding to the `app` service
(`{"type": "service", "service": "app", "format": "url", "env": "GATEWAY_INTERNAL_URL"}`),
so Vercel injects the app service's internal URL into the web service
environment. The browser path does not use it: the frontend calls the gateway
with same-origin relative URLs (`/api/v1/...`), which the rewrite routes to
the app service.

Caveat: Vercel's Python runtime does not support WebSocket upgrades, so the
live activity socket (`WS /api/v1/activity`) may not connect on Vercel. The
REST API and the SSE stream still work, and the studio shows its honest
offline card instead of the live feed. The full caveat and the environment
variable list live in `docs/quickstart.md` (section "Deploy on Vercel").

## Persistence

- Workflow graphs persist in the browser via localStorage (key `otarioptm.workflow.v1`), with undo/redo and keyboard shortcuts handled client-side (`web/src/hooks/`).
- Run history persists in the browser via localStorage (key `otarioptm.runs.v1`, last 20 runs, `web/src/lib/workflow/runHistory.ts:27-28`).
- No server-side database in the MVP.

## Limitations (honest notes)

- The code-exec node is an MVP sandbox, not a security boundary. Do not run untrusted code in production.
- Budget and activity state live in the gateway process; they reset on restart. CSV export exists for that reason.
- The ActivityHub is in-process fan-out; no external message broker.
- The landing page at `/` is shipped: `web/src/app/page.tsx` plus the components under `web/src/components/landing/`.
