# Demo Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Studio shows the gateway as offline | Cold start of the Vercel Python function, or `/api/v1/health` hiccup | Refresh; retry after a few seconds. If local, confirm `run_server.py` is on port 8000 |
| Local studio can't reach the API (CORS) | Dev server running on a port other than 3000 | Use port 3000, or add the origin to `ALLOWED_ORIGINS` |
| 429 responses | Rate limit (per IP; on Vercel keyed by x-forwarded-for) | Wait for `Retry-After`; don't script rapid-fire runs in a live demo |
| 402 budget-exceeded mid-demo | Leftover overspend-demo state or a drawn-down shared instance budget | Production: new browser profile will not reset server state - re-run after instance reset or switch to local. Local: restart `run_server.py` |
| Template doesn't auto-load | localStorage already has a saved studio state | Clear site data / use incognito |
| Activity feed updates slowly in production | Expected: polling transport on serverless | Not a bug; `/api/v1/health` advertises `activity_transport: poll`. WebSocket works locally |
| Budget/history resets between visits on production | In-memory state on serverless instances | Expected; export CSV during the demo. Durable storage is planned |
| Chat answers look canned | Demo tier (no provider keys configured) | Expected and labeled `[demo mode ...]`. Set OTARI_API_KEY/GROQ_API_KEY for real providers |
| Landing page numbers differ from studio | Landing budget snapshot renders statically in some builds | Verify the studio meter against `GET /api/v1/budget`; the API is the source of truth |
| Old behavior after a deploy | Stale Vercel build cached | Hard refresh; verify the deployment id before reporting a bug |
