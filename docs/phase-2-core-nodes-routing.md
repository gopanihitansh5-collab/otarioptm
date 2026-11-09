# Phase 2: Core Nodes & Auto-Routing

**Duration:** 5-7 days (Week 2 of hackathon)  
**Goal:** All essential nodes functional + auto-model routing algorithm  
**Target Completion:** End of Day 14  
**Hackathon Readiness:** 70% complete (full workflow engine)

---

## 🔌 Node Implementations

| Node | Function | OTARI API Calls | Effort |
|---|---|---|---|
| **Model Chat** | Standard `chat/completions` | `POST /api/v1/chat/completions` | 1 day |
| **Web Search** | `any-search` integration | `POST /api/v1/search` → feed to LLM | 1 day |
| **Code Exec** | Sandboxed Python execution | `code-exec` profile container | 1 day |
| **Guardrails** | Content filtering / regex | Custom middleware | 0.5 day |

---

### 1️⃣ Model Chat Node ✅ (from Phase 1)

| Implementation | Details |
|---|---|
| **Input** | Model selector dropdown, message history textarea |
| **Output** | AI response + token usage + cost calculation |
| **OTARI Call** | `POST /api/v1/chat/completions` |
| **Payload** | `{ "model": "selected-model", "messages": [...], "stream": true }` |
| **Response Handling** | Stream tokens back, update live counter |
| **Fallback** | If model fails → show error + suggest alternative |

**Code Example (backend):**
```python
# src/services/otari_client.py
async def model_chat(self, messages: List[Dict], model: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{self.base_url}/chat/completions",
            json={"model": model, "messages": messages, "stream": True},
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=60.0,
        )
        resp.raise_for_status()
        async for chunk in resp.aiter_lines():
            if chunk.startswith("data: "):
                data = json.loads(chunk[6:])
                yield data["choices"][0]["delta"].get("content", "")
```

---

### 2️⃣ Web Search Node 🆕

| Implementation | Details |
|---|---|
| **Input** | Search query textbox, "Search" button |
| **Output** | Search results summary + citation tokens |
| **OTARI Call** | `any-search` library → feed summary to LLM step |
| **External Lib** | `from any_search import search;`<br>`results = search(query="latest AI funding news")` |
| **Payload to LLM** | `{"role": "user", "content": f"Based on this search: {summary}, answer: {user_query}"}` |
| **Display** | Card with title, URL, snippet, source attribution |

**Implementation Steps:**
1. `npm install any-search` in `web/`
2. Create `src/nodes/web_search.py` backend wrapper
3. Add node type to React Flow palette
4. Wire: Search node output → Model Chat node input

---

### 3️⃣ Code Exec Node 🆕

| Implementation | Details |
|---|---|
| **Input** | Python code textarea, "Run" button, resource limits |
| **Output** | Execution output, errors, execution time, memory usage |
| **OTARI Profile** | `code-exec` profile in `docker-compose.yml` |
| **Sandbox** | Docker container with Python 3.12, resource caps |
| **Safety** | Max 10s execution, Max 50MB output, No network access |
| **Display** | Collapsible console with syntax highlighting |

**Implementation Steps:**
1. Ensure `docker compose --profile code-exec up -d` works
2. Create `src/nodes/code_exec.py` that spawns subprocess
3. Frontend sends code → backend runs in sandbox → returns output
4. Add timeout via `asyncio.wait_for()`

**Backend Code Sketch:**
```python
# src/services/code_exec.py
import asyncio
import subprocess

async def run_code(code: str, timeout: int = 10) -> Dict:
    try:
        process = await asyncio.create_subprocess_exec(
            "python", "-c", code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        return {"stdout": stdout.decode(), "stderr": stderr.decode(), "exit_code": process.returncode}
    except asyncio.TimeoutError:
        process.kill()
        return {"stdout": "", "stderr": "Timeout exceeded", "exit_code": -1}
```

---

### 4️⃣ Guardrails Node 🆕

| Implementation | Details |
|---|---|
| **Input** | Rule dropdown (PII, profanity, custom regex), test textbox |
| **Output** | Pass/fail + reason, logged event |
| **OTARI Feature** | Built-in guardrail service OR custom regex |
| **Default Rules** | - No PII (SSN, email, phone)<br>- No profanity<br>- Max 500 token output |
| **Custom** | User provides regex pattern, tested against input |
| **Display** | Green check ✅ / red cross ❌ with reason |

**Implementation Steps:**
1. Use OTARI's `/api/v1/guardrails` endpoint if available
2. Or implement simple regex filtering in middleware
3. Add node to React Flow palette
4. Wire: Guardrails check before LLM step OR after

---

## ⚡ Auto-Routing Algorithm

### Goal
Automatically select the cheapest‑healthy model per workflow step based on:
- Cost per 1K tokens
- Estimated quality (historical accuracy)
- Current latency (avg last 10 requests)
- Health status (online/offline/rate-limited)
- Budget remaining

### Algorithm Flowchart

```text
                    ┌─────────────────────┐
                    │  Available Models   │
                    │  from /api/v1/models │
                    └───────┬───────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  Score each model:                │
          │  score = (cost/quality) +       │
          │         (latency*0.1) +         │
          │         (1 if not healthy)      │
          └───────┬─────────────────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Sort by score ASC  │
          └───────┬─────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Pick top model     │
          └───────┬─────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Reserve budget     │
          └───────┬─────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Execute step       │
          └───────┬─────────────┘
                  │
                  ▼
          ┌─────────────────────┐
          │  Update health lat  │
          └─────────────────────┘
```

### Python Implementation

```python
# src/services/router.py
from typing import List, Tuple
from dataclasses import dataclass

@dataclass
class ModelInfo:
    id: str
    provider: str
    input_price: float  # $ per 1K tokens
    output_price: float
    latency_history: List[float]  # last 10 request latencies
    health: bool  # True = online, False = offline
    quality_estimate: float  # 0.0–1.0, from user ratings or provider docs

def calculate_score(model: ModelInfo, budget_remaining: float, step_cost_estimate: float) -> float:
    """Lower score = better choice."""
    cost_ratio = (model.input_price + model.output_price) / 1000.0  # normalize
    latency_penalty = sum(model.latency_history) / len(model.latency_history) * 0.1
    health_penalty = 0.0 if model.health else 1.0
    
    # Base score: cheaper + faster + healthier = better
    base = cost_ratio + latency_penalty + health_penalty
    
    # Extra penalty if step would exceed budget
    if budget_remaining < step_cost_estimate:
        base += 10.0  # heavy penalty → fall back to next model
    
    # Quality bonus: higher quality preferred if cost similar
    if model.quality_estimate > 0.8:
        base -= 0.5
    
    return round(base, 3)

def select_model(
    available: List[ModelInfo],
    budget_remaining: float,
    step_type: str,  # "chat", "code", "search", etc.
    step_complexity: str,  # "simple", "complex"
) -> Tuple[ModelInfo, float]:
    """Return (best_model, score)."""
    scored = []
    for m in available:
        # Estimate step cost based on type/complexity
        if step_type == "chat":
            est_tokens = 500 if step_complexity == "simple" else 2000
        elif step_type == "code":
            est_tokens = 200
        elif step_type == "search":
            est_tokens = 300
        else:
            est_tokens = 1000
        
        step_cost = (m.input_price + m.output_price) * est_tokens / 1000.0
        score = calculate_score(m, budget_remaining, step_cost)
        scored.append((m, score))
    
    # Sort ascending by score, pick best
    scored.sort(key=lambda x: x[1])
    return scored[0]  # (ModelInfo, float_score)
```

### Router Integration (FastAPI endpoint)

```python
# src/api/routes/router.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/router", tags=["router"])

class RouteRequest(BaseModel):
    available_models: List[dict]  # from /api/v1/models
    budget_remaining: float
    step_type: str
    step_complexity: str = "complex"
    step_cost_estimate: float = 0.01

@router.post("/select")
async def route(request: RouteRequest, otari = Depends(get_otari_client)):
    try:
        model, score = select_model(
            available=[ModelInfo(**m) for m in request.available_models],
            budget_remaining=request.budget_remaining,
            step_type=request.step_type,
            step_complexity=request.step_complexity,
        )
        return {"selected_model": model.id, "score": score, "reason": "auto-routing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📦 Milestone 2 ✅

> **Multi-node workflow:** Drag Model Chat → Web Search → Code Exec; watch live cost tick in sidebar as each step runs.

### Acceptance Criteria
- [ ] User drags 3 nodes: Model Chat, Web Search, Code Exec
- [ ] User connects: Chat output → Search input → Code input
- [ ] User sets search query: `"latest AI funding news"`
- [ ] User sets code: `print("Summary: " + user_input)`
- [ ] User clicks "Run"
- [ ] OTARI handles: Search → LLM reasoning → Code execution
- [ ] Sidebar shows: `Step 1: Search (2 tokens, $0.0002)` then `Step 2: LLM (15 tokens, $0.003)` then `Step 3: Code (0 tokens, $0.000)`
- [ ] No backend errors; sandbox returns expected output

### Test Scenario
```text
User: "Research the latest AI funding news and print a summary"
Workflow:
1. Web Search → "latest AI funding news"
2. Model Chat → "Summarize the above in 2 sentences"
3. Code Exec → print(summary)
```

---

## ⚠️ Phase 2 Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Web search API changes | Broken node | Wrap `any-search` behind abstraction layer, update lib |
| Code exec sandbox permissions | Security issue | Run in restricted Docker network, no `apt-get` |
| Auto-routing picks wrong model | Poor UX | Add UI "override" dropdown to force specific model |
| Latency history too small | Bad scores | Keep rolling window of last 50 requests in Redis/memory |
| Budget reservation race condition | Overspend | Use asyncio.Lock() around budget decrement |

---

## 📅 Phase 2 Daily Schedule (Example)

| Day | Focus | Deliverable by EOD |
|---|---|---|
| **Mon** | Web Search node integration | Search query → results summary displays |
| **Tue** | Code Exec node sandbox | `print("hello")` runs, output in UI |
| **Wed** | Guardrails node | Regex rules tested, pass/fail shows |
| **Thu** | Auto-routing algorithm | `select_model()` function works, returns cheapest |
| **Fri** | Multi-node workflow end-to-end | Model Chat → Search → Code Exec runs full loop |
| **Sat** | Polish node UIs + error handling | Tooltips, modals for failures |
| **Sun** | Bug-squashing + Phase 2 review | All nodes stable, docs updated |

---

## 🎯 Phase 2 → Phase 3 Transition

**Trigger:** Milestone 2 ✅ achieved (all 5 nodes functional, routing works)  
**Next:** Phase 3 adds budget enforcement + team features + polish

---

## 📝 Phase 2 Notes

- Node payloads should use OTARI's `provider:model` format (e.g., `openai:gpt-5-mini`)
- React Flow node types: `model-chat`, `web-search`, `code-exec`, `guardrails`
- Store node connections in `workflow.nodes[]` for persistence
- Auto-routing should run on "Run" click, not on every keystroke
- Log every routing decision: `selected_model, score, reason, budget_before, budget_after`
- Code exec should respect per-user resource limits (configurable in YAML)
- Guardrails should be optional – node can be disabled in workflow config
- All node outputs should be JSON-serializable for transit between nodes
- Consider adding "temperature" and "max_tokens" sliders to Model Chat node
- Use `stream: true` for chat nodes to update UI incrementally
- Add "Clear console" button for Code Exec node
- Consider adding node "delete" with confirmation modal
- Write integration tests for router with mocked OTARI responses
- Document each node's OTARI API requirements in `docs/features.md`