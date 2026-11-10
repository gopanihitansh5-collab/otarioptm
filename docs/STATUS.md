# OtariOptm status note (2026-11-10)

Hackathon: Mozilla Otari / DoraHacks "Devs Wilding Online!". Submission deadline
Nov 11 11:59 PM (UTC+5:30). Demo video + feedback recording + DoraHacks form are
human TODOs.

## What exists

Backend (FastAPI, port 8000 via `python run_server.py`):
- Workflow engine: topological execution of chat / web-search / code-exec /
  guardrails nodes, `{{nodeId}}` template substitution, activity hub, CSV export
  with totals row.
- Budget manager: atomic reserve/record under asyncio lock, default $5.00 cap
  (`config/config.yml budget.project_cap`), HTTP 402 pre-spend block, Resend
  alert email on cap (`_send_budget_alert`).
- Router: score = 0.45*cost_norm + 0.35*latency_norm - 0.20*health; demo tier
  excluded when real providers exist; fallback chain Otari -> Groq -> local demo;
  Groq model picked dynamically via `/models`, max_tokens cap-retry on 400;
  `fallback_note` diagnostics surfaced in step results and activity feed.
- Exa integration (`src/services/search.py`): /search with query + objective +
  highlights; DuckDuckGo fallback; real costDollars recorded into budget
  (verified live: $0.007 for one search run).
- Endpoints: GET /api/v1/health, /budget, /models, /activity; POST
  /chat/completions, /workflow/run; GET /api/v1/export; WS /api/v1/activity.
- Secrets in `.env` (gitignored, verified): OTARI_API_KEY, EXA_API_KEY,
  RESEND_API_KEY, GROQ_API_KEY, BUDGET_ALERT_EMAIL. Never printed or committed.

Web (Next.js 16.4.5, React 19.3, Tailwind 4.3.5, @xyflow/react 12.12.1, port
3000 via `npm run start` or `npm run dev`; scripts use `--webpack` because the
vendored @next SWC binary is corrupt in this environment; @tailwindcss/postcss
is a vendored registry tarball in node_modules):
- /studio: React Flow editor, custom nodes, undo/redo, keyboard shortcuts,
  localStorage persistence (otarioptm.workflow.v1), live WS activity sidebar,
  budget meter, CSV export.
- Landing page rebuilt 2026-11-10 to the design brief: AnnouncementBar, Nav
  (mobile menu), split Hero (pointer parallax, live gateway status via
  /api/v1/budget), Problem/Solution diagrams, pinned 5-step product demo,
  Intelligent Routing (stages + policy simulator + fallback chain), Budget
  Governance, Observability (live data, honest offline card), Architecture,
  DX (4 code tabs), Trust (honest MVP sandbox), Use Cases, Pricing ($0 beta),
  FAQ (8 answers), CTA, Footer. CSS-native motion only, no new dependencies;
  Inter + IBM Plex Mono via next/font; reduced-motion handled everywhere.
- `MASTER.md` at repo root is the design-system source of truth.

## Verification state

- `npm run build` exit 0; landing and studio prerendered.
- Landing 200 (81KB), studio 200, backend health 200, budget snapshot shows
  spent $0.007 / remaining $4.993.
- Design audit (genjutsu design-audit, tells group): 18 checked, 0 problems;
  6 tells confronted and allowed by the thesis (documented in session).
  One leftover U+2014 flagged in a build output vs served-page discrepancy:
  grep landing copy for em-dashes next session.

## GitHub

- Repo live: https://github.com/gopanihitansh5-collab/otarioptm (public),
  single branch `hackathon-2026-nov`, default branch, 5 commits through
  ee3d8ff (complete MVP). Remote in .git points to this repo.
- Tokens (classic ghp_, full scope): `C:\Users\rcgop\Desktop\work\gopanigithub.txt`
  (user gopanihitansh5-collab) and `C:\Users\rcgop\Desktop\work\mypersonalgithub.txt`
  (user Professional50coder). Used one-shot, never stored. Suggest regenerating
  narrower tokens.
- The 2026-11-10 redesign (design system, landing rebuild, studio token
  alignment) is committed and pushed to `hackathon-2026-nov` on 2026-11-10.

## How to run

- Backend: `python run_server.py` in repo root (needs .env).
- Web: `npm run start` in `web/` (production, uses last build) or
  `npm run dev -- --webpack`? (dev script already has --webpack).
- End-to-end test: POST two-node workflow (web-search + chat with {{s1}}) to
  http://127.0.0.1:8000/api/v1/workflow/run; expect chain otari->groq (or
  otari->groq->demo with fallbackNote explaining why), Exa cost recorded.

## What to build next (priority order for the submission)

1. Demo-day polish on the studio: node palette icons matching landing tokens,
   run-status glow states on edges, empty-canvas onboarding hint.
2. Landing <-> studio deep links: "Open this workflow in Studio" from the
   product-demo section (seed a localStorage workflow on click).
3. Multi-user budget identities: extend budget manager from one project cap to
   per-user/per-project reservations (config keyed), show them in /budget and
   the meter. High demo value for the "governance" story.
4. Streaming responses: token streaming over the WS activity feed for chat
   nodes (perceived performance win, easy live-demo moment).
5. Models page or /models visual on landing fed by the real gateway catalogue
   (replaces the illustrative simulator values with live data when the gateway
   is up).
6. Graceful Otari 402 narrative: surface "provider not onboarded - running on
   fallback" as a first-class badge in the studio top bar before the demo
   video.
7. Persistence beyond localStorage: optional server-side workflow save/load
   (small SQLite table keyed by workflow id) - low cost, kills the "browser
   only" caveat in Trust.
8. README quickstart embed: mirror the DX tabs (curl, quickstart, docker) into
   README.md so judges see the same DX without opening the site.
9. Nice-to-have: OG image, favicon in brand palette, Lighthouse pass on the
   landing, one more em-dash sweep.

## Known limits

- Em-dash grep on landing copy (audit discrepancy).
- Redesign commit pushed 2026-11-10; keep pushing from `hackathon-2026-nov`.
- Otari 402 on the hosted gateway reads "No credential is configured for
  provider 'openai'" - fine for the demo narrative (fallback chain shines),
  but worth re-checking before recording the demo video.
- Registry stubs in this environment: @next/swc-win32-x64-msvc binary corrupt
  (webpack only), @tailwindcss/postcss vendored manually.
- Optional future: Framer Motion / R3F if wanted (not installed, by design).
