# Run evidence

Raw artifacts from a real workflow run of this repository's own engine,
captured 2026-11-11 (IST) against the production deployment. Published so the
run can be inspected without keys, accounts, or new spend.

## The task

Compare three open-weight models for a support chatbot (10,000 requests per
month, 800 input / 300 output tokens per request, $50/month budget), using
fixed official Groq rates as immutable inputs, one web search to confirm the
source page, a Python node for the arithmetic, and a chat node for the write-up.

## Files

| File | What it is |
|---|---|
| `run5-plan-request.json` | The exact task text given to the planner |
| `run5-plan-response.json` | The planner's generated plan (3 nodes, zero static-analysis warnings) |
| `run5-workflow-graph.json` | The executed graph: `web1` (web search) -> `calc` (code exec) -> `final` (chat) |
| `run5-execution-stream.txt` | Verbatim SSE frames from execution: per-node completions, costs, chains, and the final `workflow.finished` payload |

## What the run shows (and what it does not)

- The web search node ran once (Exa, $0.007) and returned the official Groq
  model page among its sources.
- The code node computed monthly costs of **$1.50 / $3.00 / $18.40** for
  gpt-oss-20b, gpt-oss-120b and qwen3.8-27b. These are arithmetic under the
  stated inputs and rates, not a quality benchmark or a price guarantee.
- The chat step was routed Otari first; the hosted gateway read-timed out and
  the chain fell back to Groq (`chain: ["otari->groq"]`, note
  `otari error (ReadTimeout)`). The fallback is recorded on the step, not
  hidden.
- The chat step's catalog cost reads `0.0` with `costSource: "catalog-zero"`:
  the app recorded zero from its catalog pricing path, so it cannot confirm the
  actual provider charge from the response. The wallet is the billing source
  of truth.
- The model's written commentary is **not endorsed**: in this run the
  prose contradicted its own computed numbers, so the product labels such
  commentary and leads with the deterministic computed result instead
  (`reportStatus: "mechanically-complete"`, `consistency` checks, collapsed
  "NOT ENDORSED" commentary in the UI).

No API keys, wallet identifiers, or account data appear in these files.

This historical run predates the `costAnalysis` SSE field. Its raw finished
payload is preserved unchanged, not retroactively augmented. The current UI
leads with a deterministic cost-only conclusion when that field is returned;
this older artifact alone does not prove that later UI behavior.
