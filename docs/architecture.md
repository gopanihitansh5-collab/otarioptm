# OtariOptm Architecture

## Layer 1: Frontend (React + TypeScript)
- **Vite** build tool
- **React Flow** for node editor
- **TanStack Query** for OTARI API caching
- **WebSocket** for live activity updates
- Deployable to Netlify/Vercel

## Layer 2: Backend (FastAPI + Python)
- Validates workflow JSON schemas
- Compiles nodes to OTARI API calls
- Streams tokens/cost back to UI
- Handles budget reservations and enforcement
- SQLAlchemy + Alembic for persistence

## Layer 3: OTARI Gateway
- Single entry point: `/api/v1/chat/completions`
- Model routing and selection
- Provider health monitoring
- Budget tracking and enforcement
- Code execution sandbox management
- Web search integration

## Data Flow

```
User UI
    │
    ▼
Frontend (React Flow)
    │
    ├───► POST /api/v1/workflows (compile nodes)
    │           │
    │           ▼
    │       FastAPI Backend
    │           │
    │           ├───► Compile to OTARI API calls
    │           │       │
    │           │       ▼
    │           │   OTARI Gateway (hosted or self-hosted)
    │           │       │
    │           │   ├───► Provider APIs (OpenAI, Anthropic, etc.)
    │           │   │
    │           │   └───► Model routing + budget enforcement
    │           │
    │           └───► WebSocket /api/v1/activity ──► UI
    │
    └───► WebSocket ──► Live cost/token updates

Provider Layer
    └───► OpenAI, Anthropic, Ollama, Together, etc.
```

## Key Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/chat/completions` | Main chat completion entry |
| `GET /api/v1/models` | Model catalog with pricing/health |
| `GET /api/v1/activity` | Real-time activity stream |
| `POST /api/v1/budgets` | Budget creation/reservation |
| `GET /api/v1/usage` | Usage metrics per key/project |
| `GET /api/v1/workflows` | Workflow management |

## Deployment Profiles

```yaml
# docker-compose.yml profiles
services:
  otari:
    profiles: [default]
  code-exec:
    profiles: [code-exec]
    depends_on: [otari]
  web-search:
    profiles: [web-search]
    depends_on: [otari]
```