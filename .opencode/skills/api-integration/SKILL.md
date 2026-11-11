# API Integration

Own the external API contract: OpenAI-compatible /api/v1/chat/completions,
/api/v1/workflow/run, models, templates, budget, activity, export, health.
Keep request/response shapes stable and documented in docs/api.md. Every
endpoint works keyless in demo mode. Error contract is explicit: 402
budget-exceeded, 413 payload too large, 429 rate-limited with Retry-After.
curl examples in the runbook must be copy-paste runnable.
