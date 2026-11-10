# OtariOptm: MVP Feature Plan (status)

## Shipped

| Feature | Where |
|---|---|
| FastAPI gateway on port 8000 (`run_server.py`) | `src/gateway/main.py` |
| Workflow engine: topological graph execution, `{{nodeId}}` template substitution, guardrails abort | `src/gateway/main.py` |
| Execution chain: Otari → Groq free tier → zero-cost demo mode (works with no keys) | `src/services/otari_client.py`, `src/services/groq_fallback.py` |
| Budget enforcement: atomic reserve/release/record, $5.00 default cap, HTTP 402 auto-block | `src/services/budget.py`, `config/config.yml` / `config/example.yml` |
| Auto model routing: cost 0.45 / latency 0.35 / health, per-step weights, demo tier as last resort | `src/services/router.py` |
| Endpoints: health, budget, models, chat/completions, workflow/run, export CSV (TOTAL row), activity GET + WS | `src/gateway/main.py` |
| Studio at `/studio`: React Flow canvas, 4 node types (Model Chat, Web Search, Code Exec, Guardrails) | `web/src/components/nodes/` |
| Persistence + UX: localStorage (`otarioptm.workflow.v1`), undo/redo, Ctrl+Z/Y, Delete, Ctrl+S | `web/src/hooks/` |
| Live activity: WebSocket budget snapshots + node events, budget meter, activity feed, Run Workflow, CSV export link | `web/src/components/ActivityFeed.tsx`, `BudgetMeter.tsx`, `web/src/hooks/useBudget.ts` |
| Config + env templates | `config/example.yml`, `.env.example` |

## Shipping (before the Nov 11 deadline)

| Item | Status |
|---|---|
| Landing page at `/` (dark graphite + electric lime) | In progress, parallel build |
| Demo video (3–5 min) | TODO — record |
| Feedback recording | TODO — record |
| 1–2 PRs/issues on `mozilla-ai/otari` | TODO |
| DoraHacks submission form | TODO |

## Post-hackathon (backlog, not committed)

- Server-side persistence (currently localStorage graph + in-process budget/activity state that resets on restart)
- Hardened code-exec sandbox (current MVP sandbox is not a security boundary)
- Per-user scoped API keys and team sharing
- Streaming responses to the studio UI
- Usage forecasting and historical analytics beyond CSV export
- Deployment packaging (Docker, hosted frontend)
