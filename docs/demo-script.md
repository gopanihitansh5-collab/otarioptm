# Demo Script (Presenter Talk Track, own voice)

3-5 minutes at a natural pace (~600 spoken words). Every spoken claim matches
verified behavior in the current deployment (see
docs/QUALITY-AUDIT-2026-11-11.md). [Bracketed notes are stage directions -
never read aloud.] Read it in your own voice; record your real screen.

## 1. Landing (0:00-0:30)

"This is OtariOptm - a control plane for AI workflow spend. It routes each
step of a workflow to a model by cost, latency and health, reserves budget
before anything runs, and shows you exactly what every run cost. Everything
on this page that is illustrative or demo is labeled as such - there are no
vanity metrics here."

## 2. The problem (0:30-0:50)

"Teams picking models by hand are guessing off a pricing page every day.
OtariOptm scores candidate models per request and commits to one router, so
the cheapest healthy option wins each step - and you can see why."

## 3. Studio tour (0:50-1:30)

[Open Studio; starter workflow "Research then summarize" is already loaded.]

"Here's the studio. On a first visit it loads a starter workflow: search the
web for context, then summarize it. Each node is inspectable - prompt, system
message, routing info. Up here is the budget meter: a five-dollar cap, and
what's left of it. The palette offers model chat, web search, guardrails -
and code execution, which is temporarily unavailable. More on that in a
moment, it's part of the story."

## 4. A run, honestly labeled (1:30-2:15)

[Click Run Workflow.]

[If the run used the demo tier - no provider keys configured:]
"Watch the activity feed: each node starts and completes, live. This answer
is labeled DEMO, because this environment has no provider keys configured -
every model call resolves to a deterministic demo tier that is free and
reproducible. The badges say so on every node. Point the same gateway at
Otari or Groq keys and this exact flow routes to real providers through the
same fallback chain."

[If you chose to run live on the production deployment with your own keys:]
"Watch the activity feed: each node starts and completes, live. This run
went to a real provider, and every node shows its provider, tokens and cost
- with a label saying whether that cost was reported by the provider or
estimated. An estimate is never presented as a real charge."

## 5. A security decision, not a bug (2:15-2:45)

[Show the Code Exec palette card and/or run a workflow with a code node.]

"One honest limitation. Code execution is temporarily unavailable: while
hardening the sandbox we found the isolation boundary wasn't strong enough,
so the node now refuses every program - fail closed - until execution runs
behind a genuine isolation boundary. We'd rather ship a truthful refusal
than a weak sandbox."

## 6. Budget enforcement (2:45-3:30)

[Click TRY OVERSPEND DEMO, then Run.]

"Budgets are enforced before spend, not just displayed. This control is a
client-side demonstration of the pre-spend block - it sets a tiny local cap
and leaves the real gateway cap untouched. Watch: the run is blocked before
anything executes - nothing ran, nothing was spent. On the server side the
gateway does the same thing for real: it reserves budget before each step,
settles exactly once, and refuses with HTTP 402 when the cap is exhausted.
That server-side path is covered by the automated test suite - 130 tests
green today. Today's ledger is in-memory on the serverless deployment, so
it resets between instances; durable, per-user budgets are documented next
steps."

## 7. Evidence (3:30-4:00)

[Click Export CSV.]

"Every run is exportable: the activity log downloads as CSV, including a
cost-source column that says provider-reported, estimated, or demo for each
entry. The gateway also speaks an OpenAI-compatible chat-completions shape,
so existing tooling can target it directly."

## 8. Close (4:00-4:30)

"What's real today: multi-node workflow execution, cost-latency-health
routing with a labeled fallback chain, pre-spend budget enforcement, live
activity observability, and export. What's clearly marked as not done: code
execution behind a real isolation boundary, authentication, durable history.
The quality audit in the repo lists every one of these as pass, partial, or
open - in writing. That's OtariOptm: spend control you can actually verify."
