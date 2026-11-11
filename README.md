<div align="center">

<img src="brand/icon.svg" alt="OtariOptm" width="72" height="72">

# OtariOptm

**Draw the workflow. The engine picks the model. The budget holds the line.**

A visual AI workflow engine with cost-aware model routing and hard budget enforcement,
built on [Otari](https://github.com/mozilla-ai/otari) (Mozilla AI) for the DoraHacks
Devs Wilding hackathon. Model steps are routed with visible provider provenance and budget reservations.
Configured prices are estimates, not an independent provider invoice.

[![CI](https://github.com/gopanihitansh5-collab/otarioptm/actions/workflows/ci.yml/badge.svg)](https://github.com/gopanihitansh5-collab/otarioptm/actions/workflows/ci.yml)
![tests](https://img.shields.io/badge/tests-206%20passing-brightgreen)
![python](https://img.shields.io/badge/python-3.12%2B-3776AB)
![next](https://img.shields.io/badge/Next.js-16-black)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

[Open the studio](#-quickstart) · [API reference](docs/api.md) · [Audits](docs/audits/README.md) · [Submission checklist](docs/submission.md) · [mozilla-ai/otari](https://github.com/mozilla-ai/otari)

</div>

## 📜 Historical local demo capture

This is a real capture from this repository, gateway running locally. The hosted Otari
gateway answered `424` (no hosted provider configured upstream on the account), so the
chain degraded exactly as designed: to the local demo tier, at zero cost, with every
step labeled `demo`. The routing line is the router's own computation, not decoration.

```text
$ curl -s http://localhost:8000/api/v1/health
{"status":"ok","otari":true,"groq":false,
 "budget":{"cap":5.0,"spent":0.0,"reserved":0,"committed":0.0,"remaining":5.0,
           "overage":0.0,"overageCount":0}}

$ curl -s -X POST http://localhost:8000/api/v1/workflow/run \
    -H "Content-Type: application/json" \
    -d '{"nodes":[{"id":"chat","type":"chat","data":{"prompt":"Summarise the Otari gateway docs"}},
                  {"id":"polish","type":"chat","data":{"prompt":"Rewrite {{chat}} as two bullets"}}],
         "edges":[{"source":"chat","target":"polish"}]}'
{"results":[{
  "nodeId": "chat",
  "model": "demo",
  "chain": ["otari->demo"],
  "tokens": 68, "cost": 0.0, "latencyMs": 199,
  "routing": "gpt-4o-mini: cost=1.500e-07/token (est $0.000075/call), latency=600ms,
              health=0.95 -> fitness=+0.845 | est_call=$0.000075 <= budget=$5.000000",
  "demo": true,
  "note": "otari error 424 (HTTPException)",
  "overBudget": false
}]}

$ curl -s http://localhost:8000/api/v1/budget
{"cap":5.0,"spent":0.0,"reserved":0,"committed":0.0,"remaining":5.0}

$ curl -N -X POST http://localhost:8000/api/v1/chat/completions/stream ...
event: delta
data: {"delta": "[demo mode | node adhoc-"}
```

Set `OTARI_API_KEY` or `GROQ_API_KEY` and the same graph executes on live models with
real usage-based costs; nothing else changes. The fallback chain is visible on every
step (`chain`), the reason the router picked a candidate is on every step (`routing`),
and the money is on every step (`cost`).

## ✅ Verified live Otari execution

Captured 2026-11-11 against the production deployment (https://otarioptm.vercel.app),
default routing (no model pinned).

![Actual live Otari-only activity, formatted for readability](docs/evidence/otari-live-activity-detail-2026-11-11.png)

Screenshot: cropped detail from client-side pretty-printed **verbatim events from
the live activity response**, not a staged Studio result.
[Full formatted capture](docs/evidence/otari-live-activity-2026-11-11.png) is preserved. [Original raw screenshot](docs/evidence/otari-live-activity-raw-2026-11-11.png)
and [copyable evidence JSON](docs/evidence/otari-success-2026-11-11.json) are preserved.
The historical `free` label visible in this capture was incorrect and is now
`catalog-zero`: reported $0 does not prove zero wallet charges.

The request, the response and the gateway's own activity record:

```text
$ curl -s -X POST https://otarioptm.vercel.app/api/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Reply with exactly: otari-default-route-probe"}],
         "max_tokens":16}'
{"model":"alibaba/qwen3.8-flash",
 "choices":[{"message":{"role":"assistant","content":"otari-default-route-probe"},
             "finish_reason":"stop"}],
 "usage":{"total_tokens":108,"cost":0.0}}

$ curl -s https://otarioptm.vercel.app/api/v1/activity
{"events":[{"event":"node.completed","nodeId":"adhoc",
  "model":"alibaba/qwen3.8-flash","chain":["otari"],"tokens":108,
  "cost":0.0,"costSource":"free","latencyMs":3018,
  "routing":"preferred fast otari model (alibaba/qwen3.8-flash)",
  "ts":1794403499.116054}], ...}
```

`chain: ["otari"]` is the gateway's own per-step provenance: this request was answered
by Otari alone, with no Groq fallback. Repeated probes the same day (8 captured events)
all show the same Otari-only chain at ~2.3-3.0s.

What this does **not** claim: not every run stays on Otari (a slow or failing Otari
leg still falls back to Groq, labeled in `chain`), and `cost: 0.0` is the catalog
price Otari reports - the wallet's actual charge is tracked separately
(`costSource: "catalog-zero"` in current builds means exactly that). The app meter
excludes unreported Otari wallet charges. Provider-side organization caps are a
separate backstop; the app meter is not a strict cap on those charges.

## Task-to-workflow studio

Use **Plan a task** to describe an outcome. Three separate Groq-only stages decompose
it into a validated graph, assign catalog models to chat nodes and improve their
prompts using shared task context. Invalid output is rejected or reported as a
stage warning, never replaced by a preset. Free-tier capacity is not unlimited.

Inspect the generated prompts, queries, Python and connections, then apply the
plan to the canvas. Applying is not execution. **Run Workflow** starts execution;
real SSE node-start/node-complete events drive node status and incoming-edge motion.
**Results** shows terminal output and the full trace, with a Markdown download.
Exa search has its own balance and pricing outside the app model budget.

## 🚀 Quickstart

No API keys, wallet or GPU needed. Under two minutes, end to end.

```bash
git clone https://github.com/gopanihitansh5-collab/otarioptm.git && cd otarioptm
pip install -r requirements.txt
python run_server.py                                # gateway on http://localhost:8000

cd web && npm install && npm run dev                # web on http://localhost:3000
```

- `http://localhost:3000` : landing page
- `http://localhost:3000/studio` : the workflow editor. Add nodes, wire them, press Run.

One command for the whole stack:

```bash
docker compose up --build       # gateway on :8000, web on :3000 (Compose v2.24+)
```

Keys are optional and read from the environment only (`OTARI_API_KEY`, `GROQ_API_KEY`,
`EXA_API_KEY`, `RESEND_API_KEY`); they are never committed and never baked into images.

## ✅ Why it exists

AI workloads leak money in three quiet ways, and every existing gateway treats them as
someone else's problem:

- **Model choice is a guess.** Builders hardcode one model per step and never see the
  price of that habit. OtariOptm scores every candidate per step from cost, latency and
  health, and returns the winning score line with the result.
- **Spend is discovered after the invoice.** Caps that check *after* the call still paid
  for the call. The BudgetManager reserves estimated cost *before* execution and
  answers HTTP 402 at the cap, so an over-budget run never starts.
- **Routing is invisible.** When a gateway silently picks a model, you cannot audit it.
  Here the routing decision is a first-class output on every step, in the API, the
  studio and the live activity feed.
- **Demos die without keys.** Judges and new users should not need accounts. With no
  usable upstream the same engine, router and budget run locally at $0.00 with every
  synthetic step labeled `demo`.

## 🏗️ Architecture

<picture>
  <img src="brand/architecture.svg" alt="OtariOptm architecture diagram: the browser studio and live activity panels talk to the FastAPI gateway (workflow engine, router, budget manager, SSE stream, activity WebSocket), and every step routes through the Otari hosted gateway with Groq free tier and local demo fallbacks." width="680">
</picture>

*Local development architecture (browser on :3000, gateway on :8000, activity over
WebSocket). On the Vercel deployment the activity feed uses `GET /api/v1/activity`
snapshot polling instead of the WebSocket, and budgets/activity are per-invocation
in-memory, not durable shared state.*

<details>
<summary>Mermaid source (edit and re-render to brand/architecture.svg to update the diagram)</summary>

```mermaid
flowchart LR
    subgraph web["Browser :3000"]
        STUDIO["/studio<br/>React Flow canvas"]
        FEEDUI["Activity + budget<br/>live panels"]
    end
    subgraph gw["FastAPI gateway :8000"]
        ENGINE["Workflow engine<br/>topological + template refs"]
        ROUTER["Router<br/>cost / latency / health"]
        BUDGET["BudgetManager<br/>reserve / settle"]
        SSE["SSE stream<br/>/chat/completions/stream"]
        WS["WS /api/v1/activity"]
    end
    subgraph chain["Fallback chain per step"]
        OTARI["Otari hosted gateway"]
        GROQ["Groq free tier"]
        DEMO["Local demo, $0.00"]
    end
    STUDIO -->|"POST /workflow/run"| ENGINE
    STUDIO -->|"templates · export/import"| ENGINE
    ENGINE --> ROUTER
    ROUTER --> BUDGET
    ROUTER --> OTARI
    OTARI -.->|fallback| GROQ
    GROQ -.->|fallback| DEMO
    BUDGET -->|"snapshots + node events"| WS
    WS --> FEEDUI
    STUDIO -.-> SSE
```

</details>

The engine is a topological executor (Kahn's algorithm, cycles rejected with HTTP 400):
each node's output feeds downstream nodes through template references. The router scores
candidates per step type, the budget manager reserves before it settles, and the chain
degrades Otari to Groq to local demo. Full detail:
[docs/architecture.md](docs/architecture.md).

## 🧭 How routing decides

`src/services/router.py` scores every candidate for the step type. Higher fitness wins:

```text
fitness = cost_w * (1 - cost_norm)
        + lat_w  * (1 - latency_norm)
        + health_w * 0.5 * (health - 0.5)
```

`cost_norm` and `latency_norm` are 0 for the best and 1 for the worst candidate, so
cheap and fast raise the score; health is a **reward**, so a healthy model raises it too.
The health weight is derived from the step type, so a step that must be correct pays
more for health than a step that must be cheap:

| Step type | cost_w | latency_w | health_w | Rationale |
|---|---|---|---|---|
| chat (default) | 0.45 | 0.35 | 0.20 | cost first, latency second |
| code | 0.30 | 0.25 | 0.45 | health dominates: wrong answers are expensive |
| search | 0.40 | 0.45 | 0.15 | freshness beats pennies |

Selection is budget-aware: the estimated cost of one call (`per-token cost x token
estimate`, the model's own `max_tokens` hint wins, default 500 tokens) is compared with
the remaining budget, and a zero-cost tier wins whenever no paid model fits. The same
estimate is used by the budget reservation, so the router never picks a model that
reserve then rejects. Health comes from the catalog stamped by a background probe with
a 60s TTL (`health_probe.source`: `catalog` live, `synthetic-demo` in demo mode).

## 🧰 Features

| Feature | What it does |
|---|---|
| Visual studio | React Flow canvas: Model Chat, Web Search, Code Exec, Guardrails nodes |
| Templates gallery | 4 starter graphs (research, guarded chat, code review, fact check), one click to canvas, one click to run |
| Workflow execution | Topological ordering, template references, per-node outputs, cycles rejected |
| Auto model routing | Per-step-type fitness scoring, budget-aware selection, score line on every step |
| Budget enforcement | Reserve before spend, settle exactly once, HTTP 402 pre-spend block at the cap (default $5.00) |
| 402 overdraft demo | A labeled client-side demo cap that shows the blocked path without touching the real cap |
| Per-node cost badges | Real cost on every executed node, red for blocked or failed |
| Streaming | SSE `POST /chat/completions/stream` with named events, heartbeats and honest error events |
| Live activity | WebSocket feed of budget snapshots and node events, pings filtered out |
| CSV export | Full activity log with a TOTAL row via `GET /api/v1/export` |
| Run history | Past runs with cost, tokens and duration, persisted locally, honest `blocked` status |
| Export / import | Workflow JSON download and validated import |
| Persistence + undo | localStorage graph with a validated snapshot and a v1 to v2 migration, undo/redo, Ctrl+Z/Y, Ctrl+S, Delete, `?` shortcut dialog |
| Mobile editing | Palette and inspector become drawers below 768px, focus trapped, keyboard reachable |
| Zero-key demo mode | Full stack runs at $0.00 with no usable upstream; every step labeled `demo` |
| Rate limiting | Per-IP token bucket on mutating endpoints, HTTP 429 + Retry-After, `/health` exempt |
| Input limits | Nodes, edges, prompts, code and `max_tokens` are capped with HTTP 400, never a 500 |

## 🔌 API

Full request/response reference with examples: [docs/api.md](docs/api.md).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Gateway health check |
| GET | `/api/v1/budget` | Current budget state |
| GET | `/api/v1/models` | Model catalog with cost, latency, health and probe stamps |
| POST | `/api/v1/chat/completions` | Single chat completion through the fallback chain |
| POST | `/api/v1/chat/completions/stream` | Same completion as an SSE token stream |
| POST | `/api/v1/workflow/run` | Execute a workflow graph (`{nodes, edges}`) |
| GET | `/api/v1/templates` | Starter workflow templates |
| GET | `/api/v1/templates/{id}` | One template's full `{nodes, edges}` graph |
| GET | `/api/v1/export` | Activity log as CSV (with TOTAL row) |
| GET | `/api/v1/activity` | Activity log snapshot |
| WS | `/api/v1/activity` | Live budget snapshots + node events (ping/pong) |

## 🧪 Tests and verification

Measured on this machine, 2026-11-11 (Python 3.14, Node 22.14, Windows 11). CI runs the
same gates on every push to `main`, with zero secrets.

| Gate | Result | Reproduce |
|---|---|---|
| Backend suite | 87 passed | `python -m pytest tests -q` |
| Web typecheck | clean | `cd web && npx tsc --noEmit` |
| Web lint | 0 problems | `cd web && npm run lint` |
| Web build | all routes static | `cd web && npm run build` |
| Boot smoke | health 200, templates 200 | `python run_server.py`, then curl the endpoints |
| Config truth | config matches code defaults | CI step comparing `config/config.yml` to `DEFAULT_CONFIG` |

Three independent audits (backend, frontend, integration) were run against this
codebase and their findings fixed in the same session. The reports are published, not
hidden: [docs/audits/README.md](docs/audits/README.md). Among them: an escapable code
exec sandbox, a budget that could double count on the provider error path, unbounded
inputs, a health signal that was mis-scaled and sign-flipped (which made the routing
claim false), a CORS pattern that blocked every deploy, and a live counter that froze
on the landing page.

## 🚀 Deployment (Vercel services)

`vercel.json` deploys both halves as one project with two services:

| Service | Root | Framework | Public on |
|---|---|---|---|
| `app` | `.` (entrypoint `api/index.py`) | FastAPI | `/api/(.*)` |
| `web` | `web` | Next.js 16 | everything else |

The web service declares a binding to the app service
(`{"type":"service","service":"app","format":"url","env":"GATEWAY_INTERNAL_URL"}`), and
the browser calls the gateway through same-origin `/api/v1/...` paths, so no absolute
gateway URL is needed at build time. Set the provider keys in the Vercel project
(`OTARI_API_KEY`, `GROQ_API_KEY`, `EXA_API_KEY`, `RESEND_API_KEY`), plus
`ALLOWED_ORIGINS` for extra CORS origins. `vercel dev` runs both services locally.
Details: [docs/quickstart.md](docs/quickstart.md#deploy-on-vercel).

## ⚖️ Design decisions

| Why this | Over that | Reason |
|---|---|---|
| Reserve *before* execution | Check the cap after the call | A post-hoc cap still paid for the call; reserve and settle under one lock mean an over-budget run never starts |
| Settle exactly once | Record, then release | A released reservation can be re-claimed while the spend is recorded: the cap can be overshot |
| Fallback chain per step | Single provider | A dead provider is a routing event, not an outage; the chain reports what it did on every step |
| Visual canvas | YAML or JSON config workflows | Routing and budget are easier to trust when the graph itself is on screen |
| Score line on every step | Silent gateway-side routing | Unauditable routing is a trust problem, not a feature |
| Demo mode with synthetic labels | Require keys to run | Minute-to-demo beats a locked repo; every synthetic value is labeled `demo` |
| localStorage over a database | Postgres persistence | Single-user MVP; the graph schema is JSON and portable (export and import) |
| AST validation for code exec | A sandbox boundary claim | The exec node is in-process and MVP-grade; the AST check closes the known escape classes and the docs say what it is |

## 🗂️ Project tree

```text
src/gateway/main.py       FastAPI app: routes, SSE, WS, rate limiting, create_app() factory
src/services/router.py    fitness scoring per step type, budget-aware selection
src/services/budget.py    BudgetManager: reserve, settle, release, cap enforcement
src/services/otari_client.py  Otari hosted gateway client
src/services/search.py    web search client (Exa + fallback)
config/config.yml         live config (budget cap, rate limit) + config/example.yml
tests/                    pytest suite: API, budget, router, gateway features (206 tests)
web/src/app/              landing, /studio, /privacy, /terms, OG image, icon
web/src/components/       landing sections, React Flow canvas, nodes, studio panels
web/src/lib/              api client, workflow validation, snapshots, templates
docs/                     api, architecture, quickstart, submission, status, audits/
api/index.py              Vercel entrypoint for the gateway service
.opencode/                agent kit: 8 agents, 2 skills, 1 command (see AGENTS.md)
vercel.json               multi-service deployment (app + web)
```

## 🧱 Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, uvicorn, pytest |
| Workflow engine | Topological execution (Kahn), template references, cycle detection |
| Routing | Fitness scoring per step type, TTL health probes, budget-aware selection |
| Budget | Reserve and settle under a lock, HTTP 402 pre-spend block |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Studio | React Flow (`@xyflow/react`), R3F hero scene |
| Live | WebSocket + SSE, CSV export |
| Delivery | GitHub Actions (backend, web, summary), Docker, Vercel services |

## 👥 Agent kit

The repository ships its own operating kit under `.opencode/`: eight specialist agents
(`backend`, `frontend`, `qa`, `docs`, `security-reviewer`, `architect`, `explore`,
`orchestrator`), two skills (`parallel-engineering`, `otarioptm-context`) and a
`/parallel` command. [AGENTS.md](AGENTS.md) is the operating contract:
[docs/TEAM-KIT-INSTALL.md](docs/TEAM-KIT-INSTALL.md).

## 📚 Documentation

[API reference](docs/api.md) · [Architecture](docs/architecture.md) · [Quickstart](docs/quickstart.md) · [Features](docs/features.md) · [Status](docs/STATUS.md) · [Submission](docs/submission.md) · [Run evidence](docs/evidence/README.md) · [Audits](docs/audits/README.md) · [Design system](MASTER.md)

## Honest limits

- **Demo mode is synthetic.** With no usable upstream, chat output is deterministic
  local text labeled `demo` at $0.00. It proves the engine path, not model quality.
- **The routing line names the chosen candidate.** When the chain falls back, the
  `chain` field discloses the provider that actually served the request.
- **Code Exec depends on its backend.** Production uses Vercel Sandbox microVMs with
  network egress denied and a bounded execution timeout. Hobby quota or resource
  failures stop execution; there is no deployed in-process fallback. Local development
  can use the older MVP executor and must not be treated as the same boundary.
- **Budget bounds are conditional.** Production uses a shared Redis ledger. Reservations
  depend on configured prices, prompt/output bounds and provider reporting; hidden
  usage or catalog-zero wallet charges are not an unconditional spending guarantee.
  The app model budget is separate from Otari wallets and Exa credits.
- **Latency figures are catalog values.** The probe stamps health; per-model latency
  comes from the catalog, not measured percentiles.
- **WebSockets may not connect on Vercel.** Vercel's Python runtime does not upgrade
  WebSocket connections, so on a Vercel deploy the live activity socket may fall back
  to snapshot polling, labeled POLLING. The REST API and SSE still work.
- **No auth or multi-tenancy.** One project, one budget cap, per-IP rate limiting only.

Built for the DoraHacks Devs Wilding Online! hackathon (Mozilla Otari).
[Apache 2.0](LICENSE).
