# Phase 0: Planning & Foundation

**Duration:** Session completed (current step)  
**Goal:** Project scaffolding, documentation, and API key setup  
**Hackathon Readiness:** 20% complete (documentation & structure ready)

---

## ✅ Completed Deliverables

| Item | Status | Notes |
|---|---|---|
| Project repository structure | ✅ | `otarioptm/` created with `config/`, `docs/`, `src/`, `web/` |
| README.md | ✅ | Project overview & quick-start summary |
| `docs/overview.md` | ✅ | Core concepts & value proposition |
| `docs/features.md` | ✅ | 7+ Otari features with descriptions |
| `docs/architecture.md` | ✅ | 6-layer technical architecture |
| `docs/quickstart.md` | ✅ | 7-step MVP setup guide |
| `docs/submission.md` | ✅ | Hackathon checklist & rubric criteria |
| `docs/github-pat-guide.md` | ✅ | PAT best practices & safe patterns |
| `config/example.yml` | ✅ | Otari configuration template |
| `.gitignore` template | ✅ | Includes `.env`, `otari.conf.yml` |

---

## 📋 Current Setup Checklist

```bash
# 1. Clone & bootstrap (run once)
git clone https://github.com/gopanihitansh5-collab/otarioptm.git
cd otarioptm
uv sync --extra dev

# 2. Set OTARI_API_KEY (after otari.ai signup)
# → Go to https://otari.ai → Sign up → Verify email → Activate key
export OTARI_API_KEY="pk-...from-otari.ai"

# 3. Start gateway (hosted or self-hosted)
# Hosted (recommended for hackathon):
uv run otari serve --config config/example.yml

# Self-hosted (alternative):
docker compose up -d

# 4. Launch frontend
cd web && npm run dev  # opens http://localhost:5173
```

---

## 🎯 Phase 0 Success Criteria

- [x] Repository initialized with proper structure
- [x] All 7 documentation files written
- [x] Config template created
- [ ] **OTARI_API_KEY activated** (requires otari.ai onboarding)
- [ ] Local development environment functional
- [ ] Git repository with initial commit

---

## ⚠️ Known Blockers

| Blockers | Resolution |
|---|---|
| OTARI_API_KEY not yet activated | Sign up at otari.ai, complete onboarding, key will be emailed |
| API returns 402 Payment Required | Complete hosted onboarding at otari.ai (free tier available) |
| Node modules not installed | Run `uv sync --extra dev` and `cd web && npm install` |

---

## 📅 Phase 0 → Phase 1 Transition

**Trigger:** OTARI_API_KEY is exported and `otari serve` runs without errors  
**Next:** Begin Phase 1 with backend scaffolding

---

## 📝 Phase 0 Notes

- Documentation serves as project memoir and onboarding guide for teammates
- Git history should show initial commit with all MD files
- `.env` file template provided – never commit actual keys
- Project structure mirrors Mozilla Otari repo layout for familiarity