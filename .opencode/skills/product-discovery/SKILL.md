# Product Discovery

Inspect the real product before any demo work. Read AGENTS.md, README.md,
docs/, the frontend routes in web/, the backend routes in src/, and the
deployment config (vercel.json). Classify every feature exactly once as:
implemented-and-verified, implemented-but-unverified, partially-implemented,
missing, or broken. Write results to docs/product-capabilities.md and
docs/demo-gap-analysis.md. Never guess a capability from a file name; verify
through tests, the API, or the deployed app. Discover environment variable
NAMES only - never print secret values.
