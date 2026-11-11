# OtariOptm Quickstart

Ten-minute launch guide. No API keys required: the gateway falls back to a zero-cost demo mode.

## 1. Backend (port 8000)

From the repo root:

```bash
pip install -r requirements.txt
cp .env.example .env   # Windows: copy
python run_server.py
```

- `.env` keys are optional: `OTARI_API_KEY` (Otari hosted gateway), `GROQ_API_KEY` (Groq free tier). With neither set, the gateway runs in demo mode: deterministic local responses, cost 0, outputs labeled `demo`.
- Gateway listens on http://localhost:8000. Verify: http://localhost:8000/api/v1/health

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

Your graph is saved to localStorage (key `otarioptm.workflow.v1`) automatically. Undo/redo with Ctrl+Z / Ctrl+Y, delete selected with Delete, save with Ctrl+S.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 402 on run | Budget cap reached | Raise `budget.project_cap` in `config/config.yml` (or use `config/example.yml` as a template; default cap is $5.00) |
| Outputs labeled `demo`, cost $0.00 | No API keys configured: this is expected demo mode | Set `OTARI_API_KEY` and/or `GROQ_API_KEY` in `.env` and restart the backend |
| `ECONNREFUSED` in the studio | Backend not started | Start `python run_server.py` first |
| Activity feed stops updating | WebSocket dropped | The client reconnects automatically; refresh the page if it stays stalled |
