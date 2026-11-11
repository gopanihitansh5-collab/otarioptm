# OtariOptm status note (2026-11-11)

Hackathon: Mozilla Otari / DoraHacks "Devs Wilding Online!". Submission deadline
Nov 11, 2026, 22:29 IST. All remaining submission items are
human actions (see blockers below).

## Current state

GitHub:
- Repo live and public: https://github.com/gopanihitansh5-collab/otarioptm
- Branch renamed to `main` on 2026-11-11 and flipped to the repo default;
  keep pushing there. History: single branch from `hackathon-2026-nov`,
  5 commits through ee3d8ff (complete MVP) plus the 2026-11-10 redesign
  commit and later work; CI green on every push.
- Tokens (classic ghp_, full scope): `C:\Users\rcgop\Desktop\work\gopanigithub.txt`
  (user gopanihitansh5-collab) and `C:\Users\rcgop\Desktop\work\mypersonalgithub.txt`
  (user Professional50coder). Used one-shot, never stored. Suggest regenerating
  narrower tokens.

Landed (earlier sessions, verified):
- Backend (FastAPI, port 8000 via `python run_server.py`): workflow engine
  (topological chat / web-search / code-exec / guardrails execution,
  `{{nodeId}}` substitution, activity hub, CSV export with totals row);
  budget manager (atomic reserve/record under asyncio lock, default $5.00
  cap from `config/config.yml budget.project_cap`, HTTP 402 pre-spend block,
  Resend alert email on cap); router (score = 0.45*cost_norm +
  0.35*latency_norm - 0.20*health, per-step weights, demo tier excluded when
  real providers exist, fallback chain Otari -> Groq -> local demo, dynamic
  Groq catalogue via /models, max_tokens cap-retry, `fallback_note`
  diagnostics); Exa integration with DuckDuckGo fallback and real cost
  recording (verified live: $0.007 for one search run).
- Endpoints: GET /api/v1/health, /budget, /models, /activity; POST
  /chat/completions, /workflow/run; GET /api/v1/export; WS /api/v1/activity.
- Secrets in `.env` (gitignored, verified): OTARI_API_KEY, EXA_API_KEY,
  RESEND_API_KEY, GROQ_API_KEY, BUDGET_ALERT_EMAIL. Never printed or committed.
- Web (Next.js 16.4.5, React 19.3, Tailwind 4.3.5, @xyflow/react 12.12.1,
  port 3000): /studio React Flow editor (custom nodes, undo/redo, keyboard
  shortcuts, localStorage persistence `otarioptm.workflow.v1`, live WS
  activity sidebar, budget meter, CSV export, 560x300 node grid placement,
  hydration-safe persistence, refit-on-change fitView); landing page rebuilt
  to the design brief (14 sections, R3F routing-sphere hero, honest
  DEMO TIER / LIVE badges, reduced-motion fallbacks); /privacy and /terms
  drafts. `MASTER.md` at repo root is the design-system source of truth.
- Tests and CI: 18 pytest tests in `tests/` (budget, router, demo-tier API),
  all passing; GitHub Actions CI (gateway pytest + web lint/build) green;
  `npm run lint` 0 problems; `npm run build` exit 0.
- Docker: Dockerfile + docker-compose.yml for the gateway, `web/Dockerfile`
  for the frontend. Statically validated plus a clean-room proxy run
  (fresh venv boots the gateway in demo mode; fresh `npm ci` + build
  passes); no container runtime exists in this environment, so images were
  not actually built here.
- LICENSE: Apache 2.0 file added; README declares it.

New API surface in flight (parallel builds, this session documents their
contracts, not the code): POST /api/v1/chat/completions/stream (SSE token
streaming), GET /api/v1/templates and /api/v1/templates/{id} (starter
workflow gallery), per-IP rate limiting (HTTP 429), background model-health
probes on the backend; templates gallery, run history, and JSON export/
import in the studio. Contracts are written up in `docs/api.md`; final
reconciliation of docs against the merged code happens at PROVE.

## Submission blockers (owner: human, all of them)

- [ ] Demo video, rubric 3-5 min (script in docs/submission.md, target
      4:00, includes the templates gallery beat); record, upload to
      YouTube/Loom, paste link into the form.
- [ ] Feedback recording (talking-head or narrated screen capture).
- [ ] Open 1-2 issues/PRs on https://github.com/mozilla-ai/otari (drafts
      ready in docs/submission.md; review, then post yourself).
- [ ] Submit the DoraHacks form before Nov 11, 22:29 IST (paste-ready
      template in docs/submission.md).

## Docs session (2026-11-11)

- README.md: quickstart embed so judges see the DX without opening docs:
  curl block (health check + two-node demo workflow run) and the
  `docker compose up --build` one-liner, plus a Demo-mode callout (full
  stack runs with zero API keys). Closes the README-embed item from the
  earlier roadmap and known-limit #7.
- Em-dash sweep: zero U+2014 in README.md and docs/** (MASTER.md forbids
  them in copy); replaced with commas/colons/periods. En-dashes in ranges
  (3-5) are unaffected.
- docs/api.md: SSE streaming, templates gallery, and per-IP rate-limit
  (429) semantics documented with request/response examples, marked as
  part of the API surface with reconciliation at PROVE.
- docs/submission.md: demo video script retimed to 4:00 with a templates
  gallery beat; DoraHacks form template made paste-ready and consistent
  with the new API surface.
- Truth rule held: no invented numbers; illustrative template payload in
  api.md is labeled as illustrative of the shape.

## Known limits

- Otari 402 on the hosted gateway reads "No credential is configured for
  provider 'openai'": fine for the demo narrative (fallback chain shines),
  re-check before recording the demo video.
- Budget state is in-process; it resets on gateway restart (documented
  MVP limitation).
- Code exec sandbox is not a security boundary (documented MVP-grade).
- Registry stubs in this environment: @next/swc-win32-x64-msvc binary
  corrupt (webpack only), @tailwindcss/postcss vendored manually.
- Streaming / templates / rate limiting / health probes / studio gallery +
  history + JSON import are documented as contracts; the merged code is
  reconciled at PROVE.
- Optional future: Framer Motion if ever wanted (not installed, by design).

## Earlier sessions (history)

### 2026-11-10 evening pass (pre-submission completion)

- Regenerated `web/package-lock.json`: the committed lockfile carried a
  corrupt nested entry (`eslint-plugin-react-hooks/node_modules/zod` with no
  version) that broke fresh `npm install` / `npm ci`. Fresh install and
  `npm run build` (exit 0) verified after regeneration.
- Em-dash sweep: zero U+2014 in `web/src`; the earlier build-output flag is
  resolved in source.
- Added `Dockerfile` + `.dockerignore` + `docker-compose.yml` (gateway) and
  `web/Dockerfile` + `web/.dockerignore` (frontend). Statically validated
  only: no Docker daemon in this environment, so images were not built here.
- Added `docs/api.md` endpoint reference, verified against
  `src/gateway/main.py`; README quickstart made cross-platform, Docker
  section added; Apache 2.0 `LICENSE` file added; `.env.example`
  Resend/BUDGET_ALERT_EMAIL comments corrected to match the wired alert path.
- Landing page audited against the design brief checklist: all 14 sections
  present; desktop 1440px and mobile 390px screenshots inspected. Deliberate
  deviation: studio keeps its indigo node-identity accents instead of the
  landing's lime system.
- End-to-end re-verified: backend health/budget/models, demo-mode workflow
  run with `{{nodeId}}` substitution, landing 200, studio 200.
- Studio UX fix: newly added nodes cascaded at 30px offsets and stacked under
  each other; they now place on a 560x300 grid so every added node is visible.
  Verified in a real browser run (positions 80/640 grid, run completes,
  activity feed + budget meter live).
- Lint cleanup: all 16 errors and 2 warnings resolved. `npm run lint` reports
  0 problems and the production build passes; landing and studio re-verified
  in a real browser after the refactor.

### Session 2 (2026-11-10, evening)

- Studio fit-view: the one-time `fitView` over-zoomed to 2.5x after the
  first node add, pushing nodes offscreen. Now refits on node-count change
  with `maxZoom: 1.1`; complete 4-node workflow readable at 1440x900,
  browser-verified.
- Studio persistence bug: `useWorkflowState` read localStorage in the lazy
  `useState` initializer, so SSR rendered an empty canvas and React kept
  the SSR `disabled` attribute on Run Workflow after hydration - a real
  production bug. Fixed by hydrating from localStorage in an effect.
- Landing nav rebuilt per the brief: Product/Solutions/Developers hover +
  focus dropdowns, flat Pricing link, disabled Sign-in per the brief's
  disabled-button spec; `#use-cases` anchor added.
- `/privacy` and `/terms` pages (marked draft pending owner review) with
  content verified against the implementation (localStorage-only studio
  persistence, in-memory gateway activity, env-only keys, web-search
  node's keyless DuckDuckGo traffic disclosed); footer gained Legal and
  Developers link columns.
- Gateway test suite: 18 pytest tests (budget caps/reservations, router
  ranking and budget-aware selection, demo-tier API behavior) in `tests/`,
  all passing; `requirements-dev.txt` added.
- GitHub Actions CI (`.github/workflows/ci.yml`): gateway pytest job and
  web lint+build job, green on every push including the latest commit.
- Hero centerpiece: React Three Fiber routing sphere - wireframe engine
  sphere, labeled provider nodes in orbit (QWEN / GPT-4O-MINI / CLAUDE),
  lime pulse traveling ingress -> engine -> selected provider on a 6s
  loop, 4-stage request indicator synced to it. three.js is code-split
  via `next/dynamic`; dpr capped, low-power GL, deterministic seeded
  particle field. Fallbacks browser-verified: reduced-motion, no WebGL,
  or viewport <768px all keep the static SVG trace.
- Honest status badges: hero and observability now distinguish DEMO TIER
  (gateway up, no provider keys) from LIVE (otari/groq configured),
  reading `/api/v1/health`.
- Clean-room Docker proxy (no container runtime available anywhere in
  scope, so images remain unbuilt): from a pristine `git archive` copy,
  fresh venv + `pip install -r requirements.txt` boots the gateway and
  serves health/workflow/export in demo mode; fresh `npm ci` from the
  regenerated lockfile (388 packages) + `npm run build` passes. This
  exercises each Dockerfile's build steps short of the daemon.

Still outstanding from those sessions: live-provider verification (awaiting
key scope approval), actual `docker build`/`docker compose up` (no Docker
runtime available in the build environment).
