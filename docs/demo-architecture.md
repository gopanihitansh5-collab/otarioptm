# Demo Architecture

## Deployment (verified 2026-11-11)

```
                      otarioptm.vercel.app  (single Vercel project)
                      +------------------------------------------+
 Browser  --------->  | Next.js app (web/)                       |
   |                  |   /          landing                     |
   |                  |   /studio    workflow studio             |
   |                  +------------------------------------------+
   |  /api/v1/*  ---> | FastAPI gateway (api/index.py -> src/)   |
   | (same origin,    |   health, models, templates, budget,     |
   |  vercel.json     |   chat/completions, workflow/run,        |
   |  rewrites)       |   activity, export                       |
   |                  +------------------------------------------+
   |
   +-- Provider tiers: Otari API -> Groq -> demo tier (no keys = demo tier)
   +-- Search: Exa (if EXA_API_KEY) -> DuckDuckGo fallback
```

Key facts that shape every demo decision:

1. **The backend is not separately hosted.** Vercel serves both services;
   `vercel.json` routes `/api/v1/*` to the Python function. There is no
   second URL to discover.
2. **Serverless constraints are first-class demo facts,** not bugs: budget
   and activity are in-memory per instance, and WebSocket cannot run on the
   Python function - `/api/v1/health` reports `runtime` and
   `activity_transport` so any client can adapt (and the studio does,
   polling `/api/v1/activity`).
3. **Zero-key operation is intentional.** With no provider credentials the
   whole stack runs in demo mode with labeled outputs and $0 costs - this is
   what makes the live demo safe and free.
4. **Local development** runs `run_server.py` on port 8000 and the Next.js
   dev server on port 3000; the dev origin is in the CORS allowlist.

## Demo data flow (studio run)

1. Studio builds the workflow JSON (template auto-loads on first visit,
   stored in localStorage after that).
2. `POST /api/v1/workflow/run` executes topologically; chat nodes go through
   the provider chain, search nodes through Exa/DuckDuckGo, code nodes
   through the sandboxed executor, guardrails validate inputs/outputs.
3. Budget is reserved per node and settled exactly-once on completion; an
   exhausted budget returns 402.
4. Activity events stream to the studio (WebSocket locally, poll on
   Vercel) and the budget meter updates from `GET /api/v1/budget`.
5. `GET /api/v1/export` downloads the run history as CSV.
