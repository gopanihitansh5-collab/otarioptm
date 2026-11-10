# OtariOptm Gateway API reference

Base URL (local): `http://localhost:8000`. All routes are prefixed with `/api/v1`.
No client auth for a local instance; provider keys (Otari, Groq, Exa, Resend)
live server-side in the environment and are never accepted from or returned to
clients.

Every chat call walks the fallback chain **Otari hosted -> Groq -> local demo
tier** and records cost into the project budget. When a reservation does not
fit the remaining cap, the call is refused with HTTP 402 before any provider
request is made.

## GET /api/v1/health

Gateway status plus a live budget snapshot.

```json
{
  "status": "ok",
  "otari": false,
  "groq": false,
  "budget": { "cap": 5.0, "spent": 0.0, "reserved": 0, "committed": 0.0, "remaining": 5.0 }
}
```

`otari` / `groq` report whether those keys are configured.

## GET /api/v1/budget

The budget snapshot alone:

```json
{ "cap": 5.0, "spent": 0.0, "reserved": 0, "committed": 0.0, "remaining": 5.0 }
```

The cap comes from `budget.project_cap` in `config/config.yml` (default $5.00).

## GET /api/v1/models

The routable model catalogue with the fields the router scores on:

```json
[
  { "id": "openai:gpt-4o-mini", "name": "gpt-4o-mini", "cost_per_token": 1.5e-7, "latency": 600, "health": 0.95 }
]
```

With live keys, hosted Otari models and the Groq catalogue (discovered at
runtime) are included; the zero-cost `demo` tier is always present and is
excluded from routing when real providers exist.

## POST /api/v1/chat/completions

OpenAI-compatible single completion. Body:

```json
{
  "model": "openai:gpt-4o-mini",
  "messages": [{ "role": "user", "content": "Hello" }],
  "max_tokens": 4000
}
```

`model` is optional; omit it (or pass an unknown id) and the router scores the
full catalogue. Response re-shaped to the OpenAI form, with cost attached:

```json
{
  "model": "demo",
  "choices": [{ "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" }],
  "usage": { "total_tokens": 62, "cost": 0.0 }
}
```

Errors: `400` when `messages` is empty; `402` when the budget reservation does
not fit.

## POST /api/v1/workflow/run

Compiles a React Flow graph into topological steps and executes it.

```json
{
  "nodes": [
    { "id": "n1", "type": "chat", "data": { "prompt": "Summarise {{n0}}" } },
    { "id": "n2", "type": "guardrails", "data": { "banned": ["confidential"] } }
  ],
  "edges": [{ "source": "n0", "target": "n1" }]
}
```

Node types:

| type | Purpose | Key `data` fields |
|---|---|---|
| `chat` | LLM call, routed per step | `prompt`, optional `system` |
| `web-search` | Exa search, DuckDuckGo fallback | `query`, optional `objective` |
| `code-exec` | Sandboxed Python snippet (MVP-grade) | `code` |
| `guardrails` | Block or flag banned terms | `banned` (list), optional `input`, `stop_on_block` (default true) |

Inside `prompt`/`query`/`code`, `{{nodeId}}` substitutes the named node's
output. Guardrails can abort the run; aborted runs release their budget
reservations.

A web-search node reserves a padded $0.01 estimate and records the real Exa
cost after the call.

Response:

```json
{
  "results": [
    {
      "nodeId": "n1", "output": "...", "model": "demo", "chain": ["demo"],
      "tokens": 62, "cost": 0.0, "latencyMs": 0,
      "routing": "demo: cost=0.000e+00/token, latency=1ms, health=0.20 -> score=+0.060",
      "demo": true, "note": null, "type": "chat"
    }
  ],
  "steps": ["...same per-node records..."],
  "budget": { "cap": 5.0, "spent": 0.0, "reserved": 0, "committed": 0.0, "remaining": 5.0 },
  "aborted": null,
  "source": "otarioptm-gateway"
}
```

`note` carries the diagnostic reason from each failed provider when the
fallback chain was walked. `aborted` names the node that stopped the run
(budget 402 or a blocking guardrails verdict). Per-node `error` fields mark
steps that failed without aborting the run.

## GET /api/v1/activity

Snapshot of the activity hub (recent events: node starts/completions, budget
snapshots, fallback notes).

## WebSocket /api/v1/activity

The same events streamed live; the studio sidebar and the landing
observability panel subscribe here.

## GET /api/v1/export

Full spend/execution log as CSV, ending with a totals row. Suitable for
finance review.

## Configuration

- `config/config.yml` (copy `config/example.yml`): `budget.project_cap`,
  `budget.per_user`, model defaults, workflow limits, node profile toggles.
- Environment: `OTARI_API_KEY`, `GROQ_API_KEY`, `EXA_API_KEY`,
  `RESEND_API_KEY`, `BUDGET_ALERT_EMAIL`, `OTARIOPTM_CONFIG` (config path
  override). With no keys the gateway runs the deterministic demo tier at zero
  cost; this is expected, not an error.
- Budget cap blocks return HTTP 402 and fire the Resend alert email when
  `RESEND_API_KEY` and `BUDGET_ALERT_EMAIL` are set.
