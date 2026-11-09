# OtariOptm Project: Comprehensive Checklist

## 📋 Project Setup Checklist

### Repository Structure
- [x] Initialize git repository: `git init`
- [x] Create directory structure: `otarioptm/`, `docs/`, `config/`, `src/`, `web/`
- [x] Add all files to git: `git add -A`
- [x] Commit initial structure: `git commit -m "feat: initial OtariOptm project structure"`
- [x] Set up remote: `git remote add origin https://github.com/gopanihitansh5/otarioptm.git`
- [x] Push to GitHub: `git push -u origin master`

### Documentation Files (12+ MD Files)
- [x] `README.md` - Project overview and quick-start
- [x] `docs/overview.md` - Core concepts & value proposition
- [x] `docs/features.md` - 7+ Otari features with descriptions
- [x] `docs/architecture.md` - 6-layer technical architecture
- [x] `docs/quickstart.md` - 7-step MVP setup guide
- [x] `docs/submission.md` - Hackathon checklist & rubric criteria
- [x] `docs/github-pat-guide.md` - PAT best practices & safe patterns
- [x] `docs/phase-0-planning-foundation.md` - Phase 0 planning details
- [x] `docs/phase-1-foundation-skeleton.md` - Phase 1 tasks & milestones
- [x] `docs/phase-2-core-nodes-routing.md` - Phase 2 node implementations
- [x] `docs/phase-3-optimization-polish.md` - Phase 3 budget & team features
- [x] `docs/mvp-feature-plan.md` - MVP feature plan & success metrics
- [x] `docs/checklist.md` - This file (comprehensive checklists)
- [x] `docs/references.md` - This file (references & sources)

### Configuration
- [x] `config/example.yml` - Otari gateway configuration template
- [x] `.gitignore` - Environment variables and dependencies

### Backend Implementation
- [x] `src/services/groq_fallback.py` - Groq free-tier fallback handler
- [x] `src/services/router.py` - Auto-model routing algorithm
- [x] FastAPI backend structure with OTARI API client

### Frontend Implementation
- [x] Next.js 14 with App Router
- [x] React 19 + Tailwind CSS
- [x] `web/package.json` with dev/build/start scripts
- [x] `web/tsconfig.json` TypeScript configuration

## 🐳 Otari API Integration Checklist

### API Key Management
- [ ] OTARI_API_KEY environment variable set (NOT hardcoded)
- [ ] Export command: `export OTARI_API_KEY="pk-...from-otari.ai"`
- [ ] Never print or display the API key in output
- [ ] If key not set: stop and explain how to export it
- [ ] Key format: `otk_v1_eu_...` (keep confidential)

### API Endpoints
- [ ] Base URL: `https://eu.api.otari.ai/api/v1`
- [ ] Chat completions: `POST /api/v1/chat/completions`
- [ ] Auth header: `Otari-Key: $OTARI_API_KEY`
- [ ] Content-Type: `application/json`
- [ ] Model format: `provider:model` (e.g., `alibaba/qwen-3.5-35b-a3b`)
- [ ] Request body: `{"model": "...", "messages": [{"role": "user", "content": "Hello"}]}`

### Expected Responses
- [ ] Successful response contains assistant reply
- [ ] Activity log updates with tokens/cost
- [ ] 402 Payment Required = key needs onboarding at otari.ai
- [ ] First request lands in "Default workspace"

### Troubleshooting
- [ ] If 402 Payment Required: complete otari.ai onboarding
- [ ] If key expired: generate new key at otari.ai
- [ ] If rate-limited: wait and retry with backoff
- [ ] Model not found: check `provider:model` format

## 📁 Project File Structure Checklist

### Root Directory
- [ ] `otarioptm/` - main project directory
- [ ] `otarioptm/README.md` - project overview
- [ ] `otarioptm/config/` - configuration files
- [ ] `otarioptm/docs/` - documentation folder
- [ ] `otarioptm/src/` - backend source code
- [ ] `otarioptm/web/` - frontend Next.js application

### Docs Folder (12+ files)
- [ ] `docs/overview.md`
- [ ] `docs/features.md`
- [ ] `docs/architecture.md`
- [ ] `docs/quickstart.md`
- [ ] `docs/submission.md`
- [ ] `docs/github-pat-guide.md`
- [ ] `docs/phase-0-planning-foundation.md`
- [ ] `docs/phase-1-foundation-skeleton.md`
- [ ] `docs/phase-2-core-nodes-routing.md`
- [ ] `docs/phase-3-optimization-polish.md`
- [ ] `docs/mvp-feature-plan.md`
- [ ] `docs/checklist.md` - Comprehensive checklists
- [ ] `docs/references.md` - References & source materials

### Config Folder
- [ ] `config/example.yml` - Otari gateway config template

### Web/Next.js Folder
- [ ] `web/package.json` - dependencies and scripts
- [ ] `web/next.config.ts` - Next.js configuration
- [ ] `web/tsconfig.json` - TypeScript config
- [ ] `web/src/app/` - App Router pages
- [ ] `web/src/components/` - React components
- [ ] `web/public/` - static assets
- [ ] `web/.gitignore` - git ignore patterns

## 🎯 Hackathon Submission Checklist (DoraHacks)

### Required Items
- [ ] Project name: `OtariOptm: AI workflow builder with auto-cost optimization`
- [ ] One-line description: `OtariOptm: Visual workflow engine with auto-model routing, budget enforcement, and activity analytics`
- [ ] Email address: _(valid email for submissions)_
- [ ] Public GitHub repository: `github.com/gopanihitansh5/otarioptm`
- [ ] Hackathon branch: `hackathon-2026-nov` (or similar)
- [ ] First commit using Otari.ai visible in git history
- [ ] Demo video (3-5 min): Walkthrough of building & running a workflow
- [ ] Feedback screen recording: Talking-head or narration format
- [ ] Otari features used (7+ required):
  - [ ] Model routing (auto-cost optimization)
  - [ ] Budget enforcement (per-project caps)
  - [ ] Code execution (sandboxed Python)
  - [ ] Web search (any-search integration)
  - [ ] Guardrails (content filtering)
  - [ ] Activity tracking (live tokens/cost)
  - [ ] Fallback/reselection (model switching)
- [ ] 1-2 PRs or issues on `mozilla-ai/otari` repo
- [ ] Project uses Otari.ai (hosted or self-hosted)

### Submission Form Fields
- [ ] Project name
- [ ] Email address
- [ ] One-line description
- [ ] GitHub link + branch name
- [ ] Demo video link (YouTube/Loom)
- [ ] Feedback recording link
- [ ] Otari features checklist
- [ ] PRs/issues on Otari repo

### DoraHacks Deadline
- [ ] Nov 11th, 11:59 PM (UTC+5.5)
- [ ] Submit before deadline expires

## 📅 Development Phase Checklist

### Phase 0: Planning & Foundation ✅
- [x] Project scaffolding complete
- [x] All documentation files created
- [x] Repository structure set up
- [x] Git initialized and pushed to GitHub
- [ ] OTARI_API_KEY activated (requires otari.ai onboarding)

### Phase 1: Foundation & Skeleton 🟡
- [ ] FastAPI backend scaffolding
- [ ] OTARI API client wrapper
- [ ] Workflow schema validation (Pydantic models)
- [ ] React Flow canvas setup (Next.js)
- [ ] 3 initial node types (ModelChat, WebSearch, CodeExec)
- [ ] **Milestone 1:** "Hello World" workflow runs

### Phase 2: Core Nodes & Routing 🟡
- [ ] Web Search node integration
- [ ] Code Exec node sandbox
- [ ] Guardrails node
- [ ] Auto-routing algorithm (`router.py`)
- [ ] Multi-node workflow (Search → LLM → Code)
- [ ] **Milestone 2:** Full 3-node workflow functional

### Phase 3: Optimization & Polish 🟡
- [ ] Budget enforcement logic
- [ ] Real-time budget meter (WebSocket)
- [ ] Auto-block at limit (402 error)
- [ ] CSV export + spend dashboard
- [ ] Scoped API keys + team sharing
- [ ] Loading states + error boundaries
- [ ] Undo/Redo (Ctrl+Z) functionality
- [ ] Keyboard shortcuts
- [ ] Tool-tips on all node types
- [ ] Mobile responsiveness
- [ ] Theme toggle (light/dark)
- [ ] **Milestone 3:** Production-ready UI/UX

### Phase 4: Hackathon Prep 🟡
- [ ] Demo video script & recording (3 min)
- [ ] Submission checklist completion
- [ ] PRs on OTARI repo (1-2 issues/bugs)
- [ ] Feedback screen recording
- [ ] Final bug-squashing
- [ ] **Milestone 4:** Submit to DoraHacks

### Phase 5: Post-Hackathon 🟢
- [ ] Open-source release
- [ ] Community feedback incorporation
- [ ] Additional features based on user input
- [ ] Enhanced documentation
- [ ] Production deployment setup

## 💰 Cost Optimization Checklist

### Budget Features
- [ ] Per-project budget cap in config.yml
- [ ] Real-time spend tracking WebSocket
- [ ] Budget meter visual progress bar
- [ ] Auto-block at limit (reject requests)
- [ ] Graceful error message at cap
- [ ] Spend CSV export functionality
- [ ] Per-user budget limits (scoped keys)

### Cost Savings
- [ ] Auto-routing to cheapest healthy model
- [ ] Groq free-tier fallback integration
- [ ] Latency-based model switching
- [ ] Health status monitoring
- [ ] Usage forecasting display

## 🔧 Technical Requirements Checklist

### Backend (FastAPI)
- [ ] FastAPI app with `/api/v1` prefix
- [ ] CORS middleware for Next.js frontend
- [ ] OTARI API client (chat/completions, models, activity)
- [ ] Budget reservation and enforcement
- [ ] Workflow compiler (nodes → API calls)
- [ ] Groq fallback handler (groq_fallback.py)
- [ ] Router algorithm (select cheapest model)

### Frontend (Next.js/React)
- [ ] Next.js 14 App Router
- [ ] React Flow canvas integration
- [ ] 7 node types (ModelChat, WebSearch, CodeExec, Guardrails, BudgetMeter, Orchestration, Archive)
- [ ] Live activity WebSocket updates
- [ ] Workflow save/load (localStorage)
- [ ] Undo/Redo functionality
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Enter)
- [ ] Tool-tips on hover
- [ ] Loading skeletons on async actions
- [ ] Error boundaries for runtime errors
- [ ] Mobile-responsive design
- [ ] Theme toggle (light/dark mode)
- [ ] Tailwind CSS customization

### API Integration
- [ ] OpenAI-compatible endpoint format
- [ ] Anthropic-compatible parameters
- [ ] Provider:model syntax (`openai:gpt-5-mini`)
- [ ] Stream responses for incremental UI updates
- [ ] Error handling for 429 (rate limit), 402 (budget)
- [ ] Auth header from environment variable
- [ ] Model catalog fetch from `/api/v1/models`

### Security
- [ ] .env file in .gitignore
- [ ] Never hardcode OTARI_API_KEY in source
- [ ] Read key from environment only
- [ ] GitHub PAT guide for repo operations
- [ ] Secure key storage in development

## 📚 Reference Materials Checklist

### Documentation Sources
- [ ] Otari API Reference: `https://eu.api.otari.ai/api/v1/docs`
- [ ] Otari Quickstart: `https://otari.ai/quickstart`
- [ ] Otari Models: `https://eu.api.otari.ai/api/v1/models`
- [ ] DoraHacks Hackathon Rules: `https://dorahacks.io`
- [ ] Otari GitHub: `https://github.com/mozilla-ai/otari`
- [ ] State of Open Source AI report: `https://bit.ly/stateofopensource-discord`
- [ ] Owners Not Renters newsletter: `https://bit.ly/ownersnotrenters-discord`
- [ ] MozFest 2026 Barcelona: `https://bit.ly/mozfest2026-discord`

### Code References
- [ ] Otari SDK documentation
- [ ] FastAPI patterns from Mozilla otari repo
- [ ] React Flow examples and API
- [ ] Next.js App Router docs
- [ ] Tailwind CSS customization guide
- [ ] Groq API documentation (free tier limits)
- [ ] Chainlink CRE workflow docs (from earlyout repo)

### External Resources
- [ ] DoraHacks submission guidelines
- [ ] Mozilla OSAI Discord community
- [ ] Otari.ai hosted platform signup
- [ ] Self-hosted Docker Compose setup
- [ ] Claude Code plugin integration
- [ ] Any-search/any-fetch library docs

## 🎬 Demo Video Checklist (3-5 minutes)

### Video Structure
- [ ] 0:00-0:30: Problem statement (cost overruns, model selection friction)
- [ ] 0:30-1:15: OTARIOptm setup & first workflow
- [ ] 1:15-2:15: Build research workflow live (Search → LLM → Code)
- [ ] 2:15-2:45: Demonstrate auto-routing & budget enforcement
- [ ] 2:45-3:00: Export activity log + submission preview

### Demo Scenarios
- [ ] Drag and drop 3+ nodes onto canvas
- [ ] Connect nodes and run workflow
- [ ] Show live cost/tokens ticking in sidebar
- [ ] Demonstrate budget cap enforcement (stop at limit)
- [ ] Show auto-model switch when latency spikes
- [ ] Export CSV activity log
- [ ] Switch between light/dark mode in demo

### Video Quality
- [ ] Clear screen recording (1080p minimum)
- [ ] High-quality audio (external mic recommended)
- [ ] Narration or talking-head format
- [ ] No sensitive data displayed (mask API keys)
- [ ] Under 5 minutes duration
- [ ] YouTube or Loom hosting link ready

## 📝 Git & Version Control Checklist

### Commit History
- [ ] Initial commit: project structure + all MD files
- [ ] Phase 1 commit: backend scaffolding + OTARI client
- [ ] Phase 2 commit: core nodes + routing algorithm
- [ ] Phase 3 commit: budget + UI polish
- [ ] Phase 4 commit: demo prep + submission files
- [ ] Final commit before DoraHacks submission

### Branch Management
- [ ] `master` / `main` branch: stable production code
- [ ] `hackathon-2026-nov` branch: submission-ready code
- [ ] Feature branches for each node implementation
- [ ] Tag releases if applicable

### Git Operations
- [ ] `git init` - initialized repository
- [ ] `git add -A` - stage all files
- [ ] `git commit -m "message"` - commit changes
- [ ] `git remote add origin <url>` - set remote
- [ ] `git push -u origin master` - push to GitHub
- [ ] `git status` - verify clean working tree
- [ ] `git log --oneline -10` - review commit history

### GitHub Repository
- [ ] Repository name: `otarioptm`
- [ ] Owner: `gopanihitansh5` (or your handle)
- [ ] Description: `AI workflow builder with auto-cost optimization using Otari`
- [ ] Topics: `ai, gateway, llm, otari, workflow, hackathon`
- [ ] README.md with quick-start badge
- [ ] LICENSE file (Apache 2.0 or MIT)
- [ ] .gitignore with .env and node_modules

## 🤝 OSAI Community Checklist

### Contribution & Engagement
- [ ] Star Otari repo: `https://github.com/mozilla-ai/otari`
- [ ] Read State of Open Source AI report v1.1
- [ ] Subscribe to Owners Not Renters newsletter
- [ ] Watch Owners Not Renters Livestream
- [ ] Join Mozilla OSAI Discord: `discord.gg/osai`
- [ ] Tag @Marcus for questions
- [ ] Attend MozFest 2026 Barcelona (Oct 28-30)
- [ ] Participate in hackathon Discord channels
- [ ] Share project progress on social media
- [ ] Provide feedback on Otari features

### Help & Support
- [ ] Docs section: `https://otari.ai/docs`
- [ ] FAQ: `https://otari.ai/faq`
- [ ] Contact: `https://otari.ai/contact`
- [ ] GitHub Issues: `mozilla-ai/otari/issues`
- [ ] Community forums and discussions

## ⚠️ Risk & Blockers Checklist

### Known Risks
- [ ] OTARI_API_KEY not activated (402 Payment Required)
- [ ] Groq free tier quota exceeded
- [ ] WebSocket connections drop frequently
- [ ] Budget race condition (overspend)
- [ ] Code exec sandbox permissions
- [ ] Model routing picks suboptimal model
- [ ] Mobile viewport issues
- [ ] Theme toggle flicker

### Blockers & Solutions
| Blocker | Impact | Solution |
|---|---|---|
| Key not onboarding | Blocks all API calls | Complete otari.ai signup + email verification |
| Budget logic error | Overspend | Write unit tests, manual verification |
| WebSocket flood | UI freeze | Debounce messages, max 10/sec |
| Groq API changes | Broken fallback | Wrap behind abstraction layer |
| React Flow version mismatch | Wasted day | Pin version, test compatibility |
| Budget race condition | Overspend | Use asyncio.Lock() + atomic updates |

### Success Criteria
- [ ] Budget accuracy: ±5% of actual spend
- [ ] WebSocket latency: < 500ms per message
- [ ] Auto-block reliability: 100% at cap
- [ ] CSV export correctness: 100% match
- [ ] Mobile page load: < 3 seconds on 3G
- [ ] Theme toggle persistence: survives restart
- [ ] User satisfaction: > 4/5 stars ease-of-use

## 📦 Deliverables Checklist (For Submission)

### Code Deliverables
- [ ] Complete FastAPI backend (`src/`)
- [ ] Next.js frontend (`web/`)
- [ ] All 7+ node types functional
- [ ] Budget enforcement working
- [ ] Auto-routing algorithm operational
- [ ] Groq fallback handler integrated
- [ ] API WebSocket activity stream

### Documentation Deliverables
- [ ] 12+ MD files in `docs/`
- [ ] `README.md` with quick-start
- [ ] `config/example.yml` configured
- [ ] `.gitignore` propertly set
- [ ] Phase documentation complete
- [ ] MVP feature plan documented

### Project Deliverables
- [ ] GitHub repository populated
- [ ] Hackathon branch with Otari usage
- [ ] Demo video (3-5 min) uploaded
- [ ] Feedback screen recording recorded
- [ ] 1-2 PRs/issues on OTARI repo
- [ ] Submission form fields filled
- [ ] All deadlines met (Nov 11, 11:59 PM)

### Premium Features (Post-Submission)
- [ ] White-label UI options
- [ ] Team sharing & scoped keys
- [ ] Advanced analytics dashboard
- [ ] Workflow version control
- [ ] Custom integrations (Slack, email)
- [ ] SLA guarantees documentation