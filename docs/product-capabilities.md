# OtariOptm Product Capabilities

Evidence-based feature inventory for the demo engineering pack. Classification
legend: **Verified** (exercised live on production or in the full local test
suite), **Unverified** (implemented, not exercised end-to-end), **Partial**
(works with a documented limitation), **Missing** (not implemented),
**Broken** (implemented, fails).

Verified on production `https://otarioptm.vercel.app` on 2026-11-11 by
independent QA, and against `main` (87 -> 104 pytest) the same day.

## Workflow engine

| Feature | Status | Evidence |
| --- | --- | --- |
| Visual studio (React Flow canvas, add/remove nodes, undo/redo, import/export JSON) | Verified | Studio loads and renders; canvas controls present |
| Template auto-load on first visit ("Research then summarize") | Verified | Fresh profile (cleared localStorage) auto-loads the 2-node template |
| 4 starter templates, Load / Load-and-run | Verified | Templates panel lists all four; load-and-run executed live |
| Topological workflow execution (chat, web-search, code-exec, guardrails) | Verified | `/api/v1/workflow/run` executed a 2-node run live; 87-test suite covers cycle/malformed rejection |
| Web search node (DuckDuckGo fallback) | Verified | Live run returned real search result text |
| Demo mode (zero-key deterministic responses, clearly labeled) | Verified | `[demo mode ...]` labeled answer in live run; $0.0000 cost |
| Budget meter + activity feed in studio | Verified | $5.0000 remaining shown; WORKFLOW.STARTED/NODE.COMPLETED/FINISHED events |
| CSV export | Verified | `GET /api/v1/export` returns 200 text/csv |
| Model fallback chain (Otari -> Groq -> demo) | Unverified live | Unit-tested locally; no OTARI_API_KEY/GROQ_API_KEY configured in production, so only the demo tier is exercised |
| Exa-backed search | Unverified | Code path exists; no EXA_API_KEY configured |
| SSE chat streaming | Unverified live | Verified locally by integrator; not exercised against production |
| Budget alert email (Resend) | Unverified | Code path exists; no RESEND_API_KEY configured |

## Backend / API

| Feature | Status | Evidence |
| --- | --- | --- |
| FastAPI gateway on Vercel (multi-service via vercel.json, same-origin `/api` rewrites) | Verified | `/api/v1/health` 200 in production |
| Runtime/transport labels (`runtime`, `activity_transport`) | Verified | Health returns `vercel-serverless` / `poll` |
| Budget reserve/settle exactly-once, cap 402 | Verified | Unit tests; TRY OVERSPEND DEMO control present in studio |
| Rate limiting (429 + Retry-After) | Verified | Unit tests incl. Vercel x-forwarded-for keying |
| Payload caps and bounded body reads (413) | Verified | Unit tests |
| CORS (localhost dev + production origin + team-scoped previews) | Verified | Unit tests |
| Activity WebSocket | Partial | Works locally; not available on Vercel serverless - the supported live transport there is polling `GET /api/v1/activity` (labeled in the API) |
| Durable budget/activity history | Partial | In-memory; on serverless it resets per instance/invocation. No cross-instance persistence |
| Health probe of models | Partial | Deterministic synthetic-demo / catalog-labeled values; no real probe tier |

## Product surface

| Feature | Status | Evidence |
| --- | --- | --- |
| Landing page (problem -> intelligence -> demo -> credibility story) | Verified | Renders; demo/illustrative content labeled |
| Honesty labeling (DEMO / ILLUSTRATIVE, no fake pricing/testimonials/uptime) | Verified | QA scan of production landing |
| Authentication / user accounts | Missing | No auth anywhere; studio is open |
| Per-user budgets | Missing (documented) | `budget.per_user` config key exists, marked "reserved, not enforced yet" |
| API key generation / self-serve onboarding | Missing | No such endpoints |
| Kinetic/editorial motion layer | Partial | In active development on separate branches at time of writing |
