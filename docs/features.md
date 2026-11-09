# OtariOptm Features

## Visual Composer
- Drag-and-drop node palette
- React Flow canvas
- Node connections with conditional logic
- Live preview of workflow execution

## Auto-Model Routing
- Queries `/api/v1/models` endpoint
- Ranks by cost-per-token / quality estimate
- Automatic failover on latency spikes
- Sticky-session routing per conversation

## Budget Enforcement
- Per-user budget scopes
- Per-project budget YAML config
- Real-time spend WebSocket updates
- Automatic request blocking at limit

## Code-Execution Node
- Sandboxed Python 3.12 environment
- Profile `code-exec` in docker-compose
- Resource limits (memory, CPU)
- Output streaming to UI

## Web-Search Node
- Integrated `any-search` library
- Live query execution
- Summary generation before LLM step

## Guardrails Node
- Content filtering rules
- Custom regex patterns
- PII detection and redaction
- Event logging

## Activity Dashboard
- WebSocket connection to `/api/v1/activity`
- Live token/cost per node
- Error rate tracking
- Exportable CSV reports

## Team Sharing
- Scoped API keys with individual budgets
- Role-based access control
- Shared workflow library
- Per-project reporting