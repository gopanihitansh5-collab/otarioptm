# OtariOptm Overview

OtariOptm is a visual AI workflow engine that automatically optimizes model selection, enforces budgets, and provides real-time activity analytics.

## Core Concepts

- **Workflow Composer**: Drag-and-drop nodes (model chat, web search, code exec, guardrails)
- **Auto-Routing**: Intelligent model selection based on cost, latency, and health
- **Budget Enforcement**: Per-user and per-project spending caps
- **Activity Dashboard**: Live token/cost tracking per workflow step

## Key Features

| Feature | Description |
|---|---|
| Visual Composer | React Flow-based node editor |
| Auto-Model Routing | Cost/quality optimization |
| Budget Meter | Real-time spend tracking |
| Code-Exec Node | Sandboxed Python execution |
| Web-Search Node | Live search integration |
| Guardrails Node | Content filtering |
| Activity Stream | WebSocket-driven metrics |
| Fallback/Reselection | Automatic provider switching |

## Quick Start

```bash
# 1. Clone & bootstrap
git clone https://github.com/gopanihitansh5-collab/otarioptm.git
cd otarioptm
uv sync --extra dev

# 2. Start Otari gateway
export OTARI_API_KEY="your-key-here"
uv run otari serve --config config/example.yml

# 3. Launch frontend
cd web && npm run dev

# 4. Build and run workflow
# (see web/ directory for UI)
```