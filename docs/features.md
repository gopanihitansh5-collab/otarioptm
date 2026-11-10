# OtariOptm Features (Otari rubric)

Submission rubric requires 7+ Otari features. Each row below maps to where it lives in this repo, with a one-line proof.

**Uses Otari hosted gateway (otari.ai) when `OTARI_API_KEY` is set; graceful demo fallback otherwise.**

| # | Otari feature | Where it lives | Proof |
|---|---|---|---|
| 1 | Model routing / cost optimization | `src/services/router.py`; wired in `src/gateway/main.py` | Per-model score = 0.45·normalized cost + 0.35·normalized latency − health bonus, weights adjusted per step type; picks cheapest-healthy model per step |
| 2 | Budget enforcement | `src/services/budget.py` (`BudgetManager`) | Atomic reserve/release/record under `asyncio.Lock`; `budget.project_cap` (default $5.00) from `config/config.yml`; HTTP 402 auto-block at cap |
| 3 | Code execution | `web/src/components/nodes/NodeCodeExec.tsx`; executed by the gateway workflow runner in `src/gateway/main.py` | Code Exec node runs Python on the graph and its output feeds downstream `{{nodeId}}` substitution |
| 4 | Web search | `web/src/components/nodes/NodeWebSearch.tsx`; executed in `src/gateway/main.py` | Web Search node takes a query (optionally templated from upstream output) and feeds results downstream |
| 5 | Guardrails | `web/src/components/nodes/NodeGuardrails.tsx`; enforced in the gateway runner | Guardrails node can abort a workflow run when its rules trip |
| 6 | Activity tracking / live analytics | WS `/api/v1/activity` + `ActivityHub` in `src/gateway/main.py`; `web/src/components/ActivityFeed.tsx`, `BudgetMeter.tsx`, `web/src/hooks/useBudget.ts` | Budget snapshots and node events broadcast over WebSocket into the sidebar meter and feed in real time; snapshot also at `GET /api/v1/activity` |
| 7 | Fallback / reselection | `src/services/otari_client.py`, `src/services/groq_fallback.py`; chain in `src/gateway/main.py` | Per step: Otari → Groq free tier → deterministic demo mode, so a step always executes; router keeps the free demo tier as last-resort candidate |

Supporting capabilities (not rubric-critical, but real):

| Capability | Where | Proof |
|---|---|---|
| CSV export | `GET /api/v1/export` in `src/gateway/main.py`; link in studio | Activity log download including a TOTAL row |
| Workflow execution | `POST /api/v1/workflow/run` in `src/gateway/main.py` | Topological graph execution with `{{nodeId}}` template substitution |
| Visual studio + persistence | `web/src/components/Canvas.tsx`, `web/src/hooks/useWorkflowState.ts`, `useUndoRedo.ts`, `useKeyboardShortcuts.ts` | React Flow canvas, localStorage key `otarioptm.workflow.v1`, Ctrl+Z/Y, Delete, Ctrl+S |
| Zero-key demo mode | `src/gateway/main.py` (chain tier 3) | Full stack runs with no API keys; demo responses cost $0.00 and are labeled demo |
