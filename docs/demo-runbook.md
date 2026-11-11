# Demo Runbook

How to run the OtariOptm demo repeatably. Everything here is free and
works with zero provider credentials (demo tier).

## Prerequisites

- Production path: a browser, `curl`. No setup.
- Local path: Python 3.11+, Node 18+.

## A. Production demo (recommended, ~10 min)

1. Sanity: `curl -s https://otarioptm.vercel.app/api/v1/health`
   Expect 200 with `runtime` and `activity_transport` labels.
2. Open `https://otarioptm.vercel.app` - landing story:
   problem -> intelligence -> interactive demo -> credibility.
   Honesty check: demo/illustrative content is labeled; there is no fake
   pricing, testimonial, or uptime claim.
3. Open `/studio`. On a first visit (or after clearing localStorage) the
   "Research then summarize" template auto-loads onto the canvas.
4. Click Run. Watch: WORKFLOW.STARTED, NODE.COMPLETED per node,
   WORKFLOW.FINISHED in the activity feed; the chat node answer is labeled
   `[demo mode ...]`; the budget meter shows remaining budget ($5.00 default
   project budget, demo runs cost $0.0000).
5. Templates panel: show all four templates (research+summarize,
   docs pipeline, code sandbox, multi-source digest). Load and run a second
   one to show variety.
6. Budget demo: click TRY OVERSPEND DEMO, run again, and show the 402
   budget-exceeded response (budget enforcement is real).
7. Export: `curl -s https://otarioptm.vercel.app/api/v1/export -o runs.csv`
   and open the CSV - the runs just executed are there.
8. API shape (optional, for technical audiences):
   `curl -s https://otarioptm.vercel.app/api/v1/chat/completions -H 'content-type: application/json' -d '{"model":"auto","messages":[{"role":"user","content":"ping"}]}'`

## B. Local demo (adds WebSocket live activity, ~15 min setup)

1. `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt`
2. `python run_server.py` (port 8000).
3. `cd web && npm install && npm run dev` (port 3000).
4. Open `http://localhost:3000/studio` and run the same script as A.
   Locally the activity feed uses the WebSocket transport.
5. Reset between rehearsals: restart `run_server.py` (clears in-memory
   budget/activity) and clear localStorage in the browser (restores
   template auto-load).

## Reset checklist

| What | Production | Local |
| --- | --- | --- |
| Budget/activity state | Fresh browser profile; note budget may already be drawn on a shared instance | Restart server |
| Template auto-load | Clear site data / incognito | Clear localStorage |
| Overspend demo | TRY OVERSPEND DEMO toggle, run once, then reset page state | Same |

## Rehearsal timing

Landing 2 min, studio run 3 min, templates 2 min, budget enforcement 2 min,
export/API 1 min. Total ~10 min with 5 min buffer for questions.
