# OtariOptm Features (Otari rubric)

Submission rubric requires 7+ Otari features. Each row below maps to where it lives in this repo, with a one-line proof.

**Uses Otari hosted gateway (otari.ai) when `OTARI_API_KEY` is set; graceful demo fallback otherwise.**

| # | Otari feature | Where it lives | Proof |
|---|---|---|---|
| 1 | Model routing / cost optimization | `src/services/router.py`; wired in `src/gateway/main.py` | Per-model score = `cost_w * cost_norm + lat_w * latency_norm + health_w * (health - 0.5)`, so cheaper + faster + healthier models win; weights per step type (chat 0.45 cost / 0.35 latency / 0.20 health, code 0.30 / 0.25 / 0.45, search 0.40 / 0.45 / 0.15) |
| 2 | Budget enforcement | `src/services/budget.py` (`BudgetManager`) | Atomic reserve/release/record under `asyncio.Lock`; `budget.project_cap` (default $5.00) from `config/config.yml`; HTTP 402 auto-block at cap before any provider call |
| 3 | Code execution | `web/src/components/nodes/NodeCodeExec.tsx`; executed by the gateway workflow runner in `src/gateway/main.py` | Code Exec node runs Python on the graph and its output feeds downstream `{{nodeId}}` substitution |
| 4 | Web search | `web/src/components/nodes/NodeWebSearch.tsx`; executed in `src/gateway/main.py` | Web Search node takes a `query` plus an optional `objective`, both handed to the search helper; results feed downstream |
| 5 | Guardrails | `web/src/components/nodes/NodeGuardrails.tsx`; enforced in the gateway runner | Guardrails node can abort a workflow run when its rules trip |
| 6 | Activity tracking / live analytics | WS `/api/v1/activity` + `ActivityHub` in `src/gateway/main.py`; `web/src/components/ActivityFeed.tsx`, `BudgetMeter.tsx`, `web/src/hooks/useBudget.ts` | Budget snapshots and node events broadcast over WebSocket into the sidebar meter and feed in real time; snapshot also at `GET /api/v1/activity` |
| 7 | Fallback / reselection | `src/services/otari_client.py`; Groq tier and the chain in `src/gateway/main.py` (`_groq_chat`, `execute_chat_step`) | Per step: Otari -> Groq free tier -> deterministic demo mode, so a step always executes; router keeps the free demo tier as last-resort candidate |

Supporting capabilities (not rubric-critical, but real):

| Capability | Where | Proof |
|---|---|---|
| SSE streaming | `POST /api/v1/chat/completions/stream` (`src/gateway/main.py:1166-1246`) | Server-Sent Events with named `delta` / `done` / `error` events and a 15s `: heartbeat` comment; budget recorded through the same step path |
| Starter templates | `GET /api/v1/templates` and `GET /api/v1/templates/{template_id}` (`src/gateway/main.py:1090-1152`) | Four runnable starters (`research-then-summarize`, `guarded-chat`, `code-review`, `web-fact-check`), each with a full `graph` that can be POSTed straight to `/api/v1/workflow/run` |
| Templates gallery in the studio | `web/src/components/studio/TemplatesPanel.tsx`, `web/src/lib/workflow/templates.ts` | Gallery loads the gateway templates and falls back to a local copy when the gateway is unreachable |
| Run history | `web/src/lib/workflow/runHistory.ts`, `web/src/components/studio/HistoryPanel.tsx` | Last 20 runs persisted in localStorage (`otarioptm.runs.v1`) with status, node count, tokens, cost and duration |
| Workflow JSON export / import | `web/src/lib/workflow/exportImport.ts`, `web/src/lib/workflow/validate.ts` | Export writes `otarioptm-workflow.json` (`{app, version, exportedAt, nodes, edges}`); import validates node ids, types, positions and edge targets before loading |
| Rate limiting | `_TokenBucketLimiter` and `_rate_limit_middleware` (`src/gateway/main.py`) | Per-IP plus per-instance global token buckets on `POST`/`PUT`/`PATCH`/`DELETE` under `/api/v1/`; HTTP 429 with a `Retry-After` header; every GET route stays exempt |
| Model health probes | `_probe_model_health` (`src/gateway/main.py:1025-1072`) | 60s TTL cache stamps `health_probe {value, source, ts}` on every catalog model; source is `catalog` with a live provider and `synthetic-demo` without one |
| 402 overdraft demo control | `web/src/components/studio/OverdraftDemo.tsx`, `web/src/lib/workflow/demoOverdraft.ts` | A local, clearly labeled DEMO CAP control in the studio that previews the HTTP 402 pre-spend block without ever touching the real gateway cap |
| CSV export | `GET /api/v1/export` in `src/gateway/main.py`; link in studio | Activity log download including a TOTAL row |
| Workflow execution | `POST /api/v1/workflow/run` in `src/gateway/main.py` | Topological graph execution with `{{nodeId}}` template substitution |
| Visual studio + persistence | `web/src/components/Canvas.tsx`, `web/src/hooks/useWorkflowState.ts`, `web/src/hooks/useUndoRedo.ts`, `web/src/hooks/useKeyboardShortcuts.ts` | React Flow canvas, localStorage key `otarioptm.workflow.v1`, Ctrl+Z/Y, Delete, Ctrl+S |
| Zero-key demo mode | `src/gateway/main.py` (chain tier 3) | Full stack runs with no API keys; demo responses cost $0.00 and are labeled demo |
| App factory | `create_app()` (`src/gateway/main.py:1263-1292`) | One seam that wires middleware, startup/shutdown and every route; used by tests and by the module-level `app` |
