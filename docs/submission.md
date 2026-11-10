# OtariOptm Submission Checklist

Hackathon: DoraHacks "Devs Wilding Online!" (Mozilla Otari). Deadline:
**Nov 11, 2026, 11:59 PM (UTC+5:30)**.

## Required Items (Hackathon Rules)

| Item | Status | Value |
|---|---|---|
| **Project name** | ✅ | `OtariOptm: AI workflow builder with auto-cost optimization` |
| **Email address** | ✅ | `gopanihitansh5@gmail.com` |
| **One-line description** | ✅ | `OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics` |
| **Public GitHub repo** | ✅ | https://github.com/gopanihitansh5-collab/otarioptm (branch: `hackathon-2026-nov`) |
| **First commit using Otari** | ✅ | [`745cc90`](https://github.com/gopanihitansh5-collab/otarioptm/commit/745cc90cacd7b466d236aae27e8d43edd5ec2124) - OTARI client, budget service, router, FastAPI gateway |
| **Otari features used (7+)** | ✅ | see checklist below |
| **Demo video (3-5 min)** | ☐ | record with the script below, host on YouTube/Loom |
| **Feedback recording** | ☐ | talking-head or narrated screen recording |
| **PRs/issues on mozilla-ai/otari** | ☐ | 1-2 bug reports or feature requests |
| **DoraHacks form submitted** | ☐ | paste from the template below |

## Otari Features Checklist for Submission

- [x] **Model routing** - auto-selection via `/api/v1/models`, scored
      0.45 cost + 0.35 latency - 0.20 health (`src/services/router.py`)
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

## Submission Template

```markdown
# Project Name
OtariOptm: AI workflow builder with auto-cost optimization

# One-line Description
OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics

# GitHub Link
https://github.com/gopanihitansh5-collab/otarioptm (branch: hackathon-2026-nov)

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
4. Open http://localhost:3000/studio, add nodes, Run Workflow
   API keys optional: with none set, the gateway runs the zero-cost demo tier.
```

## Demo Video Script (3-5 min)

1. **0:00-0:30 - Problem.** "AI workloads leak money: every request someone
   guesses a model, and nothing stops spend before the invoice." Show the
   landing page hero and the problem section.
2. **0:30-1:30 - Build.** Open `/studio`. Add a Web Search node, a Model
   Chat node, a Guardrails node; wire them; type a prompt that uses
   `{{nodeId}}` to pull the search result into the chat step.
3. **1:30-2:30 - Run + routing.** Press Run Workflow. Point at the activity
   feed: model chosen per step, the routing score line, and the fallback
   note when a provider is down.
4. **2:30-3:30 - Budget.** Show the budget meter before/after the run, then
   `GET /api/v1/budget`. Mention the atomic reserve -> record flow and the
   HTTP 402 pre-spend block (config: `budget.project_cap`).
5. **3:30-4:30 - Export + close.** Click Export CSV, show the totals row.
   Close on the landing observability section reading the same live
   gateway. "Every token accounted for, before it is spent."

## Remaining Human Actions

- [ ] Record demo video per script above, upload, paste link into the form
- [ ] Record feedback recording
- [ ] Open 1-2 issues/PRs on https://github.com/mozilla-ai/otari
- [ ] Submit the DoraHacks form before Nov 11, 11:59 PM IST
