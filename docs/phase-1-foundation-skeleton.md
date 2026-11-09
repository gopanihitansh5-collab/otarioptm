# Phase 1: Foundation & Skeleton

**Duration:** 5-7 days (Week 1 of hackathon)  
**Goal:** Core backend + frontend scaffolding with basic workflow capability  
**Target Completion:** End of Day 7  
**Hackathon Readiness:** 40% complete (core workflow functional)

---

## 🏗 Backend Tasks (`src/`)

| Task | Effort | Deliverable | Checklist |
|---|---|---|---|
| **FastAPI app structure** | 1 day | `src/gateway/main.py` | `[ ]` Create FastAPI app with `/api/v1` prefix`<br>`[ ]` Add CORS middleware for frontend`<br>`[ ]` Import OTARI routes` |
| **Workflow schema validation** | 1 day | Pydantic models | `[ ]` Define `Node` base model`<br>`[ ]` Define `ModelChatNode` subtype`<br>`[ ]` Define `WebSearchNode` subtype`<br>`[ ]` Define `CodeExecNode` subtype`<br>`[ ]` Define `GuardrailsNode` subtype`<br>`[ ]` Add `Workflow` root model with `nodes: List[Node]` |
| **OTARI API client wrapper** | 1 day | `src/services/otari_client.py` | `[ ]` `fetch_models()` → `GET /api/v1/models`<br>`[ ]` `chat_completions()` → `POST /api/v1/chat/completions`<br>`[ ]` `activity_stream()` → `WebSocket /api/v1/activity`<br>`[ ]` Error handling for `402 Payment Required` |
| **Budget service** | 0.5 day | Budget enforcement logic | `[ ]` Per-project budget from config.yml`<br>`[ ]` Per-request reservation`<br>`[ ]` Auto-block at limit with graceful error |
| **Workflow compiler** | 1 day | Node graph → OTARI API calls | `[ ]` Convert nodes to `messages` format`<br>`[ ]` Map node types to API parameters`<br>`[ ]` Stream response back to frontend |

**Backend Deliverable:** `otarioptm/src/gateway/` with 5+ Python modules, FastAPI app runs at `http://localhost:8000`

---

## 🎨 Frontend Tasks (`web/`)

| Task | Effort | Deliverable | Checklist |
|---|---|---|---|
| **Vite + React + TS setup** | 0.5 day | `web/package.json`, `tsconfig.json` | `[ ]` `npm create vite@latest web -- --template react-ts`<br>`[ ]` Add `react-flow` dependency`<br>`[ ]` Configure `vite.config.ts` aliases |
| **React Flow integration** | 1 day | Basic node editor | `[ ]` Import `ReactFlow`, `Node` components`<br>`[ ]` Create canvas with default dark theme`<br>`[ ]` Add 3 initial node types: ModelChat, WebSearch, CodeExec |
| **OTARI API client (fetch)** | 0.5 day | `web/src/api/otariClient.ts` | `[ ]` `api.getModels()` using `fetch()``<br>`[ ]` `api.sendChat(messages, model)` using `POST``<br>`[ ]` Handle auth header from `OTARI_API_KEY` env |
| **Live activity WebSocket** | 0.5 day | Real-time token/cost updates | `[ ]` `new WebSocket('ws://localhost:8000/api/v1/activity')`<br>`[ ]` Parse `tokens`, `cost`, `status` messages`<br>`[ ]` Update sidebar progress bar |
| **Workspace save/load** | 0.5 day | JSON workflow persistence | `[ ]` `localStorage.setItem('workflow', JSON)``<br>`[ ]` `localStorage.getItem('workflow')` on load`<br>`[ ]` Export/import buttons in UI |

**Frontend Deliverable:** `otarioptm/web/` with React Flow composer at `http://localhost:5173`

---

## 📦 Milestone 1 ✅

> **Run "Hello World" workflow:** Single model chat node that returns a response via OTARI, with cost/tokens shown in UI.

### Acceptance Criteria
- [ ] Frontend renders React Flow canvas with "Model Chat" node palette
- [ ] User drags Model Chat node onto canvas
- [ ] User sets model: `alibaba/qwen-3.5-35b-a3b` (or saved config)
- [ ] User clicks "Run"
- [ ] OTARI gateway returns response
- [ ] UI displays: `Response: "Hello!"`, `Tokens: 4`, `Cost: $0.001`
- [ ] No Python/backend errors in console

### Test Command
```bash
# In backend terminal
curl -X POST "http://localhost:8000/api/v1/chat/completions" \
  -H "Authorization: Bearer $OTARI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "alibaba/qwen-3.5-35b-a3b", "messages": [{"role": "user", "content": "Hello"}]}'
```

---

## ⚠️ Phase 1 Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OTARI API key not activated | Blocked | Complete ot.ai onboarding before Day 2 |
| React Flow version mismatch | Wasted day | Pin `react-flow@11.3.0` in `package.json` |
| Budget service logic error | Wrong spend tracking | Write unit tests first (`pytest`), manual verification |
| WebSocket connection drops | Lost live updates | Implement auto-reconnect with exponential backoff |

---

## 📅 Phase 1 Daily Schedule (Example)

| Day | Focus | Deliverable by EOD |
|---|---|---|
| **Mon** | FastAPI scaffolding + CORS | `main.py` runs, frontend can call `/health` |
| **Tue** | Workflow schemas + Pydantic | All 5 node types validated |
| **Wed** | OTARI client wrapper | `fetch_models()` works, lists models |
| **Thu** | Budget service + basic reserve | $5 cap enforced, blocks 6th request |
| **Fri** | React Flow + 3 node types | Canvas drag-and-drop functional |
| **Sat** | Milestone 1: Hello World | Full end-to-end workflow runs |
| **Sun** | Bug-squashing + readme update | All issues resolved, docs updated |

---

## 🎯 Phase 1 → Phase 2 Transition

**Trigger:** Milestone 1 ✅ achieved (Hello World workflow runs)  
**Next:** Phase 2 adds Web Search, Code Exec, Guardrails nodes + auto-routing

---

## 📝 Phase 1 Notes

- Keep `.env` in root, add to `.gitignore` – never commit real keys
- Use `OTARI_API_KEY` env var consistently across backend/frontend
- Test OTARI calls with `python -c "import otari; ...` before frontend work
- React Flow node IDs should be UUIDs for persistent state
- Backend should return `503` if OTARI gateway is unhealthy
- Log every API call with: model, tokens, cost, timestamp for debugging