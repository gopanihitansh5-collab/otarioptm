---
name: otarioptm-context
description: Load when implementing or reviewing OtariOptm features involving model routing, provider fallback, workflow execution, budgets, streaming, activity logs or the React Flow studio.
compatibility: opencode
---

# OtariOptm project context

OtariOptm is an AI-first cost-optimized workflow engine. Its central product promise is that each workflow step is routed to a suitable model using cost, latency and health signals, while spend is reserved before execution and activity remains auditable.

## Architecture map

- `web/`: Next.js frontend and visual workflow studio.
- `src/gateway/`: FastAPI application and HTTP/WebSocket/SSE routes.
- `src/services/`: workflow execution, routing, budget and supporting business logic.
- `src/clients/`: provider integrations and fallback chain.
- `config/`: runtime configuration and examples.
- `tests/`: backend test suite.
- `docs/`: API and architecture documentation.

Always inspect current files; this map may become stale as the project evolves.

## Core invariants

- Reserve estimated cost before a provider call. Do not allow a run to cross its budget cap due to a post-hoc check.
- On success, commit actual cost consistently. On failure/cancellation, release reservations safely.
- Report which provider/model actually handled a step and why it was selected.
- Preserve the fallback chain's errors and make demo-mode results unmistakably synthetic.
- Treat cost/latency/health catalog values as estimates unless measured from real executions.
- Keep credentials exclusively on the backend and load them from environment variables.
- Keep workflow execution order and node-output templating deterministic and testable.
- Ensure activity/export data reflects actual execution rather than fabricated values.
- Treat the MVP code-execution sandbox as defense-in-depth only, not a hardened isolation boundary.

## Integration checklist

For a new provider or routing change, inspect provider client, catalog, router, configuration, workflow executor, API response schema and tests. For studio changes, inspect node types, graph state, execution request construction, result rendering and loading/error states. For budget changes, test exact-cap, over-cap, provider failure, cancellation and concurrent reservation scenarios.
