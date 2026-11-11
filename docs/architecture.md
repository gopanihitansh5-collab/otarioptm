# OtariOptm Architecture

## System diagram

```
┌────────────────────────────────────────────────────────────┐
│ Browser (localhost:3000)                                   │
│  ┌──────────────────────────────┐  ┌────────────────────┐  │
│  │ /studio (React Flow editor)  │  │ / landing (WIP)    │  │
│  │  nodes: Chat/Search/Code/    │  └────────────────────┘  │
│  │  Guardrails                  │                          │
│  │  localStorage:               │                          │
│  │  otarioptm.workflow.v1       │                          │
│  └──────────┬───────────────────┘                          │
└─────────────┼──────────────────────────────────────────────┘
              │ REST (api.ts)                 │ WebSocket
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
│    score = 0.45·norm_cost + 0.35·norm_latency − health     │
│    (weights adjusted per step type; free demo tier kept    │
│     as last-resort candidate)                              │
│                                                            │
│  ActivityHub: in-process WS fan-out (budget snapshots +    │
│  node events); GET /api/v1/activity; CSV export w/ TOTAL   │
└────────────────────────────────────────────────────────────┘
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/budget` | Budget state |
| GET | `/api/v1/models` | Model catalog (cost/latency/health) |
| POST | `/api/v1/chat/completions` | Single completion through the fallback chain |
| POST | `/api/v1/workflow/run` | Execute workflow graph |
| GET | `/api/v1/export` | Activity log CSV with TOTAL row |
| GET | `/api/v1/activity` | Activity log snapshot |
| WS | `/api/v1/activity` | Live budget snapshots + node events (ping → pong) |

## Per-step flow

1. **Estimate** a cost for the step.
2. **Reserve** it atomically via `BudgetManager` (`src/services/budget.py`): reserve/release/record all run under an `asyncio.Lock`, so concurrent runs cannot overspend. At the project cap the step is rejected with HTTP 402.
3. **Call** the provider: Otari hosted gateway first, then Groq free tier, then local demo mode.
4. **Record** actual spend. If the provider doesn't report usage/cost, a conservative estimate is charged instead.

## Budget

- Cap: `budget.project_cap` in `config/config.yml` (default $5.00); if no config file is present, built-in defaults in `src/services/budget.py` (`DEFAULT_CONFIG`) apply. `config/example.yml` is the template.
- Auto-block: HTTP 402 once spend reaches the cap.
- State is in-process.

## Routing

`src/services/router.py` scores each catalog model: normalized cost (weight 0.45) + normalized latency (0.35) − health bonus, with weights adjusted per step type. The free demo tier always remains as a last-resort candidate so a workflow step can never have zero options.

## Persistence

- Workflow graphs persist in the browser via localStorage (key `otarioptm.workflow.v1`), with undo/redo and keyboard shortcuts handled client-side (`web/src/hooks/`).
- No server-side database in the MVP.

## Limitations (honest notes)

- The code-exec node is an MVP sandbox, not a security boundary. Do not run untrusted code in production.
- Budget and activity state live in the gateway process; they reset on restart. CSV export exists for that reason.
- The ActivityHub is in-process fan-out; no external message broker.
- Landing page at `/` is in progress.
