<div align="center">

<img src="brand/icon.svg" alt="OtariOptm" width="72" height="72">

# OtariOptm

**Draw the workflow. The engine picks the model. The budget holds the line.**

A visual AI workflow engine with cost-aware model routing and hard budget enforcement,
built on [Otari](https://github.com/mozilla-ai/otari) (Mozilla AI) for the DoraHacks
Devs Wilding hackathon. Every step of every run is routed, priced, and accounted for
before it is spent.

[![CI](https://github.com/gopanihitansh5-collab/otarioptm/actions/workflows/ci.yml/badge.svg)](https://github.com/gopanihitansh5-collab/otarioptm/actions/workflows/ci.yml)
![tests](https://img.shields.io/badge/tests-28%20passing-brightgreen)
![python](https://img.shields.io/badge/python-3.12%2B-3776AB)
![next](https://img.shields.io/badge/Next.js-16-black)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)

[Open the studio](#-quickstart) · [API reference](docs/api.md) · [Submission checklist](docs/submission.md) · [mozilla-ai/otari](https://github.com/mozilla-ai/otari)

</div>

## 📜 What a run looks like

This is a real capture from a fresh clone with **zero API keys configured**. Two chat
nodes wired together, executed through the fallback chain: the gateway tried the Otari
hosted gateway first, got an honest provider error, and degraded to the local demo tier
at $0.00. Nothing is faked; the routing line is the router's actual score computation.

```text
$ curl -s http://localhost:8000/api/v1/health
{"status":"ok", ...}

$ curl -s -X POST http://localhost:8000/api/v1/workflow/run \
    -H "Content-Type: application/json" \
    -d '{"nodes":[{"id":"chat","type":"chat","data":{}},{"id":"polish","type":"chat","data":{}}],
         "edges":[{"source":"chat","target":"polish"}]}'
{"results":[{
  "nodeId": "chat",
  "model": "demo",
  "chain": ["otari->demo"],
  "tokens": 54, "cost": 0.0, "latencyMs": 281,
  "routing": "gpt-4o-mini: cost=1.500e-07/token, latency=600ms, health=0.19 -> score=+0.062",
  "demo": true,
  "note": "otari error: 424 ... No credential is configured for provider 'openai' -> fell back"
}]}

$ curl -s http://localhost:8000/api/v1/budget
{"cap":5.0,"spent":0.0,"reserved":0,"committed":0.0,"remaining":5.0}
```

Every step reports which model won, why it won (the routing line), what it cost, and
what the chain did when a provider was unavailable. Set `OTARI_API_KEY` or
`GROQ_API_KEY` and the same graph executes on live models with real usage-based costs;
nothing else changes.

## 🚀 Quickstart

No API keys, wallet, or GPU needed. Under two minutes, end to end.

```bash
git clone https://github.com/gopanihitansh5-collab/otarioptm.git && cd otarioptm
pip install -r requirements.txt
python run_server.py                                # gateway on http://localhost:8000

cd web && npm install && npm run dev                # web on http://localhost:3000
```

- `http://localhost:3000` : landing page
- `http://localhost:3000/studio` : the workflow editor. Add nodes, wire them, press Run.

Prefer one command?

```bash
docker compose up --build       # gateway on :8000, web on :3000
```

Keys are optional and loaded from the environment only (`OTARI_API_KEY`, `GROQ_API_KEY`,
`EXA_API_KEY`, `RESEND_API_KEY`); they are never committed and never baked into images.

## ✅ Why it exists

AI workloads leak money in three quiet ways, and every existing gateway treats them as
someone else's problem:

- **Model choice is a guess.** Most builders hardcode one model per step and never see
  the price of that habit. OtariOptm scores every candidate per step from measured cost,
  latency and health, and shows the winning score line.
- **Spend is discovered after the invoice.** Caps that check *after* the call still paid
  for the call. The BudgetManager reserves estimated cost *before* execution and answers
  HTTP 402 at the cap, so an over-budget run never starts.
- **Routing is invisible.** When a gateway silently picks a model, you cannot audit it.
  Here the routing decision is a first-class output on every step, in the API, the
  studio, and the live activity feed.
- **Demos die without keys.** Judges and new users should not need accounts to evaluate
  the stack. Zero keys configured is a supported mode, not an error path: the same
  engine, router, and budget run locally at $0.00 with every step labeled `demo`.

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph web["Browser :3000"]
        STUDIO["/studio<br/>React Flow canvas"]
        FEEDUI["Activity + budget<br/>live panels"]
    end
    subgraph gw["FastAPI gateway :8000"]
        ENGINE["Workflow engine<br/>topological + {{nodeId}}"]
        ROUTER["Router<br/>cost / latency / health"]
        BUDGET["BudgetManager<br/>atomic reserve / record"]
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

The engine is a topological executor: each node's output feeds downstream nodes through
`{{nodeId}}` templates. The router scores candidates per step type; the budget manager
reserves before it records; the chain degrades Otari to Groq to local demo. Full detail:
[docs/architecture.md](docs/architecture.md).

## 🧭 How routing decides

Every step type carries its own weights over the three normalized signals
(`src/services/router.py`):

```text
score = cost_w * cost_norm + latency_w * latency_norm - 0.20 * health_norm
```

| Step type | cost_w | latency_w | Rationale |
|---|---|---|---|
| default (chat) | 0.45 | 0.35 | cost first, latency second |
| code | 0.30 | 0.25 | health dominates: wrong answers are expensive |
| search | 0.40 | 0.45 | freshness beats pennies |

Health comes from the model catalog, stamped by a background probe with a 60s TTL
(`health_probe.source: catalog` live, `synthetic-demo` in demo mode). The winning
candidate and its score line are returned on every step, so a routing decision can be
audited, not trusted.

## 🧰 Features

| Feature | What it does |
|---|---|
| Visual studio | React Flow canvas: Model Chat, Web Search, Code Exec, Guardrails nodes |
| Templates gallery | 4 starter graphs (research, guarded chat, code review, fact check), one click to canvas |
| Workflow execution | Topological ordering; `{{nodeId}}` substitution; per-node outputs |
| Auto model routing | Weighted cost/latency/health scoring per step type, score line on every step |
| Budget enforcement | Atomic reserve/record under a lock; HTTP 402 pre-spend block at the cap (default $5.00) |
| Streaming | SSE `POST /chat/completions/stream` with deltas, heartbeats, honest error events |
| Live activity | WebSocket feed of budget snapshots and node events |
| CSV export | Full activity log with a TOTAL row via `GET /api/v1/export` |
| Run history | Past runs with cost/tokens/duration persisted locally, per-node events on click |
| Export / import | Workflow JSON download and validated import |
| Persistence + undo | localStorage graph, coalesced undo/redo, Ctrl+Z/Y, Ctrl+S, Delete, `?` shortcut dialog |
| Zero-key demo mode | Full stack runs at $0.00 with no keys; every step labeled `demo` |
| Rate limiting | Per-IP token bucket on mutating endpoints, HTTP 429 + Retry-After |

## 🔌 API

Full request/response reference with examples: [docs/api.md](docs/api.md).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Gateway health check |
| GET | `/api/v1/budget` | Current budget state |
| GET | `/api/v1/models` | Model catalog with cost/latency/health + probe stamps |
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
same gates on every push to `main`.

| Gate | Result | Reproduce |
|---|---|---|
| Backend suite | 28 passed | `python -m pytest tests -q` |
| Web typecheck | clean | `cd web && npx tsc --noEmit` |
| Web lint | 0 problems | `cd web && npm run lint` |
| Web build | all routes static | `cd web && npm run build` |
| Boot smoke | health 200 | `python run_server.py`, then `curl http://localhost:8000/api/v1/health` |

## ⚖️ Design decisions

| Why this | Over that | Reason |
|---|---|---|
| Reserve *before* execution | Check the cap after the call | A post-hoc cap still paid for the call; reserve/record under one lock means an over-budget run never starts |
| Fallback chain per step | Single provider | A dead provider is a routing event, not an outage; the chain reports what it did on every step |
| Visual canvas | YAML/JSON config workflows | Routing and budget are easier to trust when the graph itself is on screen |
| Score line on every step | Silent gateway-side routing | Unauditable routing is a trust problem, not a feature |
| Demo mode with synthetic labels | Require keys to run | Minute-to-demo beats a locked repo; every synthetic value is labeled |
| localStorage over a DB | Postgres persistence | Single-user MVP; the graph schema is JSON and portable (export/import) |

## 🗂️ Project tree

```text
src/gateway/main.py       FastAPI app: routes, SSE, WS, rate limiting, create_app() factory
src/services/router.py    cost/latency/health scoring with per-step-type weights
src/services/budget.py    BudgetManager: atomic reserve/release/record, HTTP 402
src/clients/              Otari + Groq + Exa clients with the fallback chain
config/                   config.yml (budget cap, rate limit), example.yml
tests/                    pytest suite: API, budget, router, gateway features
web/src/app/              landing, /studio, /privacy, /terms, OG image
web/src/components/       landing sections, React Flow canvas, nodes, studio panels
docs/                     api, architecture, quickstart, submission, status
.github/workflows/ci.yml  backend + web + summary jobs
Dockerfile, docker-compose.yml
```

## 🧱 Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, uvicorn, pytest |
| Workflow engine | Topological graph execution, `{{nodeId}}` template substitution |
| Routing | Normalized cost/latency/health scoring per step type, TTL health probes |
| Budget | Atomic reserve/record under a lock, HTTP 402 pre-spend block |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Studio | React Flow (`@xyflow/react`), R3F hero scene |
| Live | WebSocket + SSE, CSV export |
| CI | GitHub Actions (backend, web, summary) |

## 📚 Documentation

[API reference](docs/api.md) · [Architecture](docs/architecture.md) · [Quickstart](docs/quickstart.md) · [Features](docs/features.md) · [Status](docs/STATUS.md) · [Submission](docs/submission.md) · [Checklist](docs/checklist.md) · [Design system](MASTER.md)

## Honest limits

- **Demo mode is synthetic.** With no keys, chat output is deterministic local text
  labeled `demo` at $0.00. It proves the engine path, not model quality.
- **Code Exec is MVP-grade.** The sandbox blocks imports and caps runtime at 5s; it is
  not a security boundary.
- **Budget state is single-process.** The atomic reserve/record lock holds within one
  gateway process; horizontal scaling needs a shared store.
- **Latency numbers are catalog values.** The probe stamps health; per-model latency is
  from the catalog, not measured p50s.
- **The Otari hosted gateway can 424 in demo narratives** when no hosted provider is
  configured upstream; the fallback chain reports it honestly and continues.
- **No auth or multi-tenancy.** One project, one budget cap, per-IP rate limiting only.

Built for the DoraHacks Devs Wilding Online! hackathon (Mozilla Otari).
[Apache 2.0](LICENSE).
