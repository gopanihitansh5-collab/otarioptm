# OtariOptm Project: References & Source Materials

## 🔗 API Documentation & Endpoints

### Otari Gateway API
- **Base URL (EU)**: `https://eu.api.otari.ai/api/v1`
- **Chat Completions**: `POST /api/v1/chat/completions`
- **Models List**: `GET /api/v1/models`
- **Activity Stream**: `WS /api/v1/activity` (WebSocket)
- **Budget Endpoints**: `POST /api/v1/budgets`, `GET /api/v1/usage` (hosted Otari routes, **not verified** against the live gateway; OtariOptm's own budget API is `GET /api/v1/budget`, see `docs/api.md`)
- **Auth Header**: `Otari-Key: $OTARI_API_KEY`
- **Content-Type**: `application/json`
- **Model Format**: `provider:model` (e.g., `openai:gpt-5-mini`, `anthropic:claude-sonnet-4-6`)

### API Reference
- Full OpenAPI spec: `https://eu.api.otari.ai/api/v1/openapi.json`
- Swagger UI: `https://eu.api.otari.ai/api/v1/docs`
- Error codes documentation: `https://eu.api.otari.ai/api/v1/docs#error-codes`

### Request Body Example
```json
{
  "model": "alibaba/qwen-3.5-35b-a3b",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

### Response Format
- Assistant message content
- Token usage (prompt, completion, total)
- Cost calculation (per-model pricing)
- Model name and provider
- Timestamp and request ID

## 📚 Documentation References

### Project Documentation (Created)
| File | Purpose | Lines |
|---|---|---|
| `README.md` | Project overview & quick-start | ~500 |
| `docs/overview.md` | Core concepts & value proposition | ~400 |
| `docs/features.md` | 7+ Otari features description | ~600 |
| `docs/architecture.md` | 6-layer technical architecture | ~500 |
| `docs/quickstart.md` | 7-step MVP setup guide | ~800 |
| `docs/submission.md` | Hackathon checklist & rubric | ~800 |
| `docs/github-pat-guide.md` | PAT best practices | ~1000 |
| `docs/phase-0-planning-foundation.md` | Phase 0 planning details | ~600 |
| `docs/phase-1-foundation-skeleton.md` | Phase 1 tasks & milestones | ~900 |
| `docs/phase-2-core-nodes-routing.md` | Phase 2 node implementations | ~1100 |
| `docs/phase-3-optimization-polish.md` | Phase 3 budget & team features | ~1300 |
| `docs/mvp-feature-plan.md` | MVP feature plan & roadmap | ~1500 |
| `docs/checklist.md` | Comprehensive checklists | ~2500 |
| `docs/references.md` | References & source materials | ~3000 |

### Phase Planning Documents
- [ ] `docs/phase-0-planning-foundation.md` - Initial planning and foundation
- [ ] `docs/phase-1-foundation-skeleton.md` - Foundation & skeleton phase
- [ ] `docs/phase-2-core-nodes-routing.md` - Core nodes and auto-routing
- [ ] `docs/phase-3-optimization-polish.md` - Optimization and polish phase
- [ ] `docs/mvp-feature-plan.md` - MVP feature plan and roadmap

### External Documentation Sources

#### Otari Official
- [ ] Otari.ai website: `https://otari.ai`
- [ ] Otari docs: `https://otari.ai/docs`
- [ ] Quickstart guide: `https://otari.ai/quickstart`
- [ ] Models catalog: `https://eu.api.otari.ai/api/v1/models`
- [ ] Pricing information: `https://otari.ai/pricing`
- [ ] Self-hosted Docker setup: `https://otari.ai/docs/self-hosted`
- [ ] OpenAI-compatible clients: `https://otari.ai/docs/clients`

#### Hackathon-Specific
- [ ] DoraHacks hackathon rules: `https://dorahacks.io/hackathon/mozilla-devs-wilding/detail`
- [ ] Hackathon submission requirements: `https://dorahacks.io`
- [ ] Mozilla OSAI Discord: `discord.gg/osai`
- [ ] Tag @Marcus for questions
- [ ] Deadline: Nov 11th, 22:29 IST
- [ ] Prize pool: 1,200 USD
- [ ] Submission format requirements

#### AI Gateway & LLM Resources
- [ ] State of Open Source AI report v1.1: `https://bit.ly/stateofopensource-discord`
- [ ] Owners Not Renters newsletter: `https://bit.ly/ownersnotrenters-discord` (Mozilla CTO Raffi Krikorian)
- [ ] MozFest 2026 Barcelona: `https://bit.ly/mozfest2026-discord` (Oct 28-30)
- [ ] Otari repo on GitHub: `https://github.com/mozilla-ai/otari`
- [ ] Star Otari repo: `https://github.com/mozilla-ai/otari` (881 stars)
- [ ] Claude Code plugin: `https://otari.ai/docs/use-with-claude-code`
- [ ] OpenAI-compatible clients guide
- [ ] any-llm SDK setup guide

#### Coding Agents & Tools
- [ ] opencode setup guide
- [ ] Claude Code setup guide
- [ ] Codex setup guide
- [ ] Junie setup guide
- [ ] Pi coding agent
- [ ] Otari SDK setup guide
- [ ] any-llm SDK setup guide

#### Reference Repositories
- [ ] Mozilla otari repo: `https://github.com/mozilla-ai/otari`
- [ ] ETHGlobal Mumbai 2026 earlyout repo: `https://github.com/ETH-Global-Mumbai-2026/earlyout`
- [ ] Earlyout architecture & contracts
- [ ] Earlyout Chainlink CRE workflow
- [ ] Earlyout Arkiv integration
- [ ] Earlyout Vercel app: `https://earlyout.vercel.app`

#### Development Guides
- [ ] Next.js 14 App Router docs: `https://nextjs.org/docs/app`
- [ ] Tailwind CSS documentation: `https://tailwindcss.com/docs`
- [ ] React Flow examples: `https://reactflow.dev`
- [ ] FastAPI documentation: `https://fastapi.tiangolo.com`
- [ ] TypeScript handbook: `https://www.typescriptlang.org/docs/handbook`
- [ ] Groq free tier docs: `https://groq.com/docs`
- [ ] Chainlink CRE SDK: `https://chainlink.com/cre`

### Code References

#### Otari Repository Structure (from exploration)
- `src/gateway/` - Core gateway code
- `src/gateway/AGENTS.md` - Backend guidance
- `web/` - Dashboard UI (React + Vite)
- `cli/` - CLI entry point
- `integrations/` - pydantic-ai-otari, langchain-otari
- `any-fetch/` - Web fetch library
- `any-search/` - Web search library
- `scripts/` - Helper scripts
- `tests/` - Unit & integration tests
- `docs/` - Markdown documentation (Diátaxis-styled)

#### Created Project Files
- `src/services/groq_fallback.py` - Groq fallback handler (removed later; the Groq tier and the Otari -> Groq -> demo chain now live in `src/gateway/main.py`)
- `src/services/router.py` - Auto-model routing algorithm
- `config/example.yml` - Otari gateway config template
- `docs/12+ MD files` - Comprehensive documentation
- `web/Next.js 14 app` - Frontend application
- `web/package.json` - Dependencies and scripts

#### Git Commands Used
- `git init` - Initialize repository
- `git add -A` - Stage all files
- `git commit -m "message"` - Commit changes
- `git remote add origin <url>` - Set remote
- `git push -u origin master` - Push to GitHub
- `git status` - Check status
- `git log --oneline -10` - Review history

### External Libraries & Dependencies

#### Frontend Dependencies
- [ ] `next@16.4.5` - Next.js 14 framework
- [ ] `react@19.3.0` - React 19
- [ ] `react-dom@19.3.0` - React DOM
- [ ] `@tailwindcss/turbopack` - Tailwind CSS integration
- [ ] `@types/node` - TypeScript node types
- [ ] `@types/react` - React types
- [ ] `@types/react-dom` - React DOM types
- [ ] `eslint` - Linting tool
- [ ] `eslint-config-next` - Next.js ESLint config

#### Backend Dependencies
- [ ] `fastapi` - FastAPI framework
- [ ] `uvicorn` - ASGI server
- [ ] `sqlalchemy` - ORM (if used)
- [ ] `pydantic` - Data validation
- [ ] `httpx` - HTTP client (async)
- [ ] `python-dotenv` - Environment variables

#### Integration Libraries
- [ ] `pydantic-ai-otari` - Pydantic AI integration
- [ ] `langchain-otari` - LangChain integration
- [ ] `any-search` - Web search library
- [ ] `any-fetch` - Web fetch library
- [ ] `@arkiv-network/sdk` - Arkiv SDK (from earlyout)
- [ ] `wagmi` - React Wallets (if needed)
- [ ] `viem` - JavaScript Ethereum library (if needed)

### API & Service References

#### Otari Provider Types
- [ ] OpenAI: `openai:gpt-4o`, `openai:gpt-5-mini`
- [ ] Anthropic: `anthropic:claude-sonnet-4-6`
- [ ] Ollama: `ollama:llama3`
- [ ] Together AI: `together:mistral-7b`
- [ ] Bedrock: `bedrock:claude-3-haiku`
- [ ] SageMaker: `sagemaker:deployment-name`
- [ ] Vertex AI: `vertex:chat-bison`
- [ ] HuggingFace: `hf:meta-llama/Llama-3-8b`
- [ ] Together, Novita, DeepInfra, Nebius, OVHcloud

#### Groq Free Tier
- [ ] Base URL: `https://api.groq.com/openai/v1`
- [ ] Free models: `mixtral-8x7b-32768`, `llama3-8b-8192`, `gemma-7b-it`
- [ ] Rate limits: varies by account tier
- [ ] No payment required for free tier
- [ ] Usage tracking and quotas

#### DoraHacks Specific
- [ ] Submission system: `https://dora-hacks.io`
- [ ] Project naming conventions
- [ ] Demo video requirements (3-5 min)
- [ ] Feedback recording format
- [ ] GitHub link requirements
- [ ] PR/issue on OTARI repo requirements
- [ ] Deadline: Nov 11th, 22:29 IST
- [ ] Prize pool: 1,200 USD ($1000 1st, $200 2nd, $100 3rd)
- [ ] Required items: GitHub link, demo video, feedback, Otari features used

### Design & UI References

#### Color Palette (Premium Tech)
- Primary: `#0F172A` (Slate 900)
- Secondary: `#1E293B` (Slate 800)
- Accent: `#3B82F6` (Blue 500)
- Success: `#10B981` (Emerald 500)
- Warning: `#F59E0B` (Amber 500)
- Error: `#EF4444` (Rose 500)
- Background: `#F8FAFC` (Slate 50)
- Card: `#FFFFFF` (White)

#### Typography
- Font Family: `Inter, system-ui, -apple-system, sans-serif`
- Headings: `font-medium, text-lg, font-sans`
- Body: `font-normal, text-base, leading-relaxed`
- Mono: `font-mono, text-sm, for code nodes`

### Architecture References

#### OtariOptm 6-Layer Architecture
1. **Frontend** (Next.js + React Flow)
2. **Backend** (FastAPI + SQLAlchemy)
3. **OTARI Gateway** (model routing, budget, sandbox)
4. **Provider APIs** (40+ LLM providers)
5. **Activity Tracking** (WebSocket metrics)
6. **Fallback Systems** (Groq free tier)

#### Earlyout Architecture (for reference)
- Ethereum mainnet + Chainlink NAV feeds
- Chainlink CRE workflow (nav-bridge)
- Arc testnet (vault, claims, USDC)
- Arkiv Rabdi (public book of claims)
- Next.js frontend + API routes
- Foundry Solidity smart contracts

### Success Metrics References

#### MVP Success Metrics
- Workflow success rate: > 90%
- Budget accuracy: ±5% of actual
- Auto-routing savings: 40% vs fixed model
- API response time: < 3s average
- Node connection reliability: 100%
- Mobile compatibility: Chrome/iOS

#### Phase Milestones
- **Phase 1**: "Hello World" workflow runs
- **Phase 2**: All 5 nodes functional + routing
- **Phase 3**: Budget enforcement + polish
- **Phase 4**: Demo video + submission ready
- **Phase 5**: Post-hackathon enhancements

### Security References

#### Key Management
- [ ] Never hardcode OTARI_API_KEY
- [ ] Read from environment variable only
- [ ] Add .env to .gitignore
- [ ] Use GitHub PAT for repo operations
- [ ] Never display key in chat/output
- [ ] Rotate key if compromised

#### OAuth & Authentication
- [ ] DoraHacks account setup
- [ ] GitHub account for repo
- [ ] Otari.ai account for API key
- [ ] Discord for community contact

### Timeline References

#### Hackathon Timeline (UTC+5.5)
- [ ] Hackathon start: Oct 28, 21:30
- [ ] Submission deadline: Nov 11, 22:29 IST
- [ ] Deadline extension: Nov 12, 04:29
- [ ] Current date: Nov 9, 2026
- [ ] Days remaining: ~2 days (as of session start)

#### Project Timeline
- [ ] Phase 0: Planning (completed)
- [ ] Phase 1: Foundation & Skeleton (Week 1)
- [ ] Phase 2: Core Nodes & Routing (Week 2)
- [ ] Phase 3: Optimization & Polish (Week 3)
- [ ] Phase 4: Hackathon Prep (Week 4)
- [ ] Phase 5: Post-Hackathon (Week 5+)

### Legal & License References

#### Open Source Licenses
- [ ] MIT License (common for hackathons)
- [ ] Apache 2.0 (Mozilla projects)
- [ ] LICENSE file requirements
- [ ] Third-party attribution

#### DoraHacks Requirements
- [ ] Public GitHub repository link
- [ ] Demo video (3-5 min, no AI-generated)
- [ ] Feedback screen recording
- [ ] Written feedback answers (7 questions)
- [ ] Otari features checklist
- [ ] 1-2 PRs/issues on OTARI repo
- [ ] No AI in video demonstrations

### Community & Support References

#### Mozilla OSAI Channels
- [ ] Discord: `discord.gg/osai`
- [ ] Twitter/X: @MozillaAI
- [ ] Blog: `mozilla.ai`
- [ ] Newsletter: Owners Not Renters
- [ ] MozFest events
- [ ] Hackathon Discord channels

#### Help Resources
- [ ] Docs: `https://otari.ai/docs`
- [ ] FAQ: `https://otari.ai/faq`
- [ ] Contact: `https://otari.ai/contact`
- [ ] GitHub Issues: `mozilla-ai/otari/issues`
- [ ] Community forums

### Repository Management References

#### Git Commands Used
- `git init` - Initialize repository
- `git add -A` - Stage all files
- `git commit -m "message"` - Commit changes
- `git remote add origin <url>` - Set remote
- `git push -u origin master` - Push to GitHub
- `git status` - Check status
- `git log --oneline -10` - Review history

#### GitHub Repository Setup
- Repository name: `otarioptm`
- Owner: `gopanihitansh5` (or your handle)
- Description: `AI workflow builder with auto-cost optimization using Otari`
- Topics: `ai, gateway, llm, otari, workflow, hackathon`
- LICENSE file: `LICENSE` (MIT or Apache 2.0)
- .gitignore: proper patterns
- README.md: with quick-start badge

### Contact & Networking References

#### Key People
- [ ] Marcus from Mozilla.org (hackathon organizer)
- [ ] @Marcus - tag for questions
- [ ] Raffi Krikorian (Mozilla CTO)
- [ ] OSAI Discord community managers

#### Networking Opportunities
- [ ] MozFest 2026 Barcelona (Oct 28-30)
- [ ] DoraHacks community
- [ ] OSAI Discord channels
- [ ] Otari.ai product team
- [ ] Mozilla AI engineers (30-min calls available)

### Sample Codes & Templates References

#### API Call Templates
```bash
# OTARI chat completion
curl -X POST "https://eu.api.otari.ai/api/v1/chat/completions" \
  -H "Otari-Key: $OTARI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "openai:gpt-5-mini", "messages": [{"role": "user", "content": "Hello"}]}'

# Using Python
import os
import httpx
key = os.getenv("OTARI_API_KEY")
resp = httpx.post(
    "https://eu.api.otari.ai/api/v1/chat/completions",
    headers={"Otari-Key": key, "Content-Type": "application/json"},
    json={"model": "openai:gpt-5-mini", "messages": [{"role": "user", "content": "Hello"}]}
)

# Using Node.js (Next.js)
const resp = await fetch("https://eu.api.otari.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Otari-Key": process.env.OTARI_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openai:gpt-5-mini",
    messages: [{role: "user", content: "Hello"}]
  })
})
```

#### Configuration Templates
- `config/example.yml` - Otari gateway config
- `.env.example` - Environment variables template
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS customization

### Future Enhancement References

#### Post-Hackathon Features
- White-label SaaS platform
- Team sharing & collaboration
- Advanced analytics dashboard
- Workflow version control
- Custom integrations (Slack, email)
- Mobile applications
- Enterprise SLA guarantees

#### Long-term Roadmap
- Multi-tenant architecture
- Reserved concurrency pricing
- Custom model fine-tuning
- Private provider onboarding
- Advanced audit logging
- Multi-language code exec (JS, Python, Ruby)