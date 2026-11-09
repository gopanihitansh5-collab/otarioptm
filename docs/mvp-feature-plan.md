# OtariOptm: MVP Feature Plan & Add-on Services

## 🎯 MVP (Minimum Viable Product) - Hackathon Ready

### Core MVP Features (Phase 1-2 Essential)

| Feature | Description | Priority | Effort | Deliverable |
|---|---|---|---|---|
| **Visual Workflow Composer** | Drag-and-drop node canvas to build AI agents | P0 | 3 days | React Flow canvas with node palette |
| **Model Chat Node** | Standard LLM chat via OTARI gateway | P0 | 1 day | `POST /chat/completions` integration |
| **Auto-Model Routing** | Smart selection based on cost/latency/health | P0 | 2 days | `src/services/router.py` algorithm |
| **Budget Enforcement** | Per-project cap with real-time meter | P0 | 2 days | Budget meter + auto-block at limit |
| **Activity Dashboard** | Live tokens/cost tracking WebSocket | P1 | 1 day | Sidebar progress bar + CSV export |
| **Code Exec Node** | Sandboxed Python execution | P1 | 2 days | `code-exec` profile + output display |
| **Web Search Node** | Live search integration | P1 | 2 days | `any-search` + LLM summary |
| **Guardrails Node** | Content filtering | P1 | 1 day | Regex/PII detection node |

### MVP Success Criteria
- [ ] Drag 3+ nodes, connect them, run workflow
- [ ] Live cost/tokens display in sidebar
- [ ] Budget blocks at configured cap
- [ ] Auto-routing selects cheapest healthy model
- [ ] Demo video-ready (3-min walkthrough)

---

## 📦 Add-on Services (Post-MVP Enhancements)

### Phase 3-4: Polish & Scale

| Service | Description | Value Prop | Effort |
|---|---|---|---|
| **Team Sharing** | Scoped API keys + project budgets | Collaborative work, cost sharing | 3 days |
| **Workflow Library** | Public/private workflow marketplace | Reuse proven patterns | 2 days |
| **Model Fine-tuning** | integrate with OTARI's training pipeline | Custom model optimization | 5 days |
| **Audit Logs** | Complete request/response history | Compliance, debugging | 2 days |
| **Multi-user Dashboard** | Team-wide activity analytics | Ops visibility | 3 days |
| **API Key Generator** | On-demand key creation with scopes | Self-service onboarding | 1 day |
| **Usage Forecasting** | AI-predicted spend for next 30 days | Budget planning | 3 days |
| **Custom Integrations** | Slack, Email, Zapier hooks | Workflow automation | 5 days |
| **SSO Login** | Google/GitHub OAuth | One-click access | 2 days |
| **Edge Caching** | Response caching for frequent queries | Latency reduction, cost save | 3 days |

### Premium Features (SaaS Tier)

| Feature | Description | Revenue Potential |
|---|---|---|
| **White-label UI** | Custom branding for enterprises | High-margin contracts |
| **SLA Guarantees** | 99.9% uptime, priority routing | Enterprise sales |
| **Advanced Analytics** | Funnel analysis, conversion tracking | Premium tier |
| **Webhook System** | Event-driven integrations | Developer ecosystem |
| **Version Control** | Workflow git-like versioning | Team collaboration |
| **Reserved Concurrency** | guaranteed model throughput | High-volume users |
| **Custom Domain** | Branded API endpoint (api.yourcompany.com) | White-label |

---

## 🏗 Architecture & Data Flow

```
┌─────────────────────────────────────────────────┐
│          OTARI OPTIMIZATION LAYER              │
├─────────────────────┬───────────────────────┤
│                     │                       │
│   ┌────────────────▼─────────────────┐       │
│   │  1. Visual Composer (Next.js)     │       │
│   │    - React Flow canvas            │       │
│   │    - Node palette (7 types)       │       │
│   │    - Live connections preview     │       │
│   └───────┬──────────────────┬───────┘       │
│           │                  │                │
│           ▼                  ▼                │
│   ┌────────────────▼─────────────────┐       │
│   │  2. Backend (FastAPI)            │       │
│   │    - Workflow compiler           │       │
│   │    - Budget service              │       │
│   │    - Router algorithm            │       │
│   │    - Groq fallback handler       │       │
│   │    - OTARI API client            │       │
│   └───────┬──────────────────┬───────┘       │
│           │                  │                │
│           ▼                  ▼                │
│   ┌────────────────▼─────────────────┐       │
│   │  3. OTARI Gateway (hosted or     │       │
│   │    self-hosted)                  │       │
│   │    - Model routing               │       │
│   │    - Budget enforcement          │       │
│   │    - Code exec sandbox           │       │
│   │    - Web search integration      │       │
│   │    - Activity tracking           │       │
│   └───────┬──────────────────┬───────┘       │
│           │                  │                │
│           ▼                  ▼                │
│   ┌────────────────▼─────────────────┐       │
│   │  4. Provider APIs (40+ providers)│       │
│   │    - OpenAI, Anthropic, etc.     │       │
│   │    - Groq (free fallback)        │       │
│   └─────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## 💰 Cost Optimization Strategy

### How OtariOptm Saves Money

| Mechanism | Impact | Implementation |
|---|---|---|
| **Auto-routing to cheapest healthy model** | 40-60% cost reduction | `router.py` scores models by (cost/quality/latency) |
| **Budget enforcement** | Prevents bill shocks | `budget.py` reserves per-request, blocks at cap |
| **Groq free fallback** | Zero-cost fallback when OTARI exhausted | `groq_fallback.py` with free tier models |
| **Spill-over past rate limits** | Uninterrupted workflows | Circuit-breaker → secondary model |
| **Usage tracking & forecasting** | Better budget planning | WebSocket + historical analysis |

### Sample Cost Comparison

| Workflow Step | Without OtariOptm | With OtariOptm | Savings |
|---|---|---|---|
| 1000 chat completions | $0.03/req (Claude) → $30 | $0.012/req (gpt-5-mini) → $12 | $18/mo |
| 500 web searches | $0.016/req (default) → $8 | $0.008/req (mixtral via Groq) → $4 | $4/mo |
| 200 code exec calls | $0.025/req (with timeout) → $5 | Free tier (Groq) → $0 | $5/mo |
| **Total Monthly** | **$43** | **$16** | **$27 savings** |

---

## 🚀 Execution Roadmap

### Week 1 (Phase 1): Foundation & Skeleton
- [ ] Next.js app router setup (`src/app/`)
- [ ] OTARI API client integration
- [ ] Basic workflow schema (Pydantic models)
- [ ] React Flow canvas with 3 node types
- **Milestone:** "Hello World" workflow runs

### Week 2 (Phase 2): Core Nodes
- [ ] Web Search node integration
- [ ] Code Exec node sandbox
- [ ] Guardrails node
- [ ] Auto-routing algorithm
- **Milestone:** Full 3-node workflow (Search → LLM → Code)

### Week 3 (Phase 3): Optimization & Polish
- [ ] Budget meter + auto-block
- [ ] CSV export + spend dashboard
- [ ] Loading states + error boundaries
- [ ] Undo/Redo + keyboard shortcuts
- **Milestone:** Production-ready UI/UX

### Week 4 (Phase 4): Hackathon Prep
- [ ] Demo video script & recording
- [ ] Submission checklist completion
- [ ] PRs on OTARI repo
- [ ] Feedback screen recording
- **Milestone:** Submit to DoraHacks

---

## 📊 Success Metrics

| Metric | Target (MVP) | Measurement |
|---|---|---|
| **Workflow success rate** | > 90% | End-to-end tests |
| **Budget accuracy** | ±5% of actual | Comparison log |
| **Auto-routing savings** | 40% vs. fixed model | Cost tracking |
| **API response time** | < 3s average | Performance log |
| **Node connection reliability** | 100% | UI test suite |
| **Mobile compatibility** | Works on Chrome/iOS | Device testing |

---

## 🎨 UI/UX Design Principles

1. **Premium Feel** – Clean typography, subtle animations, consistent spacing
2. **Clear Feedback** – Every action has immediate visual response
3. **Progressive Disclosure** – Advanced features reveal on demand
4. **Error Prevention** – Confirmations before destructive actions
5. **Accessibility** – Color contrast > 4.5:1, keyboard navigation
6. **Performance-first** – Time-to-interactive < 2s on fiber

### Color Palette (Premium Tech)
- **Primary:** `#0F172A` (Slate 900 – deep navy)
- **Secondary:** `#1E293B` (Slate 800 – medium dark)
- **Accent:** `#3B82F6` (Blue 500 – bright action)
- **Success:** `#10B981` (Emerald 500 – positive actions)
- **Warning:** `#F59E0B` (Amber 500 – warnings/caution)
- **Error:** `#EF4444` (Rose 500 – errors/destructive)
- **Background:** `#F8FAFC` (Slate 50 – canvas)
- **Card:** `#FFFFFF` (White – containers)

### Typography
- **Font Family:** `Inter, system-ui, -apple-system, sans-serif`
- **Headings:** `font-medium, text-lg, font-sans`
- **Body:** `font-normal, text-base, leading-relaxed`
- **Mono:** `font-mono, text-sm, for code nodes`

---

## 🔧 Technical Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SEO-friendly, server components, built-in routing |
| **UI Library** | Custom + Tailwind CSS | Full design control, premium aesthetics |
| **State Management** | React Query + SWR | Server data caching, automatic revalidation |
| **Routing** | Next.js `/app/` router | File-based routes, layout stability |
| **Backend** | FastAPI + SQLAlchemy | OTARI compatibility, Python ecosystem |
| **API Protocol** | OpenAI/Anthropic compatible | One-key works with any SDK |
| **Deployment** | Vercel (frontend) + Render/Docker (backend) | Hassle-free, scalable |
| **Styling** | Tailwind JIT + custom components | Fast development, responsive |

---

## 📦 Git & Repository Setup

### Initial Commit History
```
git init
# Phase 0: Add all docs, config, MD files
git add -A
git commit -m "feat: initial project structure with documentation"

# Phase 1: Add backend scaffolding
git add src/
git commit -m "feat: FastAPI backend with OTARI client"

# Phase 2: Add node implementations
git add src/nodes/ web/src/
git commit -m "feat: Core nodes (chat, search, code, guardrails)"

# Phase 3: Add budget + polish
git add src/services/budget.py web/src/components/
git commit -m "feat: Budget enforcement + UI polish"

# Phase 4: Hackathon prep
git add docs/mvp-feature-plan.md
git commit -m "docs: MVP feature plan & success metrics"

# Final push
git remote add origin git@github.com:your-handle/otarioptm.git
git branch -M main
git push -u origin main
```

### .gitignore Template
```gitignore
# Dependencies
node_modules/
/.pnp
.pnp.js

# Dependency lockfile
package-lock.json
yarn.lock
npm-debug.log

# Production
/.next/
out/

# Environment
.env

# OTARI config
otari.conf.yml

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log

# Mac
.DS_Store
```

---

## 🎬 Demo Video Script (3 Minutes)

### Scene 1: Problem (0:00-0:45)
- **Visual:** Developer frustrated looking at LLM bill
- **Narration:** "Tired of surprise bills? Can't choose the right model?"
- **Problem Stat:** "Model selection friction + cost overruns"

### Scene 2: Setup (0:45-1:15)
- **Visual:** OTARIOptm dashboard, sign-up flow
- **Narration:** "One API key. 40+ providers. Automatic optimization."
- **CTA:** "Connect your Otari.ai key in 30 seconds"

### Scene 3: Build Workflow (1:15-2:15)
- **Visual:** Drag Model Chat → Web Search → Code Exec nodes
- **Actions:** 
  1. Set model: `openai:gpt-5-mini`
  2. Search: "latest AI funding news"
  3. Code: `print(f"Summary: {user_input}")`
- **Live:** Sidebar shows tokens ticking, cost incrementing
- **Auto-route:** System switches from Claude → Mixtral when latency spikes

### Scene 4: Budget Enforcement (2:15-2:45)
- **Visual:** Budget meter turns red at $5.00 cap
- **Action:** User attempts 6th run
- **Result:** Modal: "Budget exceeded: $5.20 / $5.00. Request blocked."
- **Narration:** "Spending caps stop requests before they overrun"

### Scene 5: Export & Share (2:45-3:00)
- **Visual:** CSV download, shared workflow link
- **Narration:** "Export activity logs, share with team, iterate faster."
- **CTA:** "Start free on otari.ai today"

### Voiceover Template
> "Meet OtariOptm – the AI workflow engine that chooses the right model, enforces your budget, and gives you full visibility into every token and dollar spent. No more surprise bills. No more guesswork. Just powerful AI agents built in minutes, not months. Try it free at otari.ai."

---

## 📋 Checklist: Is OtariOptm MVP Ready?

### Core Functionality ✅
- [ ] Next.js frontend renders without errors
- [ ] OTARI API key authenticates successfully
- [ ] Model chat node returns real response
- [ ] Budget meter shows live spend
- [ ] Auto-routing selects different models
- [ ] Budget blocks at configured cap

### UI/UX ✅
- [ ] Premium color palette applied
- [ ] Responsive on mobile (Chrome dev tools)
- [ ] Keyboard shortcuts working (Ctrl+Z, Enter)
- [ ] Loading spinners on all async actions
- [ ] Error boundaries catch failures gracefully

### Demo Ready ✅
- [ ] 3-minute demo script prepared
- [ ] Workflow scenario rehearsed
- [ ] Cost optimization showcase ready
- [ ] Budget enforcement demo prepared
- [ ] Export functionality tested

### Submission ✅
- [ ] GitHub repo populated with commits
- [ ] Branch `hackathon-2026-nov` created
- [ ] Demo video link ready (YouTube/Loom)
- [ ] Feedback screen recording prepared
- [ ] 1-2 OTARI PRs/issues identified

---

## 🚦 Go/No-Go Decision Points

### Go to Next Phase When:
- [ ] All "Core Functionality" items ✅
- [ ] Demo scenario runs end-to-end without manual fixes
- [ ] Budget enforcement works 100% of test cases
- [ ] Mobile viewport is functional
- [ ] No critical bugs in last 24h

### Stay & Fix When:
- [ ] Auto-routing picks wrong model > 50% of time
- [ ] Budget meter shows incorrect spend
- [ ] WebSocket connections drop frequently
- [ ] Code exec sandbox has permission errors
- [ ] Demo video scenario fails

---

## 📞 Help & Resources

### Documentation Links
- [OTARI API Reference](https://eu.api.otari.ai/api/v1/docs)
- [Groq Free Tier Docs](https://groq.com/docs)
- [React Flow Examples](https://reactflow.dev/examples)
- [Next.js App Router Docs](https://nextjs.org/docs/app)

### Community
- [Mozilla OSAI Discord](https://discord.gg/osai)
- [Otari GitHub Discussions](https://github.com/mozilla-ai/otari/discussions)
- [Hackathon #OtariOptm Channel](https://discord.com/channels/...)

### Quick Commands
```bash
# Start development
cd otarioptm
uv run otari serve --config config/example.yml  # backend
cd web && npm run dev                           # frontend

# Test OTARI call
curl -X POST "https://eu.api.otari.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer $OTARI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai:gpt-5-mini", "messages": [{"role":"user","content":"Hello"}]}'

# Run backend tests
cd otarioptm && python -m pytest tests/ -v

# Type check frontend
cd web && npx tsc --noEmit
```

---

**🎯 MVP Definition Summary:**

**Must-have for Hackathon Submission:**
1. Visual workflow composer (drag-and-drop)
2. Model chat node with real OTARI responses
3. Auto-model routing (cost + latency optimization)
4. Budget enforcement with auto-block
5. Live activity dashboard
6. All 5 core nodes functional (chat, search, code, guardrails + router)
7. Demo video (3 min) showcasing cost optimization
8. GitHub repo with commit history
9. Submission checklist completed

**Nice-to-have (Post-hackathon):**
- Team sharing & scoped keys
- Workflow library marketplace
- Advanced analytics dashboard
- Custom integrations (Slack, email)
- SaaS premium features

**🏁 Phase 1 Start:** Next.js setup + OTARI API client integration
**🏁 Phase 1 End:** "Hello World" workflow runs successfully