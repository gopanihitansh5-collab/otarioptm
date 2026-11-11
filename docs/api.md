# OtariOptm Gateway API reference

Base URL (local): `http://localhost:8000`. All routes are prefixed with `/api/v1`.
No client auth for a local instance; provider keys (Otari, Groq, Exa, Resend)
live server-side in the environment and are never accepted from or returned to
clients.

Every chat call walks the fallback chain **Otari hosted -> Groq -> local demo
tier** and records cost into the project budget. When a reservation does not
fit the remaining cap, the call is refused with HTTP 402 before any provider
request is made.

All routes, payloads and status codes below were read off
`src/gateway/main.py` (route table at `src/gateway/main.py:1281-1291`) and
`src/services/budget.py`. Where a limit is configurable, the file and line are
given.

## GET /api/v1/health

Gateway status plus a live budget snapshot.

```json
{
  "status": "ok",
  "otari": false,
  "groq": false,
  "budget": { "cap": 5.0, "spent": 0.0, "reserved": 0.0, "committed": 0.0, "remaining": 5.0 }
}
```

`otari` / `groq` report whether those keys are configured
(`src/gateway/main.py:672-679`). This route is never rate limited, because the
limiter only applies to mutating methods (see
[Rate limiting](#rate-limiting)).

## GET /api/v1/budget

The budget snapshot alone (`src/gateway/main.py:682-683`). The snapshot shape
is fixed by `BudgetManager.snapshot` (`src/services/budget.py:177-186`):

```json
{ "cap": 5.0, "spent": 0.0, "reserved": 0.0, "committed": 0.0, "remaining": 5.0 }
```

- `cap`: `budget.project_cap` from `config/config.yml` (default $5.00).
- `spent`: recorded spend.
- `reserved`: open reservations not yet settled.
- `committed`: `spent + reserved`.
- `remaining`: `max(0, cap - committed)`.

## GET /api/v1/models

The routable model catalogue with the fields the router scores on
(`src/gateway/main.py:1061-1072`):

```json
[
  {
    "id": "openai:gpt-4o-mini",
    "name": "gpt-4o-mini",
    "cost_per_token": 1.5e-7,
    "latency": 600,
    "health": 0.95,
    "health_probe": { "value": 0.95, "source": "catalog", "ts": 1762950000.123 }
  }
]
```

`health_probe` is stamped on every entry (`src/gateway/main.py:1070`). `source`
is `catalog` when a live provider is configured and `synthetic-demo` in
keyless demo mode, where the value is a deterministic pseudo-health derived
from the model id (`src/gateway/main.py:1018-1046`).

With live keys, hosted Otari models and the Groq catalogue (discovered at
runtime) are included; the zero-cost `demo` tier is always present and is
excluded from routing when real providers exist
(`src/gateway/main.py:336-339`).

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
full catalogue. Response re-shaped to the OpenAI form, with cost attached
(`src/gateway/main.py:751-755`):

```json
{
  "model": "demo",
  "choices": [{ "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" }],
  "usage": { "total_tokens": 62, "cost": 0.0 }
}
```

Errors: `400` for an invalid body or an oversized payload (see
[Status codes](#status-codes)); `402` when the budget reservation does not
fit; `429` when the per-IP rate limit trips (see
[Rate limiting](#rate-limiting)).

## POST /api/v1/chat/completions/stream

The same completion as a Server-Sent Events stream
(`src/gateway/main.py:1166-1246`). The request body is identical to
`POST /api/v1/chat/completions` and the response media type is
`text/event-stream`.

The stream uses **named SSE events**, not the OpenAI `choices` chunk format.
There is no `data: [DONE]` sentinel. The three events are:

| event | `data:` payload |
|---|---|
| `delta` | `{"delta": "<text chunk>"}` |
| `done` | `{"model": "...", "tokens": 42, "cost": 0.0}` |
| `error` | `{"error": "<reason>"}` |

Live example:

```bash
curl -N http://localhost:8000/api/v1/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{"model":"demo","messages":[{"role":"user","content":"Hello"}]}'
```

Stream output for the demo tier with `{"model":"demo","messages":[{"role":"user","content":"Hello"}]}`,
truncated after three deltas (the heartbeat line only appears on an idle
stream, which is exactly when you would see it):

```
: heartbeat

event: delta
data: {"delta": "[demo mode | node adhoc-"}

event: delta
data: {"delta": "stream] 5 chars received"}

event: delta
data: {"delta": ", workflow #0. Live prov"}

event: done
data: {"model": "demo", "tokens": 56, "cost": 0.0}
```

- Deltas are emitted in chunks of 24 characters (`_SSE_CHUNK_CHARS`,
  `src/gateway/main.py:1163`).
- **Heartbeat:** if no event has been produced for 15 seconds, the gateway
  writes the SSE comment line `: heartbeat` followed by a blank line
  (`_SSE_HEARTBEAT_SECONDS = 15.0`, `src/gateway/main.py:1162`, emitted at
  `src/gateway/main.py:1205`). Comment lines are ignored by `EventSource`
  consumers, so they keep proxies from closing an idle stream.
- `event: done` is terminal. `event: error` is also terminal and carries a
  short reason only; raw provider errors are never echoed back
  (`src/gateway/main.py:1190-1193`, `src/gateway/main.py:1228`).
- Budget accounting is unchanged: the reservation is made before the stream
  starts and the recorded cost lands in the activity feed (`stream.completed`)
  and the CSV export like any other call.
- If the client disconnects mid-stream, the gateway still settles the budget
  reservation and records a `stream.disconnected` activity event
  (`src/gateway/main.py:1230-1240`).

## GET /api/v1/templates

Starter workflow templates for the studio's templates gallery
(`src/gateway/main.py:1090-1132`, route at `src/gateway/main.py:1287`).

The four real template ids are:

| id | name | nodes |
|---|---|---|
| `research-then-summarize` | Research then summarize | 2 |
| `guarded-chat` | Guarded chat | 2 |
| `code-review` | Code review | 2 |
| `web-fact-check` | Web fact check | 3 |

Every entry has the same shape: `{id, name, description, nodeCount, graph}`,
where `graph` is `{nodes, edges}` (`_template`,
`src/gateway/main.py:1080-1087`). Real first entry:

```json
[
  {
    "id": "research-then-summarize",
    "name": "Research then summarize",
    "description": "Web search feeds a chat step that condenses the findings into a short brief.",
    "nodeCount": 2,
    "graph": {
      "nodes": [
        { "id": "search-1", "type": "web-search", "data": { "query": "Mozilla Otari gateway" }, "position": { "x": 0, "y": 0 } },
        { "id": "summarize-1", "type": "chat", "data": { "system": "You are a concise research assistant.", "prompt": "Summarize the key points from this research:\n\n{{search-1}}" }, "position": { "x": 240, "y": 0 } }
      ],
      "edges": [ { "id": "e1", "source": "search-1", "target": "summarize-1" } ]
    }
  }
]
```

Each template graph is runnable as-is: POST its `graph.nodes` and
`graph.edges` straight to `/api/v1/workflow/run`, including in zero-key demo
mode.

## GET /api/v1/templates/{template_id}

One template's full graph, ready to load into the studio or POST directly to
`/api/v1/workflow/run` (`src/gateway/main.py:1143-1152`). The response is the
same object as one entry of the list above, including `nodeCount` and
`graph`.

```bash
curl http://localhost:8000/api/v1/templates/code-review
```

Errors:

- `404` for an unknown id, with the body
  `{"detail": "Unknown template '<id>'"}` (`src/gateway/main.py:1151`).
- `400` when the id is longer than 64 characters
  (`MAX_TEMPLATE_ID_CHARS`, `src/gateway/main.py:52`,
  `src/gateway/main.py:1144-1148`).

## Rate limiting

Token-bucket rate limiting protects the gateway: one bucket per client IP
plus one global bucket per instance (`_TokenBucketLimiter`,
`_rate_limit_middleware` in `src/gateway/main.py`).

- **Which requests are limited:** only `POST`, `PUT`, `PATCH` and `DELETE`
  requests whose path starts with `/api/v1/` (`_MUTATING_METHODS`). Every
  `GET` route is exempt, so `/api/v1/health` and the other read endpoints
  stay available to dashboards and uptime probes.
- **Bucket sizes:** per IP, burst capacity 30 requests refilled at 1.0 token
  per second; globally (all IPs on one instance), burst capacity 120
  refilled at 5.0 tokens per second. Configurable under `gateway.rate_limit`
  in `config/config.yml` (`enabled`, `capacity`, `refill_per_sec`,
  `global_capacity`, `global_refill_per_sec`). The global bucket blunts
  IP-rotation abuse; a normal user hits the per-IP limit first.
- **Response:** HTTP `429` with the body
  `{"detail": "Rate limit exceeded - slow down and retry"}` and a
  `Retry-After` header carrying the whole number of seconds to wait. The
  limiter is installed inside CORS, so the `429` still carries CORS headers.
- **No other telemetry headers are promised.** Both buckets are in-process
  and per-instance: they reset on restart and do not bound spend across
  serverless instances.

## POST /api/v1/workflow/run

Compiles a React Flow graph into topological steps and executes it
(`src/gateway/main.py:758-890`).

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
| `web-search` | Exa search, DuckDuckGo fallback | `query` (required in practice), optional `objective` |
| `code-exec` | Sandboxed Python snippet (MVP-grade) | `code` |
| `guardrails` | Block or flag banned terms | `banned` (list), optional `input`, `stop_on_block` (default true) |

Inside `prompt`/`query`/`code`, `{{nodeId}}` substitutes the named node's
output. Guardrails can abort the run; aborted runs release their budget
reservations.

**`web-search` node fields.** The node accepts two query fields
(`src/gateway/main.py:815-819`):

- `query`: the search string. It is templated with `{{nodeId}}` placeholders
  and trimmed to 2000 characters. If `query` is empty the gateway falls back
  to the concatenated upstream node outputs
  (`src/gateway/main.py:816-817`, `_gather_upstream` at
  `src/gateway/main.py:893-901`).
- `objective`: the downstream-context objective handed to the search helper.
  It is passed straight through to the search provider
  (`src/gateway/main.py:818-819`, `src/gateway/main.py:826`). When it is
  absent the helper falls back to its own default objective
  (`DEFAULT_OBJECTIVE`, `src/services/search.py:16-20`).

Which is required: neither is validated as mandatory by the gateway. `query`
is the field the studio writes and the one a caller should always send;
`objective` is optional and only changes how the search results are framed
for the downstream step. If both are missing the search runs on the upstream
context alone.

A web-search node reserves a padded $0.01 estimate and records the real Exa
cost after the call (`src/gateway/main.py:821-831`).

Response:

```json
{
  "results": [
    {
      "nodeId": "n1", "output": "...", "model": "demo", "chain": ["demo"],
      "tokens": 62, "cost": 0.0, "latencyMs": 0,
      "routing": "demo: cost=0.000e+00/token, latency=1ms, health=0.98 -> score=+0.096 | est_call=$0.000000 <= budget=$5.000000",
      "demo": true, "note": null, "overBudget": false, "type": "chat"
    }
  ],
  "steps": ["...same per-node records..."],
  "budget": { "cap": 5.0, "spent": 0.0, "reserved": 0.0, "committed": 0.0, "remaining": 5.0 },
  "aborted": null,
  "overBudget": false,
  "source": "otarioptm-gateway"
}
```

`note` carries the diagnostic reason from each failed provider when the
fallback chain was walked (`src/gateway/main.py:436`). `aborted` names the node
that stopped the run (budget 402 or a blocking guardrails verdict). Per-node
`error` fields mark steps that failed without aborting the run. `overBudget`
is true when any step's actual cost had to be clamped to the remaining
headroom (`src/gateway/main.py:888`).

## GET /api/v1/activity

Snapshot of the activity hub (`src/gateway/main.py:908-909`):

```json
{
  "events": [ { "event": "workflow.started", "nodeCount": 2, "nodes": ["search-1", "summarize-1"], "edges": 1, "ts": 1762950000.5 } ],
  "budget": { "cap": 5.0, "spent": 0.0, "reserved": 0.0, "committed": 0.0, "remaining": 5.0 }
}
```

The `events` array holds the last 200 entries of the in-process log. Every
event carries an `event` name and a `ts` timestamp
(`src/gateway/main.py:112-118`). The event names are:

| event | Extra fields |
|---|---|
| `workflow.started` | `nodeCount` (int), `nodes` (array of node ids), `edges` (int) |
| `node.completed` | `nodeId`, `model`, `tokens`, `cost`, `latencyMs`, `routing`, optional `fallbackNote`, optional `overBudget`, optional `blocked` |
| `workflow.blocked` | `nodeId`, `reason` |
| `workflow.finished` | `aborted`, `budget` |
| `stream.completed` | `nodeId`, `model`, `cost` |
| `stream.disconnected` | `nodeId` |

`workflow.started` reports the compiled step count twice on purpose:
`nodeCount` is the integer number of ordered nodes and `nodes` is the array
of their ids, so a client can show either without re-deriving the graph
(`src/gateway/main.py:791-796`). There is no separate "node started" event:
only node completions are emitted.

## WebSocket /api/v1/activity

The same events streamed live (`src/gateway/main.py:912-925`); the studio
sidebar and the landing observability panel subscribe here. The WebSocket
shares the path with the HTTP `GET /api/v1/activity` route; the two coexist.

Frame protocol:

1. On connect the server sends the current budget snapshot as a bare JSON
   object with no `event` key (`src/gateway/main.py:916`).
2. The client sends the literal text `ping` to keep the socket warm. The
   server answers with a pong frame
   (`src/gateway/main.py:920-921`):

```json
{ "event": "pong", "type": "pong", "cap": 5.0, "spent": 0.0, "reserved": 0.0, "committed": 0.0, "remaining": 5.0 }
```

The pong frame carries **both** the marker fields `event` and `type`, whose
value is the string `"pong"`, and the budget snapshot fields. Clients should
filter the pong out of the activity feed, because it is a keepalive and not a
workflow event, and read the snapshot fields from the same frame. Note that
the studio's `useBudget` hook (`web/src/hooks/useBudget.ts:85-94`) branches on
the presence of an `event` key first, so today the pong is treated as an
activity event and the snapshot in the same frame is not read from it.

3. Each activity event is broadcast as a JSON object with an `event` key, and
   is immediately followed by a bare budget snapshot frame with no `event`
   key (`src/gateway/main.py:117-118`).

## GET /api/v1/export

Full spend/execution log as CSV (`src/gateway/main.py:928-947`), ending with
a totals row. Suitable for finance review. The response is `text/csv` with the
`Content-Disposition` filename `otarioptm-activity.csv`.

## Status codes

| code | When | Source |
|---|---|---|
| `400` | Body is not valid JSON, or not a JSON object | `src/gateway/main.py:136-138` |
| `400` | `messages` is not an array, is empty, has more than 50 entries, or an entry is not an object | `src/gateway/main.py:155-166` |
| `400` | A message `content` string is longer than 8000 characters | `src/gateway/main.py:168-171` |
| `400` | `max_tokens` is not an integer | `src/gateway/main.py:149` |
| `400` | `nodes` / `edges` are not arrays, or the graph has no nodes | `src/gateway/main.py:764-776` |
| `400` | The graph has a cycle | `src/gateway/main.py:500-505` |
| `400` | A node is not an object, is missing an `id`, or duplicates another node id | `src/gateway/main.py:467-473` |
| `400` | An edge is not an object, or references an unknown node | `src/gateway/main.py:479-485` |
| `400` | A node `prompt`, `system`, `query` or `code` payload is oversized | `src/gateway/main.py:176-205` |
| `400` | The workflow exceeds `workflows.max_steps` | `src/gateway/main.py:778-781` |
| `400` | A template id is longer than 64 characters | `src/gateway/main.py:1144-1148` |
| `402` | The budget reservation does not fit the remaining cap (pre-spend block) | `src/gateway/main.py:348`, `src/gateway/main.py:823` |
| `404` | Unknown template id | `src/gateway/main.py:1151` |
| `429` | Per-IP rate limit exceeded, with a `Retry-After` header | `src/gateway/main.py:1000-1004` |

### Size caps

| cap | value | constant |
|---|---|---|
| nodes per workflow | 100 | `MAX_WORKFLOW_NODES`, `src/gateway/main.py:45` |
| edges per workflow | 300 | `MAX_WORKFLOW_EDGES`, `src/gateway/main.py:46` |
| messages per chat call | 50 | `MAX_MESSAGES`, `src/gateway/main.py:47` |
| characters per prompt / system / query string | 8000 | `MAX_PROMPT_CHARS`, `src/gateway/main.py:48` |
| characters per code snippet | 8000 | `MAX_CODE_CHARS`, `src/gateway/main.py:49` |
| `max_tokens` | clamped into 1..4096 | `MAX_TOKENS_MIN` / `MAX_TOKENS_MAX`, `src/gateway/main.py:50-51` |

Two notes on how these caps interact:

- `max_tokens` is **clamped**, not rejected: an out-of-range value is pulled
  into 1..4096 rather than producing a `400`. Only a non-integer
  `max_tokens` is a `400` (`src/gateway/main.py:142-150`).
- The 100-node cap is the hard ceiling, but `workflows.max_steps` in
  `config/config.yml` (default 10) is checked first, so the effective node
  limit of a default deployment is 10 nodes and a larger graph returns `400`
  with `Workflow exceeds max_steps=10` (`src/gateway/main.py:778-781`).

## Configuration

- `config/config.yml` is the live configuration file. It is loaded at startup
  by `BudgetManager` (`src/services/budget.py:55-57`) and merged over the
  built-in defaults in `src/services/budget.py:8-37`. When the file is
  missing, the built-in defaults apply unchanged. The loader merges one level
  deep, so a section you declare replaces that whole default section.
- Environment: `OTARI_API_KEY`, `GROQ_API_KEY`, `EXA_API_KEY`,
  `RESEND_API_KEY`, `BUDGET_ALERT_EMAIL`, `OTARIOPTM_CONFIG` (config path
  override), `ALLOWED_ORIGINS` (extra CORS origins). With no keys the gateway
  runs the deterministic demo tier at zero cost; this is expected, not an
  error.
- Budget cap blocks return HTTP 402 and fire the Resend alert email when
  `RESEND_API_KEY` and `BUDGET_ALERT_EMAIL` are set
  (`src/gateway/main.py:643-669`).
