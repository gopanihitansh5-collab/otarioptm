# OtariOptm Submission Checklist

## Required Items (Hackathon Rules)

| Item | Status | Notes |
|---|---|---|
| **Project name** | ✅ | `OtariOptm: AI workflow builder with auto‑cost optimization` |
| **Email address** | ✅ | _(your@email.com)_ |
| **One‑line description** | ✅ | `OtariOptm: Visual workflow engine with auto‑model routing, budget enforcement, and activity analytics` |
| **Public GitHub repo** | ☐ | `github.com/your-handle/otarioptm` (branch: `hackathon-2026-nov`) |
| **Hackathon branch** | ☐ | First commit where Otari integration begins |
| **Otari usage proof** | ☐ | Link to first commit using `otari.ai` or `otari serve` |
| **Otari features used** | ☐ | Model routing, budget, code exec, web search, guardrails, activity tracking, fallback |
| **Demo video (3‑5 min)** | ☐ | Walkthrough of building & running a workflow; cost optimization showcase |
| **Feedback screen recording** | ☐ | Talking‑head feedback on features, friction, improvements |
| **PRs/Issues on Otari repo** | ☐ | 1‑2 bug reports or feature requests (e.g., "add guardrail‑node typeahead") |

## Recommended Branch Layout

```
main          → Production-ready code
└── hackathon-2026-nov  ← Your submission branch
    ├── otari-integration/  ← First commit using Otari
    ├── src/                  ← Backend (FastAPI + nodes)
    ├── web/                  ← Frontend (React Flow + UI)
    ├── config/               ← docker-compose.yml, budgets.yml
    └── docs/                 ← Markdown docs (this repo)
```

## Otari Features Checklist for Submission

- [ ] **Model routing** – Auto‑selection via `/api/v1/models` with cost/quality ranking
- [ ] **Budget enforcement** – Per‑user/per‑project spend caps with real‑time meter
- [ ] **Code execution** – Sandboxed Python node (profile `code-exec`)
- [ ] **Web search** – Integrated `any-search`/`any-fetch` node
- [ ] **Guardrails** – Content filtering or custom regex guard
- [ ] **Activity tracking** – WebSocket `/api/v1/activity` live updates
- [ ] **Fallback/reselection** – Circuit‑breaker switching on latency spikes
- [ ] **Team sharing** – Scoped API keys with individual budgets

## Submission Template

```markdown
# Project Name
OtariOptm: AI workflow builder with auto‑cost optimization

# One‑line Description
OtariOptm: Visual workflow engine with auto‑model routing, budget enforcement, and activity analytics

# GitHub Link
https://github.com/your-handle/otarioptm

# Demo Video
[YouTube/Locally hosted 3‑5 min video]

# Feedback Recording
[Link to screen‑recording feedback]

# Otari Features Used
- Model routing
- Budget enforcement
- Code execution
- Web search
- Guardrails
- Activity tracking
- Fallback/reselection

# How to Run
1. `git clone ...`
2. `export OTARI_API_KEY="..."`
3. `uv run otari serve --config config/example.yml`
4. `cd web && npm run dev`
5. Build first workflow and record demo
```