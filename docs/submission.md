# OtariOptm Submission Checklist

Hackathon: DoraHacks "Devs Wilding Online!" (Mozilla Otari). Deadline:
**Nov 11, 2026, 22:29 IST**. Submit well before the cutoff.

## Required Items (Hackathon Rules)

| Item | Status | Value |
|---|---|---|
| **Project name** | ✅ | `OtariOptm: AI workflow builder with auto-cost optimization` |
| **Email address** | ✅ | `gopanihitansh5@gmail.com` |
| **One-line description** | ✅ | `OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics` |
| **Public GitHub repo** | ✅ | https://github.com/gopanihitansh5-collab/otarioptm (branch: `main`) |
| **First commit using Otari** | ✅ | [`745cc90`](https://github.com/gopanihitansh5-collab/otarioptm/commit/745cc90cacd7b466d236aae27e8d43edd5ec2124) - OTARI client, budget service, router, FastAPI gateway |
| **Otari features used (7+)** | ✅ | see checklist below |
| **Demo video (3-5 min)** | ☐ | record with the script below (target 4:00), host on YouTube/Loom |
| **Feedback recording** | ☐ | talking-head or narrated screen recording |
| **PRs/issues on mozilla-ai/otari** | ☐ | 1-2 bug reports or feature requests |
| **DoraHacks form submitted** | ☐ | paste from the template below |

## Otari Features Checklist for Submission

- [x] **Model routing** - auto-selection per step from the catalogue served
      by `/api/v1/models`, scored
      `cost_w * cost_norm + lat_w * latency_norm + health_w * (health - 0.5)`
      with per-step weights (chat 0.45 cost / 0.35 latency / 0.20 health,
      code 0.30 / 0.25 / 0.45, search 0.40 / 0.45 / 0.15)
      (`src/services/router.py`)
- [x] **Budget enforcement** - atomic reserve/record, HTTP 402 pre-spend
      block at the project cap (`src/services/budget.py`)
- [x] **Code execution** - sandboxed Python node, imports blocked,
      5s timeout, labeled MVP-grade
- [x] **Web search** - Exa `/search` with objective + highlights,
      DuckDuckGo fallback, real cost recorded to budget
- [x] **Guardrails** - banned-term node that can abort a run
- [x] **Activity tracking** - WebSocket `/api/v1/activity` live feed +
      CSV export with totals row
- [x] **Fallback/reselection** - Otari -> Groq -> local demo chain with
      per-provider diagnostic notes

Landing with the final build (all documented in `docs/api.md`): SSE streaming
(`POST /api/v1/chat/completions/stream`), templates gallery
(`GET /api/v1/templates` + `/{id}`), per-IP rate limiting (HTTP 429),
background model-health probes, plus the studio's templates gallery, run
history, workflow JSON export/import and a clearly labeled local overspend
demo.

## Submission Template

```markdown
# Project Name
OtariOptm: AI workflow builder with auto-cost optimization

# One-line Description
OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics

# GitHub Link
https://github.com/gopanihitansh5-collab/otarioptm (branch: main)

# Demo Video
[YouTube/Loom link, 3-5 min]

# Feedback Recording
[link]

# Otari Features Used
Model routing, budget enforcement, code execution, web search, guardrails,
activity tracking, fallback/reselection

# How to Run
1. git clone https://github.com/gopanihitansh5-collab/otarioptm.git
2. pip install -r requirements.txt && python run_server.py   # gateway on :8000
3. cd web && npm install && npm run build && npm run start   # web on :3000
   (or: docker compose up --build)
4. Open http://localhost:3000/studio, load a starter from the templates
   gallery (or add nodes from scratch), Run Workflow
   API keys optional: with none set, the gateway runs the zero-cost demo
   tier (responses labeled demo).
```

## Judge Kit (30 seconds, 4 copy-paste commands)

Start the gateway (`python run_server.py`, port 8000). No API key is needed:
with none set the gateway answers from the zero-cost demo tier and labels the
output `demo`. These four commands exercise the whole product.

```bash
# 1. Health: gateway up, budget snapshot, provider tiers configured
curl -s http://localhost:8000/api/v1/health

# 2. Model catalogue: the fields the router scores on (cost, latency, health)
curl -s http://localhost:8000/api/v1/models

# 3. Starter templates: 4 runnable graphs, each with a full node/edge graph
curl -s http://localhost:8000/api/v1/templates

# 4. Run a workflow: two nodes, {{nodeId}} substitution, routing + cost
curl -s -X POST http://localhost:8000/api/v1/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"nodes":[{"id":"n1","type":"chat","data":{"prompt":"Say hello in one word."}},{"id":"n2","type":"chat","data":{"prompt":"Repeat this back: {{n1}}"}}],"edges":[{"source":"n1","target":"n2"}]}'
```

Command 4 answers with the per-step results (model chosen, routing reason,
tokens, cost, latency), the budget snapshot, and `aborted: null`. To see the
HTTP 402 pre-spend block: set `budget.project_cap: 0.005` in
`config/config.yml`, restart the gateway (the file is read at startup) and
run command 4 again. Every chat step reserves a $0.01 floor before the
provider is called, so the run is refused up front.

The API reference for every field, status code and error is `docs/api.md`.

## Demo Video Script (target 4:00, rubric window 3-5 min)

1. **0:00-0:30 - Problem.** "AI workloads leak money: every request someone
   guesses a model, and nothing stops spend before the invoice." Show the
   landing page hero and the problem section.
2. **0:30-1:05 - Templates gallery.** Open `/studio` and open the **Templates**
   panel. Four starters are listed; pick "Research then summarize" and hit
   **Load and run**. Say: "these are not screenshots, each one is a runnable
   graph served by the gateway."
3. **1:05-2:00 - Build.** In the studio, adapt the loaded graph live: add a
   Guardrails node, wire it, and show `{{nodeId}}` pulling the search result
   into the chat prompt.
4. **2:00-2:45 - Run + routing.** Press Run Workflow. Point at the activity
   feed: model chosen per step, the routing score line, and the fallback
   note when a provider is down.
5. **2:45-3:25 - Budget, including the 402 block.** Show the budget meter
   before/after the run, then `GET /api/v1/budget`. Explain the atomic
   reserve -> record flow, then trigger the **Try overspend demo** control in
   the studio: it applies a local, labeled DEMO CAP and the next run is
   refused before the provider is called (HTTP 402 pre-spend block).
6. **3:25-4:00 - Export + close.** Click Export CSV, show the totals row.
   Close on the landing observability section reading the same live
   gateway. "Every token accounted for, before it is spent."

## Remaining Human Actions

- [ ] Record demo video per script above, upload, paste link into the form
- [ ] Record feedback recording
- [ ] Open 1-2 issues/PRs on https://github.com/mozilla-ai/otari (drafts below)
- [ ] Submit the DoraHacks form before Nov 11, 22:29 IST

## Draft Issues for mozilla-ai/otari (review, then post yourself)

**Draft 1 - feature request: normalized per-request cost in responses**
> A normalized `usage.cost_usd` field (even estimated from catalogue
> prices) on every completion response would let downstream tools enforce
> budgets without maintaining their own price tables. Context: we built a
> budget-enforcing workflow gateway on Otari and currently estimate cost
> from catalogue pricing fields, which vary in shape between models.

**Draft 2 - feature request: latency + health signals in the model catalogue**
> Client-side routers need recency signals beyond ids and prices: measured
> latency percentiles and a health indicator per model. Even a coarse
> `status: ok|degraded|down` plus rolling p50 latency would make routing
> far more accurate than static tables; today clients must fall back to
> defaults when these fields are absent. Happy to share the scoring
> weights we use (0.45 cost, 0.35 latency, 0.20 health) as a reference.
