# OtariOptm Project: Comprehensive Checklist

## Current Status (as of Nov 10, 2026)

### Done
- Project structure, config templates (`config/example.yml`), `.env.example`, docs
- Backend FastAPI gateway (`src/gateway/main.py`) served by `run_server.py` on port 8000
- Workflow engine: topological graph execution, `{{nodeId}}` template substitution, guardrails can abort runs
- Fallback chain: Otari (`OTARI_API_KEY`) → Groq free tier (`GROQ_API_KEY`) → local demo mode (zero cost)
- Budget enforcement: `BudgetManager` with atomic reserve/release/record, HTTP 402 at project cap (default $5.00)
- Model router: `src/services/router.py` cost/latency/health scoring with per-step-type weights
- Endpoints: health, budget, models, chat/completions, workflow/run, export (CSV + TOTAL row), activity (GET + WS)
- Frontend studio at `/studio` (Next.js 16 App Router, React 19, Tailwind v4, React Flow) with 4 node types: Model Chat, Web Search, Code Exec, Guardrails
- Studio UX: localStorage persistence (`otarioptm.workflow.v1`), undo/redo, keyboard shortcuts (Ctrl+Z/Y, Delete, Ctrl+S), Run Workflow, CSV export link, budget meter, live activity sidebar over WebSocket
- Landing page at `/`: complete to the design brief (dark graphite + electric lime art direction; announcement bar, split hero with live gateway status, problem/solution, pinned 5-step product demo, routing simulator, budget governance, observability with honest offline state, interactive architecture map, DX tabs, trust/limits, use cases, pricing, FAQ, CTA, footer)
- Dockerfile + docker-compose.yml for the gateway (and `web/Dockerfile` for the frontend)
- API reference at `docs/api.md`; Apache 2.0 LICENSE added

### Still TODO (human actions for submission)
- [ ] Demo video (3–5 min) recorded and hosted (YouTube/Loom)
- [ ] Feedback screen recording
- [ ] 1–2 PRs or issues opened on `mozilla-ai/otari`
- [ ] Submission form fields filled on DoraHacks
- [x] Landing page finished

### Launch prep (next 24h)
- [x] Run the full stack end-to-end (backend 8000 + frontend 3000) and run a 4-node workflow
- [ ] Record demo video: build workflow → run → budget meter → CSV export
- [ ] Record feedback recording
- [ ] Fill submission form: name, email, one-line description, GitHub link + branch, video links, Otari features used, PRs/issues

## Hackathon Submission Checklist (DoraHacks)

### Required Items
- [ ] Project name: `OtariOptm: AI workflow builder with auto-cost optimization`
- [ ] One-line description: `OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics`
- [ ] Email address: _(valid email for submissions)_
- [ ] Public GitHub repository: `github.com/gopanihitansh5-collab/otarioptm`
- [ ] First commit using Otari.ai visible in git history
- [ ] Demo video (3-5 min): Walkthrough of building & running a workflow
- [ ] Feedback screen recording: Talking-head or narration format
- [ ] Otari features used (7+ required): see `docs/features.md`: routing, budget, code exec, web search, guardrails, activity tracking, fallback/reselection
- [ ] 1-2 PRs or issues on `mozilla-ai/otari` repo
- [ ] Project uses Otari.ai (hosted gateway when `OTARI_API_KEY` is set)

### Submission Form Fields
- [ ] Project name
- [ ] Email address
- [ ] One-line description
- [ ] GitHub link + branch name
- [ ] Demo video link (YouTube/Loom)
- [ ] Feedback recording link
- [ ] Otari features checklist
- [ ] PRs/issues on Otari repo

### DoraHacks Deadline
- [ ] Nov 11th, 22:29 IST
- [ ] Submit before deadline expires

## Otari API Integration

### API Key Management
- [ ] `OTARI_API_KEY` set in `.env` (loaded from environment only, never hardcoded or committed)
- [ ] Optional: `GROQ_API_KEY` for free-tier fallback
- [ ] With neither key set, the gateway runs in demo mode (expected, not an error)

### API Usage
- [ ] Auth header from environment variable
- [ ] Model format: `provider:model`
- [ ] 402 handled: budget cap reached blocks requests
- [ ] Rate-limit handling on fallback chain (Otari → Groq → demo)

## Technical Checklist

### Backend (FastAPI): verified in code
- [x] FastAPI app with `/api/v1` prefix, CORS for localhost:3000
- [x] Budget reservation and enforcement (`src/services/budget.py`)
- [x] Workflow compiler (topological node execution in `src/gateway/main.py`)
- [x] Groq fallback handler and the Otari -> Groq -> demo chain (`src/gateway/main.py`)
- [x] Router algorithm (`src/services/router.py`)
- [x] Otari client (`src/services/otari_client.py`)
- [x] CSV export with TOTAL row (`GET /api/v1/export`)

### Frontend (Next.js): verified in code
- [x] Next.js 16 App Router, React 19, Tailwind v4
- [x] React Flow canvas with 4 node types (`web/src/components/nodes/`)
- [x] Live activity WebSocket updates (`web/src/hooks/useBudget.ts`, `ActivityFeed.tsx`)
- [x] Workflow save/load (localStorage)
- [x] Undo/Redo + keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Ctrl+S)
- [ ] Mobile-responsive design, theme toggle, loading skeletons (not built)

## Known Risks
| Risk | Impact | Mitigation |
|---|---|---|
| OTARI_API_KEY not activated | Falls through to Groq/demo | Demo mode keeps the demo running; complete otari.ai onboarding for real calls |
| Groq free-tier quota exceeded | Falls through to demo mode | Expected behavior, labeled demo |
| Budget state in-process | Resets on gateway restart | Documented limitation (MVP) |
| Code exec sandbox | Not a security boundary | MVP sandbox, documented in architecture |

## Demo Video Checklist (3-5 minutes)

### Video Structure
- [ ] 0:00-0:30: Problem statement (cost overruns, model selection friction)
- [ ] 0:30-1:15: Setup & first workflow in `/studio`
- [ ] 1:15-2:15: Build workflow live (Chat → Search → Code Exec → Guardrails)
- [ ] 2:15-2:45: Auto-routing + budget meter + live activity feed
- [ ] 2:45-3:00: Export CSV activity log + submission preview

### Video Quality
- [ ] Clear screen recording (1080p minimum)
- [ ] Narration or talking-head format
- [ ] No sensitive data displayed (mask API keys)
- [ ] Under 5 minutes; YouTube or Loom link ready
