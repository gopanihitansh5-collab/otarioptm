# OtariOptm Submission Checklist

Hackathon: DoraHacks "Devs Wilding Online!" (Mozilla Otari). Deadline:
**Conservative cutoff: Nov 11, 2026, 22:29 IST.** The official page also
shows an extended time, Nov 12 at 10:29 IST; do not rely on that buffer.
[Official event](https://dorahacks.io/hackathon/mozilla-devs-wilding/detail).
This is a preparation draft, not a submitted entry.

## Required Items (Hackathon Rules)

| Item | Status | Value |
|---|---|---|
| **Project name** | ✅ | `OtariOptm: AI workflow builder with auto-cost optimization` |
| **Email address** | ✅ | `gopanihitansh5@gmail.com` |
| **One-line description** | ✅ | `Visual AI workflows with Otari-first chat, explicit fallback traces, and inspectable cost-only results` |
| **Public GitHub repo** | ✅ | https://github.com/gopanihitansh5-collab/otarioptm (branch: `main`) |
| **First commit using Otari** | ✅ | [`745cc90`](https://github.com/gopanihitansh5-collab/otarioptm/commit/745cc90cacd7b466d236aae27e8d43edd5ec2124) - OTARI client, budget service, router, FastAPI gateway |
| **Otari features used** | ✅ | see the honest map below (Otari-native vs app-side) |
| **Demo video (3-5 min)** | ☐ | participant-voice recording in progress; final link pending |
| **Feedback (written or screen recording)** | ☐ | written draft prepared for review; official page allows written, recording, or both |
| **PRs/issues on mozilla-ai/otari** | ☐ | none recorded in this draft; verify before submission |
| **DoraHacks form submitted** | ☐ | paste from the template below |

## Otari-Native vs App-Side: an honest map

The rubric scores Otari features "actually used in the application, not simply
enabled in the dashboard". This section separates what the hosted Otari
gateway itself does in this project from what the app implements on its own,
so no app-side feature is presented as an Otari capability.

**Hosted Otari use:**

- Chat execution attempts the hosted gateway first through
  `src/services/otari_client.py`. A separate saved proof shows
  `alibaba/qwen3.8-flash` completing through Otari alone (108 tokens, 3018 ms);
  see [the README proof](../README.md#-verified-live-otari-execution) and the saved Otari
  activity images under `docs/evidence/`.
- Run5 is not proof of an Otari-served completion: its Otari attempt timed
  out and `openai/gpt-oss-20b` completed through Groq fallback. The exact chain
  and timeout are preserved in the [execution evidence](evidence/run5-execution-stream.txt).
- We do not claim Otari-native routing policies, budgets, guardrails,
  web-search tools, or code-execution tools from this app-side workflow.

**Implemented app-side (ours, not Otari):**

- Visual studio, workflow engine (topological execution, template refs)
- Routing scorer (`cost/latency/health` fitness per step type,
  `src/services/router.py`) and the Otari -> Groq -> demo fallback chain logic
- Budget manager: atomic reserve/record, HTTP 402 pre-spend block at the
  project accounting cap (`src/services/budget.py`); reservations are
  conditional on the catalog bound. Missing or zero catalog prices and timeout
  charges mean this is not a verified cap on actual provider charges. The
  provider wallet remains the billing source of truth
- Web search node (Exa + DuckDuckGo fallback) and code-exec node
  (Vercel Sandbox microVM; formerly in-process, AST-checked)
- Guardrails node (banned-term abort), activity feed + CSV export,
  deterministic cost analysis (`computedJson` / `costAnalysis`) with
  "mechanically-complete" status labeling and NOT-ENDORSED commentary handling

**Open-weight models:** the separate Otari-only proof completed with Qwen.
Run5 completed one model step with `openai/gpt-oss-20b` via Groq fallback.
`openai/gpt-oss-120b` and `qwen/qwen3.8-27b` are comparison inputs, not
executed model roles. This evidence does not establish multiple models in
distinct roles served through Otari.

## DoraHacks BUIDL Draft (numbered, mirrors the official fields)

1. **Project name, email, one-liner** - OtariOptm;
   gopanihitansh5@gmail.com; "Visual AI workflows with Otari-first chat, explicit fallback traces,
   sandboxed computation, and inspectable cost-only results."
2. **Public repo + branch** -
   https://github.com/gopanihitansh5-collab/otarioptm (public, branch `main`)
3. **First commit using Otari** -
   https://github.com/gopanihitansh5-collab/otarioptm/commit/745cc90cacd7b466d236aae27e8d43edd5ec2124
   ("feat: add OTARI client, budget service, router algorithm, and FastAPI
   gateway", 2026-11-09 - verified via the GitHub API on 2026-11-11)
4. **Otari features used** - hosted-gateway chat completions and open-weight
   model access, with the evidence limits above. Fallback disclosure and
   catalog-based accounting are app-side, not claimed as hosted Otari features.
5. **PRs/issues on mozilla-ai/otari** - none recorded in this draft; verify before submission.
6. **Demo video (3-5 min, real voice, screen recording)** - link TBD.
7. **Feedback** - written draft prepared for the owner's review; submission
   is his call. (Official page: written, screen recording, or both; video
   feedback must be the participant's own voice, no AI.)

Raw run evidence for judges: `docs/evidence/` (real run, inspectable offline,
no keys or spend needed).

## Submission Template

```markdown
# Project Name
OtariOptm: AI workflow builder with auto-cost optimization

# One-line Description
Visual AI workflows with Otari-first chat, explicit fallback traces, and inspectable cost-only results

# GitHub Link
https://github.com/gopanihitansh5-collab/otarioptm (branch: main)

# Demo Video
[YouTube/Loom link, 3-5 min]

# Feedback (written or screen recording)
[owner-reviewed text or link]

# Otari Features Used
Hosted-gateway chat completions and open-weight model access, supported by
the separate Otari-only proof. Run5 completed via Groq fallback. App-side
features (fallback tracing, routing scorer, budget manager, Exa search,
sandbox code exec, guardrails, activity) are not claimed as hosted Otari capabilities.

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

## Optional local API smoke check (not the full live workflow)

Start the gateway (`python run_server.py`, port 8000). No API key is needed:
with none set the gateway answers from the zero-cost demo tier and labels the
output `demo`. These commands exercise a small local API path, not live planning, search,
sandbox execution, or verified provider billing. Inspect the saved run evidence
without making any new API calls.

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

Command 4 returns per-step results and the budget snapshot. No-key results
are labeled demo and do not establish hosted inference.

The app-side budget manager can refuse calls when a reservation exceeds its
accounting cap. This is conditional on the configured bound, not proof that
all actual provider charges are tracked or capped.

The API reference for every field, status code and error is `docs/api.md`.

## Demo recording scope (participant voice, 3-5 minutes)

The current recording shows the task, generated graph inspection, approval,
real execution events, computed results, source links, and report download.
A separate Otari-only proof is labeled separately from the workflow fallback.
Show app-side budget accounting as incomplete billing evidence, not a provider
spend guarantee. Model commentary may contradict computed numbers and remains
NOT ENDORSED. Do not treat a demo-tier or saved replay as fresh inference.

## Remaining Human Actions

- [ ] Finish and approve the participant-voice demo, upload, paste link into the form
- [ ] Finalize feedback (written draft prepared for review, or record a screen recording - both allowed)
- [ ] Report any existing Otari PRs/issues, or state none. New posts are optional and require approval.
- [ ] Submit the DoraHacks form before Nov 11, 22:29 IST

## Unsubmitted feedback ideas (verify before proposing a public issue)

Our integration did not consistently settle actual chat cost from the responses
it used. Check the existing Otari response fields and our parser before
attributing this to a missing product feature: `usage.cost_usd` is documented
in other public integrations. Catalog zero is not proof of no wallet charge.

Our app uses its own latency/health defaults for routing. Check the current
Otari catalog and routing-policy API before proposing new fields. These notes
are technical review material, not the participant's personal opinion and not
an instruction or approval to publish an issue.
