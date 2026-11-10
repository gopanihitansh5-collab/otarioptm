# OtariOptm

**Visual AI workflow engine with cost-aware model routing and budget enforcement.**

OtariOptm lets you build AI workflows on a drag-and-drop canvas (chat, web search, code execution, guardrails), routes each step to the cheapest healthy model, enforces a hard project budget cap, and streams live cost/activity to the dashboard over WebSocket. Built on Otari (Mozilla AI) for the DoraHacks Devs Wilding — Mozilla Otari Hackathon.

## How it runs

The backend executes each chat step through a fallback chain, so the app works even with zero API keys:

1. **Otari hosted gateway** (`OTARI_API_KEY` set) — real usage and cost reporting
2. **Groq free tier** (`GROQ_API_KEY` set) — free fallback
3. **Demo mode** (no keys) — deterministic local responses at zero cost, labeled `demo`

## Stack

| Layer | Technology |
|---|---|
| Backend | Python / FastAPI (`src/gateway/main.py`), served by `run_server.py` on port 8000 |
| Workflow engine | Topological graph execution with `{{nodeId}}` template substitution |
| Budget | `BudgetManager` (`src/services/budget.py`) — atomic reserve/release/record, HTTP 402 at cap |
| Routing | `src/services/router.py` — cost/latency/health scoring, free demo tier as last resort |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Studio | React Flow (`@xyflow/react`) at `/studio` with custom nodes, localStorage persistence, undo/redo, keyboard shortcuts |
| Live updates | WebSocket `/api/v1/activity` — budget snapshots + node events |

## Quickstart

### Backend (port 8000)

```bash
pip install -r requirements.txt
cp .env.example .env            # optional keys: OTARI_API_KEY, GROQ_API_KEY (Windows: copy)
python run_server.py            # http://localhost:8000
```

API keys are optional — without them the gateway runs in demo mode (zero cost, responses labeled demo). Keys are loaded from the environment only and are never committed.

### Frontend (port 3000)

```bash
cd web
npm install        # if @xyflow/react is not installed yet
npm run dev        # http://localhost:3000
```

- `http://localhost:3000` — landing page
- `http://localhost:3000/studio` — workflow editor

### Docker

```bash
docker compose up --build       # gateway on :8000, web on :3000
```

or the gateway alone:

```bash
docker build -t otarioptm .
docker run --env-file .env -p 8000:8000 otarioptm
```

Keys stay in the environment / `.env`; nothing is baked into the images.

## Features

| Feature | Description |
|---|---|
| Visual studio | React Flow canvas with Model Chat, Web Search, Code Exec, and Guardrails nodes |
| Workflow execution | Topological ordering of the graph; outputs feed downstream via `{{nodeId}}` templates |
| Auto model routing | Per-model score from normalized cost (0.45) + normalized latency (0.35) − health bonus, weighted per step type |
| Budget enforcement | Atomic reserve/record under a lock; requests auto-block with HTTP 402 at the project cap (default $5.00) |
| Live activity | WebSocket feed of budget snapshots and node events in the sidebar |
| CSV export | Download the full activity log with a TOTAL row via `GET /api/v1/export` |
| Persistence | Workflow graph saved to localStorage (key `otarioptm.workflow.v1`), undo/redo, Ctrl+Z/Y, Delete, Ctrl+S |
| Zero-key demo mode | Deterministic local execution so the full stack runs with no API keys configured |

## API endpoints

Full request/response reference: [docs/api.md](docs/api.md).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Gateway health check |
| GET | `/api/v1/budget` | Current budget state |
| GET | `/api/v1/models` | Model catalog with cost/latency/health |
| POST | `/api/v1/chat/completions` | Single chat completion through the fallback chain |
| POST | `/api/v1/workflow/run` | Execute a workflow graph (`{nodes, edges}`) |
| GET | `/api/v1/export` | Activity log as CSV (with TOTAL row) |
| GET | `/api/v1/activity` | Activity log snapshot |
| WS | `/api/v1/activity` | Live budget snapshots + node events (ping/pong) |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the gateway, budget manager, router, and fallback chain in detail. Other docs: [quickstart](docs/quickstart.md), [features](docs/features.md), [checklist](docs/checklist.md), [MVP plan](docs/mvp-feature-plan.md).

## Configuration

- `config/config.yml` — project budget cap (`budget.project_cap`, default $5.00) and model settings; falls back to built-in defaults in `src/services/budget.py`
- `config/example.yml` — template
- `.env.example` — `OTARI_API_KEY`, `GROQ_API_KEY`, `EXA_API_KEY`, `RESEND_API_KEY`, `BUDGET_ALERT_EMAIL`, `OTARIOPTM_CONFIG`

## License

Apache 2.0 — see LICENSE.
