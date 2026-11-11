# Demo Script (Presenter Talk Track)

~10 minutes. Every claim below matches verified behavior (see
docs/product-capabilities.md). Bracketed notes are for the presenter, never
spoken.

## 1. Landing (2 min)

"This is OtariOptm - an AI workflow engine that keeps model spend under
control. The page walks the story: the cost problem teams hit, the routing
and budget intelligence, an interactive taste, and where the product is
credible today. Everything marked demo or illustrative is labeled; there
are no vanity metrics on this page."

## 2. Studio: first workflow (3 min)

"Here's the studio. On a first visit it loads a starter workflow for you -
research a topic with web search, then summarize. I'll just hit Run."
[Run. Point at activity feed.] "You can see each node start and finish,
live. On this deployment the feed polls the activity API - the health
endpoint advertises the transport, and the UI adapts; locally it streams
over WebSocket."
[Point at the answer.] "This answer is labeled demo mode. The deployed
gateway runs with zero provider keys, so every model call resolves to the
deterministic demo tier - free and reproducible. Point it at Otari or Groq
keys and the same flow routes to real providers through the fallback
chain."

## 3. Templates (2 min)

"Four starter workflows ship with the product: research and summarize, a
docs pipeline, a code sandbox workflow, and a multi-source digest."
[Load and run a second template.] "Same execution engine, different graph -
topological execution, guardrails on inputs and outputs, and a sandboxed
code node."

## 4. Budget enforcement (2 min)

"Budgets are enforced, not just displayed. Every node reserves budget and
settles exactly-once when it finishes. Here's the overspend demo control."
[TRY OVERSPEND DEMO, run.] "The API returns 402 budget-exceeded and the
workflow stops. That's the enforcement a finance team actually wants.
Per-user budgets are on the roadmap - today enforcement is project-level."

## 5. Evidence and API (1 min)

"Everything you just saw is exportable." [Download CSV.] "Run history as
CSV. And the gateway speaks an OpenAI-compatible chat-completions shape,
so existing tooling can target it directly."
[Close.] "What's real: workflow execution, routing with labeled fallback,
budget enforcement, activity observability, export. What's planned:
authentication, per-user budgets, durable history. The gap analysis in the
repo says exactly which is which."
