# OtariOptm

**AI‑First Cost‑Optimized Workflow Engine**

> *Auto‑route each step to the cheapest‑healthy model, enforce per‑user budgets, and surface real‑time activity analytics—all from a single Otari‑compatible API key.*

![OtariOptm Screenshot](assets/screenshot.png)

## Quick Overview

| Feature | Description |
|---|---|
| **Visual composer** | Drag‑and‑drop nodes (model chat, web search, code execution, guardrails) on a React Flow canvas. |
| **Auto‑model routing** | Queries `/api/v1/models`, ranks by cost‑per‑quality, and picks the optimal provider per step. |
| **Budget enforcement** | Real‑time budget meter; stops requests when per‑user or per‑project limits are hit. |
| **Code‑exec node** | Sandboxed Python execution (profile `code‑exec`). |
| **Web‑search node** | Integrated `any‑search` / `any‑fetch` for live queries. |
| **Guardrails node** | Content‑filtering or custom regex guards. |
| **Activity dashboard** | WebSocket‑driven live tokens/cost breakdown per node. |
| **Fallback/reselection** | Circuit‑breaker switches to secondary model on latency spikes. |
| **Team sharing** | Scoped API keys with individual project budgets; exportable CSV reports. |
| **One‑click deploy** | `docker compose up -d --profile code-exec --profile web‑search` gets the full stack running in <90 s. |

## Get Started (2 hours to MVP)

```bash
# 1️⃣ Clone & bootstrap
git clone https://github.com/your-handle/otarioptm.git
cd otarioptm
uv sync --extra dev

# 2️⃣ Start Otari gateway (hosted key)
export OTARI_API_KEY="pk-…from‑otari.ai"
uv run otari serve --config config/example.yml

# 3️⃣ Launch the frontend
cd web && npm run dev   # opens http://localhost:5173

# 4️⃣ Build your first workflow
#   – Drag “Model Chat” → set model `anthropic:claude-sonnet-4-6`
#   – Drag “Web Search” → query “latest AI funding news”
#   – Drag “Code Exec” → print summary
#   – Hit “Run”; watch live cost/tokens in the sidebar

# 5️⃣ Record a 3‑min demo, commit, and submit to DoraHacks
```

## Docs

- [Overview](docs/overview.md)
- [Features](docs/features.md)
- [Architecture](docs/architecture.md)
- [Quickstart](docs/quickstart.md)
- [Submission Checklist](docs/submission.md)

---

_License: Apache 2.0 – see LICENSE._