# Phase 3: Optimization & Polish

**Duration:** 5-6 days (Week 3 of hackathon)  
**Goal:** Budget enforcement + team features + UI/UX polish  
**Target Completion:** End of Day 21  
**Hackathon Readiness:** 90% complete (production-ready features)

---

## 💰 Budget Enforcement Features

| Feature | Implementation | Effort |
|---|---|---|
| **Per-project budget cap** | YAML config `budget.project_cap: 5.00` | 0.5 day |
| **Per-user limits** | Scoped API key generation from OTARI | 0.5 day |
| **Real-time meter** | WebSocket `/api/v1/activity` → progress bar | 1 day |
| **Auto-block at limit** | Request rejection with `402 Payment Required` | 0.5 day |
| **Spend export** | CSV download from dashboard | 0.5 day |

### Per-Project Budget Implementation

**config/example.yml:**
```yaml
budget:
  project_cap: 5.00  # USD per project (hackathon limit)
  per_user: 2.00     # USD per user, per session
  rollover: false    # Reset at each new workflow run
```

**Budget Service (`src/services/budget.py`):**
```python
class BudgetManager:
    def __init__(self, config: dict, otari_key: str):
        self.project_cap = config["budget"]["project_cap"]
        self.per_user = config["budget"]["per_user"]
        self.spent_today = 0.0  # reset daily or per-session
        self.otari_key = otari_key
    
    async def reserve(self, estimated_cost: float) -> bool:
        """Return True if reservation succeeded, False if over limit."""
        if self.spent_today + estimated_cost > self.project_cap:
            return False  # block request
        self.spent_today += estimated_cost
        # Optional: call OTARI to record reservation
        # POST /api/v1/budgets/reserve
        return True
    
    def get_spent(self) -> float:
        return round(self.spent_today, 4)
    
    def get_remaining(self) -> float:
        return round(self.project_cap - self.spent_today, 4)
```

**Frontend Integration (`web/src/components/BudgetMeter.tsx`):**
```tsx
const [spent, setSpent] = useState(0);
const [remaining, setRemaining] = useState(budget);

// Subscribe to OTARI activity WebSocket
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/api/v1/activity');
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === "budget_update") {
      setSpent(data.spent);
      setRemaining(budget - data.spent);
    }
  };
  return () => ws.close();
}, [budget]);
```

**Budget Meter Visual:**
- Progress bar: green when < 80%, orange 80-95%, red > 95%
- Text: `"Spent: $2.45 / $5.00"`
- Clickable: "Upgrade budget" → redirects to otari.ai billing

---

## 👥 Team Sharing Features

| Feature | Implementation | Effort |
|---|---|---|
| **Scoped API keys** | OTARI `hosted-providers` endpoint | 0.5 day |
| **Role-based access** | Frontend UI permissions | 0.5 day |
| **Shared workflow library** | JSON export/import + central server | 1 day |
| **Project dashboard** | Multi-user activity view | 0.5 day |

### Scoped API Keys

OTARI already supports key scoping – we just expose it:

```bash
# Create key scoped to project "research-team"
otari gen-secret-key --scope project:research-team --budget 10.00

# Frontend reads key from env, UI shows:
# "Key scoped to: Research Team Project | Budget: $10.00 | Spent: $2.30"
```

### Shared Workflow Library

**Frontend:**
- "My Workflows" sidebar section
- Button: "New Workflow" / "Import from Library"
- Drag from library onto canvas (read-only preview)
- "Fork" button to copy to personal space

**Backend:**
- `POST /api/v1/workflows` with `is_public: true`
- GET `/api/v1/workflows/public` – list approved workflows
- Metadata: `author, category, avg_cost, success_rate`

### Project Dashboard

```
┌─────────────────────────────────────┐
│  Team: Research Group               │
├─────────────────────────────────────┤
│  Active Workflows: 3                │
├─────────────────────────────────────┤
│  Total Spend Today: $4.20 / $20.00 │
├─────────────────────────────────────┤
│  Top Models:                         │
│  1. openai:gpt-5-mini  (60% usage)  │
│  2. anthropic:sonnet-4 (30% usage) │
│  3. ollama:llama3 (10% usage)       │
├─────────────────────────────────────┤
│  Export CSV  |  Delete Workflow      │
└─────────────────────────────────────┘
```

---

## 🎨 Polish & UX

| Feature | Implementation |
|---|---|
| **Loading states** | Skeleton spinners on all async actions |
| **Error boundaries** | Catch runtime errors, show modular modals |
| **Undo/Redo** | Ctrl+Z / Ctrl+Y for node deletions |
| **Keyboard shortcuts** | Ctrl+Z (undo), Ctrl+Y (redo), Delete (delete), Enter (run) |
| **Tool-tips** | On-hover description for every node type |
| **Mobile-responsive** | Canvas compresses, sidebar collapses, touch gestures |
| **Theme toggle** | Light/dark mode matching OTARI dashboard |

### Undo/Redo Implementation

```tsx
// web/src/hooks/useUndoRedo.ts
import { useState } from "react";

interface NodeId = string;
interface Connection = { source: NodeId; target: NodeId };

export function useUndoRedo(initialConnections: Connection[]) {
  const [history, setHistory] = useState<Connection[]>(initialConnections);
  const [historyIndex, setHistoryIndex] = useState(0);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setHistory(prev => prev.slice(0, historyIndex));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setHistory(prev => [...prev, ...(history.slice(historyIndex + 1))]);
    }
  };

  const save = (newConnections: Connection[]) => {
    setHistoryIndex(historyIndex + 1);
    setHistory(newConnections);
  };

  return { connections: history, undo, redo, save };
}
```

### Keyboard Shortcuts (react-flow-shortcuts)

```tsx
import { useOnClickOutside } from "@react-aria/interactions";
import { useKeyboardShortcuts } from "react-use";

function App() {
  useKeyboardShortcuts(
    { "z.meta": handleUndo, "y.meta": handleRedo, "delete": handleDelete },
    { enableKey: "ctrlKey" }
  );
  // ...
}
```

---

## 📊 Feature Completion Checklist (Phase 3)

| Feature | Status | Notes |
|---|---|---|
| Per-project budget cap (YAML) | `[ ]` | Edit `config/example.yml` |
| Per-user limit enforcement | `[ ]` | Scoped key from OTARI |
| Real-time budget meter (WS) | `[ ]` | Progress bar + spent/counter |
| Auto-block at limit | `[ ]` | 402 error + modal |
| Spend CSV export | `[ ]` | Button in dashboard |
| Scoped API keys | `[ ]` | OTARI `hosted-providers` |
| Role-based access | `[ ]` | Frontend permissions |
| Shared workflow library | `[ ]` | JSON import/export |
| Project dashboard | `[ ]` | Multi-user activity view |
| Loading skeletons | `[ ]` | All async actions |
| Error boundaries | `[ ]` | Modular modals |
| Undo/Redo (Ctrl+Z) | `[ ]` | Node connections |
| Keyboard shortcuts | `[ ]` | Run, delete, escape |
| Tool-tips on nodes | `[ ]` | Hover descriptions |
| Mobile-responsive | `[ ]` | Canvas compresses |
| Theme toggle | `[ ]` | Light/dark mode |

---

## ⚠️ Phase 3 Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Budget race condition | Overspend | Use `asyncio.Lock()` + atomic updates |
| WebSocket flood | UI freeze | Debounce messages, max 10/sec |
| Scoped key misuse | Security leak | Validate key scope on every API call |
| CSV export format wrong | Data loss | Use `PapaParse` library, test with sample data |
| Team dashboard staleness | Wrong decisions | Refresh every 30 sec, show last-updated timestamp |
| Undo/Redo state loss | User frustration | Persist to `localStorage` + session |
| Mobile touch events | Broken interactions | Test on iPhone/Android, use `pointer` events |
| Theme toggle flicker | Layout shift | Use CSS variables, avoid re-renders |

---

## 📅 Phase 3 Daily Schedule (Example)

| Day | Focus | Deliverable by EOD |
|---|---|---|
| **Mon** | Budget enforcement logic | `BudgetManager` class works, blocks at cap |
| **Tue** | Real-time meter + WebSocket | Sidebar progress bar updates live |
| **Wed** | Auto-block at limit + 402 modal | User cannot exceed $5 cap |
| **Thu** | CSV export + spend dashboard | Download button generates correct CSV |
| **Fri** | Scoped API keys + team sharing | UI shows "Key scoped to: Team X" |
| **Sat** | Polish: loading, errors, tool-tips | All UX polish items functional |
| **Sun** | Mobile responsiveness + final bugs | App works on phone browser, docs updated |

---

## 🎯 Phase 3 → Phase 4 Transition

**Trigger:** All Phase 3 checklist items ✅ completed  
**Next:** Phase 4 – Hackathon prep: demo video, submission docs, final polish

---

## 📝 Phase 3 Notes

- Budget meter should be visible on **every** workflow page, not just dashboard
- Use OTARI's built-in `budget` feature if available – wrap only if custom needed
- CSV export columns: `timestamp, workflow_id, step, model, tokens_in, tokens_out, cost_usd, status`
- Scoped keys: document in `docs/github-pat-guide.md` how to create/sharing them
- Project dashboard should require same `OTARI_API_KEY` as workflow runner
- Undo/Redo should work across page reload (persist to `localStorage` key `otarioptm-undoredo`)
- Keyboard shortcuts: respect focus state – don't trigger when typing in code exec textarea
- Tool-tips: use `react-tooltip` or simple `title` attribute + CSS
- Mobile: canvas should pinch-zoom to fit, node connections auto-route
- Theme toggle: store preference in `localStorage`, persist across sessions
- All budget numbers: round to 4 decimal places (micro-dollars)
- Consider adding "budget warning" at 70% and "budget critical" at 90%
- Write integration tests for budget service with mocked OTARI responses
- Document every new env var in `README.md` and `docs/quickstart.md`
- Phase 3 is where project goes from "prototype" to "product-like" – focus on polish

---

## 🔢 Success Metrics (Phase 3)

| Metric | Target |
|---|---|
| Budget accuracy | ±5% of actual spend vs. claimed |
| WebSocket latency | < 500ms per message |
| Auto-block reliability | 100% at cap (tested with 100 requests) |
| CSV export correctness | 100% match to backend records |
| Mobile page load | < 3 seconds on 3G |
| Theme toggle persistence | Survives browser restart |
| User satisfaction (survey) | > 4/5 stars on ease-of-use |

---

## 📦 Phase 3 Deliverables (code locations)

| File | Purpose |
|---|---|
| `src/services/budget.py` | BudgetManager class + reserve() |
| `src/api/routes/budget.py` | FastAPI endpoints for budget actions |
| `web/src/components/BudgetMeter.tsx` | Progress bar + spent/counter display |
| `web/src/hooks/useUndoRedo.ts` | Undo/Redo hook for React Flow |
| `web/src/api/otariClient.ts` | Added `getBudgetStatus()` method |
| `config/example.yml` | Updated with `budget.project_cap`, `per_user` |
| `docs/features.md` | Updated budget/team sharing sections |
| `docs/quickstart.md` | New sections: "Set budget", "Share with team" |

---

## 🎬 Demo Video Preview (Phase 3)

> **Segment:** "Watch it stop when budget runs out"
> 
> 1. Set budget: `$1.00` in workflow config
> 2. Run workflow 3 times (each costs ~$0.30)
> 3. On 4th run, watch sidebar turn red
> 4. Click "Run" → modal: `"Budget exceeded: $1.20 / $1.00. Request blocked."`
> 5. Show "Remaining: $0.00" in meter
> 6. Demonstrate CSV export of today's spend

---

## 📋 Phase 3 Complete Definition

**When is Phase 3 "done"?**
- [ ] Budget meter shows live spend on any workflow
- [ ] User cannot run workflow beyond project cap
- [ ] 402 "Budget exceeded" modal appears gracefully
- [ ] CSV export downloads correct file
- [ ] Scoped API key works in UI
- [ ] Team dashboard shows 3 active workflows
- [ ] All loading states have spinners
- [ ] Error boundaries catch runtime errors
- [ ] Ctrl+Z undoes last connection deletion
- [ ] App works on mobile browser (tested)
- [ ] Light/dark mode toggle works
- [ ] All documentation updated

**Then:** Move to Phase 4 (Hackathon Prep)