# Observability

Own activity events, the budget meter, /api/v1/activity, /api/v1/budget,
CSV export, and the health labels (runtime, activity_transport). WebSocket
streams locally; serverless uses polling - the transport must be advertised
in /api/v1/health and the UI must adapt. In-memory state is a documented
limitation, never hidden: production resets per instance. Every demo metric
shown on screen must trace to one of these endpoints.
