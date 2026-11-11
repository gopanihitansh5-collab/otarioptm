# OtariOptm Quickstart

Ten-minute launch guide. No API keys required: the gateway falls back to a zero-cost demo mode.

## 1. Backend (port 8000)

From the repo root:

```bash
pip install -r requirements.txt
cp .env.example .env   # Windows: copy
python run_server.py
```

- `.env` keys are optional: `OTARI_API_KEY` (Otari hosted gateway), `GROQ_API_KEY` (Groq free tier), `EXA_API_KEY` (Exa web search, with a keyless DuckDuckGo fallback). With no keys at all, the gateway runs in demo mode: deterministic local responses, cost 0, outputs labeled `demo`.
- Gateway listens on http://localhost:8000. Verify: http://localhost:8000/api/v1/health
- Configuration lives in `config/config.yml`. That file is the live config the gateway loads at startup, and every value in it matches the built-in defaults, so a clean checkout behaves exactly like a config-less run until you edit it. To point the gateway at a different file set `OTARIOPTM_CONFIG=/path/to/file.yml`. The loader merges one level deep, so a section you declare replaces that whole default section: keep every key of a section you touch. `config/example.yml` is the reference template.

## 2. Frontend (port 3000)

In a second terminal:

```bash
cd web
npm install        # if @xyflow/react is not installed yet
npm run dev
```

- Landing page: http://localhost:3000
- Studio: http://localhost:3000/studio

The frontend talks to `http://localhost:8000` by default (override with `NEXT_PUBLIC_GATEWAY_URL`).

## 3. First workflow (5 minutes)

1. Open `/studio`.
2. Drag a **Model Chat** node onto the canvas: the default prompt works as-is.
3. Drag a **Web Search** node: optional query template; downstream outputs can be injected as `{{nodeId}}` placeholders.
4. Drag a **Code Exec** node: default script is `print("hello")` style Python.
5. Drag a **Guardrails** node: it can abort the run on rule violations.
6. Connect them (Chat → Search → Code Exec, guardrails where you want an abort checkpoint).
7. Hit **Run Workflow**: the graph executes in topological order and POSTs `{nodes, edges}` to the backend.
8. Watch the sidebar: the **budget meter** updates live from WebSocket snapshots and the **activity feed** shows per-node events.
9. Click **Export CSV** to download the full activity log with a TOTAL row.

## 3b. Starter templates (30 seconds)

The studio has a **Templates** button that opens the starter gallery
(`web/src/components/studio/TemplatesPanel.tsx`). The four starters come from
the gateway:

```bash
curl http://localhost:8000/api/v1/templates
```

They are `research-then-summarize`, `guarded-chat`, `code-review` and
`web-fact-check`. Each one carries a full runnable graph, so **Load and run**
executes it immediately, including in zero-key demo mode. The same graphs are
available from the API and can be POSTed straight to the runner:

```bash
curl -s http://localhost:8000/api/v1/templates/code-review \
  | python -c "import json,sys; t=json.load(sys.stdin); print(json.dumps({'nodes': t['graph']['nodes'], 'edges': t['graph']['edges']}))" \
  | curl -s -X POST http://localhost:8000/api/v1/workflow/run \
      -H "Content-Type: application/json" --data @-
```

The studio also keeps a local copy of the same four templates, so the gallery
still works when the gateway is down.

Other studio affordances: **History** shows the last 20 runs (persisted in
localStorage under `otarioptm.runs.v1`), **Export JSON** writes the current
graph to `otarioptm-workflow.json` and **Import** reads it back after
validation, and the **Try overspend demo** button applies a clearly labeled
local demo cap so you can preview the HTTP 402 pre-spend block without
touching the real gateway cap.

Your graph is saved to localStorage (key `otarioptm.workflow.v1`) automatically. Undo/redo with Ctrl+Z / Ctrl+Y, delete selected with Delete, save with Ctrl+S.

## 4. Deploy on Vercel

The repo root carries a `vercel.json` that declares a **two-service** project: the
FastAPI gateway and the Next.js frontend are deployed as separate Vercel
services and joined by rewrites.

### The two services

| Service | Root | Framework | Entry point | What it serves |
|---|---|---|---|---|
| `app` | `.` (repo root) | `fastapi` | `api/index.py` | The gateway: every `/api/v1/...` route plus the SSE stream. `api/index.py` only fixes `sys.path` and re-exports `app` from `src/gateway/main.py`. |
| `web` | `web` | `nextjs` | Next.js App Router | The landing page at `/` and the studio at `/studio`. |

### Rewrite table

| Source | Destination service | Effect |
|---|---|---|
| `/api/(.*)` | `app` | Every gateway call goes to the FastAPI service. The browser never needs a second origin. |
| `/(.*)` | `web` | Everything else (pages, assets, Next.js routes) goes to the frontend service. |

### The service binding

The `web` service declares a binding to the `app` service:

```json
"bindings": [
  { "type": "service", "service": "app", "format": "url", "env": "GATEWAY_INTERNAL_URL" }
]
```

Vercel injects the app service's internal URL into the web service environment
as `GATEWAY_INTERNAL_URL`. The browser path does not need it: the frontend
calls the gateway through same-origin relative URLs (`/api/v1/health`,
`/api/v1/workflow/run`, ...), which the rewrite sends to the app service.

### Environment variables to set in the Vercel project

Set these in the Vercel project settings (Project -> Settings -> Environment
Variables). Every one is optional: with none of them the gateway runs in
zero-key demo mode and the app still works.

| Variable | Service | Value | Notes |
|---|---|---|---|
| `OTARI_API_KEY` | `app` | your key | Otari hosted gateway, live model routing |
| `GROQ_API_KEY` | `app` | your key | Groq free tier, fallback chain tier 2 |
| `EXA_API_KEY` | `app` | your key | Exa web search (keyless DuckDuckGo fallback) |
| `RESEND_API_KEY` | `app` | your key | Budget-cap alert email |
| `BUDGET_ALERT_EMAIL` | `app` | your inbox | Where the budget-cap alert goes |
| `ALLOWED_ORIGINS` | `app` | comma-separated origins | Extra CORS origins; the Vercel wildcard is already handled by an origin regex |
| `NEXT_PUBLIC_GATEWAY_URL` | `web` | **leave EMPTY in production** | The browser uses same-origin `/api` paths. Set it to `http://localhost:8000` only for local development. |

Note on `NEXT_PUBLIC_GATEWAY_URL`: Next.js inlines `NEXT_PUBLIC_*` at build
time, so changing it in the Vercel project requires a rebuild of the `web`
service. In production it should stay empty.

One honest wrinkle with leaving it empty: the studio client
(`web/src/lib/api.ts`) treats an empty value as "same origin", so the studio
works against the rewrite. The landing page's live-status poll
(`web/src/lib/landing/Reveal.tsx`) still falls back to
`http://localhost:8000` when the variable is unset, so on a Vercel deploy
the landing hero shows its honest "GATEWAY OFFLINE" badge rather than live
numbers. That is a real, visible limitation of the current build, not a
misconfiguration.

### Local multi-service testing

`vercel dev` runs the whole `vercel.json` project (both services and the
rewrites) on your machine:

```bash
npm i -g vercel
vercel dev
```

That gives you the production-shaped routing locally: the frontend on its port
and the gateway behind the `/api/(.*)` rewrite, with the service binding
resolved. For plain day-to-day work the two-terminal setup above (backend on
8000, frontend on 3000) is faster.

### Honest caveat: WebSockets on Vercel

Vercel's Python runtime does not support WebSocket upgrades. The live activity
socket (`WS /api/v1/activity`) therefore may not connect on a Vercel deploy.
What that means in the product:

- The gateway itself still serves the full REST API and the SSE stream
  (`POST /api/v1/chat/completions/stream`) normally.
- The studio's WebSocket client will not connect, so the live activity socket
  does not update on Vercel.
- The studio falls back to its honest offline card. It does not fabricate
  events: it says the gateway is unreachable and that nothing was executed.

Run the gateway locally (or in Docker) for the live activity feed. The
offline card is the honest state, not a hidden failure.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 402 on run | Budget cap reached | Raise `budget.project_cap` in `config/config.yml` (or use `config/example.yml` as a template; default cap is $5.00) |
| HTTP 429 on run | Per-IP rate limit tripped (30 request burst, 1 token per second refill) | Wait the number of seconds in the `Retry-After` response header, or raise `gateway.rate_limit.capacity` in `config/config.yml` |
| HTTP 400 `Workflow exceeds max_steps=10` | The graph has more nodes than `workflows.max_steps` in `config/config.yml` | Raise `workflows.max_steps` or use a smaller graph; the hard ceiling is 100 nodes and 300 edges |
| Outputs labeled `demo`, cost $0.00 | No API keys configured: this is expected demo mode | Set `OTARI_API_KEY` and/or `GROQ_API_KEY` in `.env` and restart the backend |
| `ECONNREFUSED` in the studio | Backend not started | Start `python run_server.py` first |
| Activity feed stops updating | WebSocket dropped | The client reconnects automatically; refresh the page if it stays stalled |
