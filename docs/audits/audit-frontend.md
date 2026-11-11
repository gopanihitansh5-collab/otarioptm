# Frontend Audit - OtariOptm (web/)

Audit date: 2026-11-11. Scope: every file under `web/src/**` plus `MASTER.md` and
`.bunshin/PRODUCT.md` as the design/honesty contract. Read-only review, no file was modified.

> Audit evidence, published copy. Scope: every file under `web/src/**` plus `MASTER.md` and `.bunshin/PRODUCT.md`. Ran 2026-11-11, read-only. Findings, severity counts and the fix ranking are reproduced unchanged from the original audit.

Stack as built: Next.js 16.4.5 (App Router, `cacheComponents`), React 19.3, Tailwind v4,
@xyflow/react 12.12, @react-three/fiber 9.8 + three 0.187, next/font (Inter + IBM Plex Mono).

## Severity summary

| Severity | Count |
|---|---|
| Critical | 6 |
| Major | 20 |
| Minor | 25 |
| Total | 51 |

The single largest cluster is **design-token drift in the studio** (C1, C2, M1): the landing
page was fully reskinned to the MASTER palette (lime / steel / elevated / obsidian) but the
studio surface (canvas node cards, budget meter, activity feed) was never reskinned and still
uses the pre-refactor indigo / neutral / emerald palette. A judge who lands on `/` and then
opens `/studio` sees two different products.

---

## Critical

### C1. All four canvas node cards use the pre-refactor palette (indigo / neutral / emerald / sky)
- `web/src/components/nodes/NodeChat.tsx:15-26,39,53,79-106`
- `web/src/components/nodes/NodeWebSearch.tsx:15-26,39,53,72-100`
- `web/src/components/nodes/NodeCodeExec.tsx:15-26,39,53,74-94`
- `web/src/components/nodes/NodeGuardrails.tsx:15-26,40-43,58,83-119`

Defect: every node card is built from `neutral-950/80` fields, `border-white/10`,
`text-neutral-100/400/500/600/700`, `bg-indigo-500/90`, `bg-emerald-500/90`, `bg-sky-500/15`,
`bg-red-500/40`, `bg-amber-500/40`, and `ACCENT = "#6366f1"` (indigo) for the React Flow
handles. MASTER.md token table has no indigo, no `neutral-*` and no `emerald`. The handles
are the "routing energy" element and must be lime; the status chips must use the lime /
silver / amber / fail chip set. `NodeChat`'s handle is literal indigo `#6366f1`, which is
the exact forbidden colour in the brief.

Fix: delete `ACCENT` and `STATUS_CHIPS` from all four files and use the shared chip map from
`web/src/components/Sidebar.tsx:33-39` (lime / ice / silver / amber / fail). Replace the
field class with the studio field class from `web/src/components/Sidebar.tsx:41`
(`border-steel-dim bg-obsidian text-ice placeholder:text-silver/60 focus:border-lime/60`).
Replace `border-[#C6F36B]` etc. with `border-steel` plus a token-coloured left rule, and use
`bg-obsidian`/`bg-elevated` for the card surface. Handles: `background: "#C6F36B"` (lime) for
model nodes, `"#65C9E8"` only for web-search, `"#E8B44A"` for guardrails, `borderColor:"#171D22"`.

### C2. BudgetMeter is off-contract (indigo bar, neutral panel, amber "live" dot)
- `web/src/components/BudgetMeter.tsx:13,16,18-21,26-47`

Defect: `bg-indigo-500` / `bg-amber-500` / `bg-red-500` bar colours, `rounded-xl border
border-white/10 bg-neutral-900/60` panel, `text-neutral-500` labels, and a `bg-amber-400`
dot that means "live". MASTER says amber is for latency warnings and lime is for budget
health; indigo and `neutral-*` do not exist in the token table. The budget meter is the
single most-looked-at panel in the studio and it is the only one still on the old palette.

Fix: bar -> `bg-fail` (>90%), `bg-amber` (>=70%), `bg-lime` (<70%); panel ->
`border-steel bg-elevated`; labels -> `text-silver`; live dot -> `bg-lime` when connected
and `bg-steel` when not; remaining figure -> `text-lime` on `text-ice`.

### C3. Live budget numbers on the landing page freeze after the first poll
- `web/src/lib/landing/Reveal.tsx:58-105` (the `CountUp` component)

Defect: `started.current` is set to `true` on the first intersection and never reset. When
`value` changes on the next 15 s poll, the effect re-runs (deps `[value, reduced]`), the new
`IntersectionObserver` callback returns early because `started.current` is already `true`,
and `display` is never updated. The rendered number therefore stays at the first polled
value forever. This silently breaks the "GATEWAY LIVE / BUDGET CAP / REMAINING" strip in
`Hero.tsx:174-189` and the three live figures in `BudgetGovernance.tsx:117-163` and
`Observability.tsx:50-96`. The page claims live data and displays frozen data.

Fix: in the `value` effect, when the animation has already run, set the value directly:
```
useEffect(() => {
  if (started.current) { setDisplay(value); return; }
  ...
}, [value, reduced]);
```
and keep the rAF only for the first reveal. Also cancel the rAF on unmount (see M3).

### C4. Double-click on "Run Workflow" fires two runs (double spend)
- `web/src/app/studio/page.tsx:154-157,186,379-390`

Defect: the in-flight guard is `if (running || runNodes.length === 0) return;` where
`running` is React state captured in the closure. `setRunning(true)` happens later in the
function, so two clicks inside the same task (double-click, or Run plus "Load and run")
both observe `running === false` and both POST `/api/v1/workflow/run`. Each run reserves and
commits real budget. The product claim is "every token accounted for", and this path
double-spends.

Fix: use a ref as the lock, not state:
```
const runLock = useRef(false);
const run = async (graph) => {
  if (runLock.current) return;
  runLock.current = true;
  try { ... } finally { runLock.current = false; setRunning(false); }
};
```
Keep `running` state only for the button label/disabled state.

### C5. Gateway outage keeps showing "GATEWAY LIVE" with stale numbers
- `web/src/lib/landing/Reveal.tsx:166-169`

Defect: on fetch failure the state update is `setState((s) => (s.budget ? s : { status:
"offline", events: [] }))`. Once a budget snapshot has been received, `s.budget` is truthy,
so the state is returned unchanged and `status` stays `"live"`. The badge in
`BudgetGovernance.tsx:89-105` and `Observability.tsx:31-47` keeps reading "GATEWAY LIVE"
while the gateway is down, and the figures shown are minutes old. MASTER: "live sections
degrade to an honest offline card."

Fix: separate liveness from data:
```
setState((s) => ({ ...s, status: "offline" }));
```
and render the last-known figures with an explicit "STALE" tag, or hide them entirely
behind the existing offline copy. Also re-check liveness on `visibilitychange` so a laptop
that wakes up does not sit on a stale "LIVE" badge.

### C6. localStorage workflow snapshot is trusted without validation (crash + no migration)
- `web/src/hooks/useWorkflowState.ts:20-39`

Defect: `loadSnapshot` JSON-parses `otarioptm.workflow.v1` and casts the result straight to
`WorkflowNode[]` / `WorkflowEdge[]`. The `try/catch` only protects `JSON.parse`; the shape is
never checked. A snapshot written by an older build (missing `position`, `data`, or a node
whose `type` is no longer supported) is fed into React Flow, which reads `node.position.x`
and `node.data` unconditionally -> runtime crash of the whole studio. There is also no
schema-version field, so there is no migration path.

Fix: reuse the validator that already exists in this repo:
```
const parsed = JSON.parse(raw);
const result = validateWorkflowInput(parsed);   // lib/workflow/validate.ts
if (!result.ok) { localStorage.removeItem(STORAGE_KEY); return {nodes:[],edges:[]}; }
return result.graph;
```
`validateWorkflowInput` already checks ids, types, positions, duplicate ids and dangling
edges. Bump the key to `otarioptm.workflow.v2` and add a `version` field to the payload so
future migrations are possible.

---

## Major

### M1. ActivityFeed is off-contract and fails contrast
`web/src/components/ActivityFeed.tsx:7-17,57-81`. The chip palette is
`bg-emerald-500/15 text-emerald-300`, `bg-indigo-500/15 text-indigo-300`,
`bg-neutral-500/15`, `bg-red-500/15`, `bg-neutral-800`; the timestamps are
`text-neutral-600` on `bg-elevated` (#171D22) = **2.16:1** (needs 4.5:1 for 10px text) and
the empty-state copy is `text-neutral-600` on `bg-elevated` = 2.16:1.
Fix: map events to the studio chip set (`node.completed` -> lime, `workflow.started` ->
silver, `workflow.finished` -> ice/silver, `workflow.blocked` -> fail, `pong` -> steel);
timestamps and labels -> `text-silver` (#929DA5 on #171D22 = 6.1:1, passes).

### M2. The 15 s ping turns into an activity event and floods the feed
`web/src/hooks/useBudget.ts:64-72,75-95` + `web/src/components/ActivityFeed.tsx:50`.
The client pings every 15 s; the gateway answers `{"event":"pong", ...snapshot}`
(`src/gateway/main.py:667`). The client treats any message with an `event` string as an
activity, so a "pong / gateway ping" row is prepended to the feed every 15 s. After ~25
minutes the 100-event buffer (`useBudget.ts:7`) has evicted every real event, and the newest
row a judge looks at is always ping noise.
Fix: in `useBudget`'s `onmessage`, special-case `obj.event === "pong"`: update the budget
snapshot from it and do not append it to `events`. Alternatively stop rendering pongs and
raise `MAX_EVENTS`.

### M3. `workflow.started` node count never renders
`web/src/components/ActivityFeed.tsx:34-43` vs `src/gateway/main.py:555`.
The client reads the count from `Array.isArray(e.nodes) ? e.nodes.length : e.nodeCount ??
e.node_count`, but the gateway emits `{"event":"workflow.started","nodes": <int>}`. `nodes` is
a number, so all three branches fail and the detail is always the empty string.
Fix: add `typeof e.nodes === "number" ? e.nodes : undefined` to the chain.

### M4. Below `md` the studio has no palette and no inspector
`web/src/app/studio/page.tsx:486-488` (Palette) and `:558-571` (Sidebar) are wrapped in
`hidden md:contents`. On any viewport under 768px the judge can load a template and press
Run, but cannot add a node, cannot select a node, and cannot edit a prompt. The two panels
are the entire authoring surface.
Fix: below `md`, render the Palette as a bottom sheet and the Inspector as a right-hand
drawer (reuse `web/src/components/studio/Drawer.tsx`), both reachable from the header.

### M5. Studio header overflows below ~384px and the Run button is clipped
`web/src/app/studio/page.tsx:306-307` (root is `flex h-screen flex-col overflow-hidden`) and
`:354-390`. The header is a single non-wrapping flex row: logo (86px) + Templates (82px) +
History (64px) + Run Workflow (100px) + 6 gaps (36px) + `px-2` (16px) = **384px**. At 375px
(iPhone SE / mini) the Run button overflows and the root `overflow-hidden` clips it. The
"Run Workflow" CTA is the single most important control in the product.
Fix: below `sm`, collapse Templates and History to icon-only 44px buttons (`aria-label`
kept) and drop the `px-2` to `px-1.5`; or move them into the drawer.

### M6. 540px of fixed panels leaves a 228px canvas at the `md` breakpoint
`web/src/components/Palette.tsx:19` (`w-[220px]`), `web/src/components/Sidebar.tsx:228`
(`w-[320px]`), `web/src/app/studio/page.tsx:486,558`. At exactly 768px the canvas is
768 - 540 = 228px wide. The panels are not collapsible, so a 768-1023px laptop or tablet
gets an unusable editor.
Fix: switch the panel breakpoint from `md` to `lg` (1024px) and make the inspector
collapsible (`w-[320px]` -> `w-0` when closed) so a judge can reclaim the canvas.

### M7. A new node array is created on every studio render, and React Flow change types are dropped
`web/src/app/studio/page.tsx:493` (`nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}`)
and `web/src/hooks/useWorkflowState.ts:98-134`.
Two problems in one place:
1. The `.map` allocates a new array and new node objects on every render of the studio
   page. React Flow's `StoreUpdater` calls `setNodes(nodes)` on identity change, which
   re-adopts every node; because the controlled node objects never carry `measured`,
   `adoptUserNodes` resets each node's `handleBounds` and the node is re-measured
   (`@xyflow/system` `adoptUserNodes`). That is a re-measure + store update per render.
2. `onNodesChange` only handles `remove` and `position`; `select` and `dimensions` changes
   are silently discarded. React Flow v12 documents that a controlled flow must apply all
   changes; dropping `select` disables multi-select and `elevateNodesOnSelect`.
Fix: memoize the mapped array and let React Flow own selection:
```
const flowNodes = useMemo(() => nodes.map(n => ({...n, selected: n.id === selectedId})), [nodes, selectedId]);
```
and replace the hand-rolled handlers with the library helpers
`applyNodeChanges(changes, nodes)` / `applyEdgeChanges(changes, edges)` from
`@xyflow/react`, then read `selected` from the applied result instead of forcing it.

### M8. ShortcutsDialog effect re-runs on every render and fights the user's focus
`web/src/components/studio/ShortcutsDialog.tsx:36-73`, used at
`web/src/app/studio/page.tsx:590` with an inline `onClose={() => setShortcutsOpen(false)}`.
`onClose` gets a new identity on every render of the page, and it is in the effect's
dependency array. Each render therefore runs the cleanup, which calls
`openerRef.current?.focus()` (line 71), and then re-runs the effect, which focuses the
dialog's first control again (line 43). Any state change inside the studio while the
dialog is open yanks focus back to the opener and then back into the dialog.
Fix: memoise the callback at the call site (`const closeShortcuts = useCallback(() =>
setShortcutsOpen(false), [])`) or hold `onClose` in a ref and depend only on `open`.

### M9. Drawer has no focus trap and does not restore focus
`web/src/components/studio/Drawer.tsx:17-35`. The drawer focuses its first control on open
and handles Escape, but Tab moves straight out of the panel into the canvas behind it, and
closing the drawer leaves focus on `<body>` (the trigger is not restored).
Fix: reuse the trap already implemented in `ShortcutsDialog.tsx:52-65` (extract it into
`web/src/components/studio/ui.ts` or a small `useFocusTrap` hook), and store
`document.activeElement` on open and restore it on close.

### M10. Undo can push a new history entry, breaking Redo
`web/src/hooks/useUndoRedo.ts:41-69`. The "do not snapshot while restoring" flag is cleared
by `window.setTimeout(() => { restoringRef.current = false; }, 0)`. React schedules passive
effects in a separate task source; if the effect that pushes a snapshot runs after that
timeout, the restored graph is pushed back onto the stack, so Undo appends an entry and
Redo no longer steps forward correctly. It is also racy between `undo` (which sets the flag
itself) and `applySnapshot` (which resets it).
Fix: replace the flag with a skip counter that the effect consumes:
```
const skipRef = useRef(0);
// undo/redo: skipRef.current += 1;
// effect: if (skipRef.current > 0) { skipRef.current -= 1; return; }
```

### M11. Autosave swallows quota errors and leaves the UI stuck on "saving"
`web/src/hooks/useAutosave.ts:29-40,42-61`. `write()` catches the `QuotaExceededError`
and returns without touching `status`, so `status` stays `"saving"` and the Save chip
(`web/src/components/studio/SaveIndicator.tsx:8-11`) shows "saving..." forever. The user
believes their workflow is not saved when in fact saving stopped several minutes ago.
Related: the persisted payload is `JSON.stringify({nodes, edges})` and every node carries
`data.statusInfo` with the full run `output` (up to ~2 KB per node,
`web/src/lib/types.ts:32-46`), so a few runs push the workflow key toward the 5 MB quota
for no benefit.
Fix: (a) add an `"error"` status to `AutosaveStatus` and set it in the catch, rendering a
"save failed" chip; (b) strip `statusInfo` (and `status`) from the payload before writing,
keeping only what is needed to restore the graph.

### M12. `setError` timers are never cleared
`web/src/app/studio/page.tsx:142-148`. Each call schedules a `window.setTimeout` that is
never tracked or cleared; on unmount the timer still fires and calls `setErrorBanner` on a
disposed component. Multiple errors stack multiple timers.
Fix: keep the timer id in a `useRef`, clear it before scheduling a new one and in a
`useEffect` cleanup.

### M13. "Load and run" bypasses the run lock
`web/src/app/studio/page.tsx:248-263`. `loadAndRunTemplate` calls `loadTemplate` (which
calls `setGraph`) and then `void run({nodes, edges})`. `run` re-checks `running` from its
closure, which is exactly the stale-closure problem in C4, and there is no lock shared with
the header Run button. A judge who clicks "Load and run" while a manual run is in flight
starts a second concurrent run against the same gateway.
Fix: route both entry points through one locked function (see C4) and have the template
path call it with the template graph.

### M14. Workflow validation has no cycle, self-loop or size checks
`web/src/lib/workflow/validate.ts:71-131`. The validator checks ids, types, positions,
duplicate ids and dangling edges, but not:
- **self loops**: `source === target` is accepted, and `onConnect`
  (`web/src/hooks/useWorkflowState.ts:136-145`) does not prevent the user from drawing one;
- **cycles**: A->B->A is accepted, and the gateway's topological execution
  (`src/gateway/main.py:551-555`) has no cycle guard either;
- **size**: an imported file can declare 100k nodes and be written straight to localStorage.
Fix: add a DFS cycle check and a `source !== target` rule to `validateWorkflowInput`, cap
the graph at e.g. 200 nodes / 400 edges with a clear error, and add
`isValidConnection={(c) => c.source !== c.target}` to the React Flow props.

### M15. JSON import has no error path and no size guard
`web/src/app/studio/page.tsx:284-299`. `file.text()` is awaited without a `.catch()`, so a
read failure leaves the import silently doing nothing; there is no upper bound on file size
before `JSON.parse`, and no guard against a non-`.json` file that happens to parse.
Fix: add `.catch(() => setError("Could not read that file."))`, reject files over ~1 MB
before reading, and reuse the existing `validateWorkflowJson` error surface.

### M16. U+2014 (em dash) in user-visible copy (7 places)
- `web/src/app/studio/page.tsx:334` (tooltip)
- `web/src/app/studio/page.tsx:336` (tooltip)
- `web/src/app/studio/page.tsx:348` (rendered as "BUDGET -")
- `web/src/app/studio/page.tsx:524` ("Nothing was executed - no simulated results.")
- `web/src/components/studio/BlockedCard.tsx:37`
- `web/src/components/studio/HistoryPanel.tsx:68`
- `web/src/components/studio/OverdraftDemo.tsx:50`

U+2014 is forbidden in user-visible copy. Replace with a comma, a colon, a period, or
reword. (Two code comments also contain it: `web/src/hooks/useAutosave.ts:36`,
`web/src/lib/workflow/runHistory.ts:69` - harmless, but worth normalising.)

### M17. Steel-coloured text on dark surfaces is effectively invisible (1.42:1)
- `web/src/components/landing/Pricing.tsx:98-101` (the whole legal fine-print block)
- `web/src/components/landing/BudgetGovernance.tsx:171-174` (the defaults block)
- `web/src/components/landing/Hero.tsx:208` (the "LOOP 4.2S" caption)

`#293239` on `#111519` is a contrast ratio of **1.42:1** and on `#090B0D` it is about
1.5:1. These are the fine-print disclaimers a judge reads to check honesty, so losing them
is doubly bad. Use `text-silver` (#929DA5) or `text-silver/70`; keep `#293239` for borders
only.

### M18. Canvas node fields have no accessible name
`web/src/components/nodes/NodeChat.tsx:64-76`, `NodeWebSearch.tsx:64-70`,
`NodeCodeExec.tsx:64-72`, `NodeGuardrails.tsx:69-91`; and the mirrored fields in
`web/src/components/Sidebar.tsx:93-150`. Every input/textarea relies on `placeholder` only
("Prompt...", "System text...", "Query...", "// python code..."), so a screen reader
announces an unnamed edit box. The node card is the core authoring surface.
Fix: add `aria-label` to each field ("Chat prompt", "Chat system prompt", "Web search
query", "Python code", "Banned terms"), or wrap each in a `<label>` with a visually hidden
span.

### M19. A run whose nodes failed is recorded as "completed"
`web/src/app/studio/page.tsx:207-214` with `web/src/lib/workflow/runHistory.ts:74-104`.
`buildRunRecord` receives `status: response.aborted ? "aborted" : "completed"`, so a run
where every node returned `error` is stored and displayed in the History panel as a green
"completed" chip with a cost. That is a misleading state in the one panel that exists to
report what happened.
Fix: derive the status from the steps:
```
const status = response.aborted ? "aborted"
  : response.steps.some(s => s.error) ? "error"
  : "completed";
```

### M20. No empty state on the canvas
`web/src/components/Canvas.tsx:59-95` and `web/src/app/studio/page.tsx:380`. On a fresh
browser the studio opens with an empty canvas and a disabled "Run Workflow" button that
gives no reason. A judge's first ten seconds in the product start with a blank screen and
a dead CTA. The Templates button that would fix this is a plain header button with no
visual priority.
Fix: render a centred empty-state card on the canvas when `nodes.length === 0`
("Nothing on the canvas yet - load a template or add a node") with a "Load template"
button that opens the Templates drawer, and add a `title`/`aria-describedby` on the
disabled Run button explaining that a workflow is required.

---

## Minor

### m1. Dead (and fabricated) price data in the hero
`web/src/components/landing/Hero.tsx:35-39`. `NODES[].cost` and `NODES[].lat` are declared
but never rendered - the map at `:246-270` only uses `n.name`, `n.dx`, `n.dy`. Delete the
two fields. Keeping invented per-model prices in source invites them being used later and
breaks the "no fabricated pricing" rule in PRODUCT.md.

### m2. Dead exports and duplicated constants
- `web/src/lib/api.ts:34` `getModels()` - never called by any component.
- `web/src/lib/api.ts:69` `GATEWAY_BASE` and `web/src/lib/landing/Reveal.tsx:185`
  `GATEWAY_BASE` - the same constant defined twice with two different default values
  (both read `NEXT_PUBLIC_GATEWAY_URL`, but they can drift). Import one from the other.
- `web/src/lib/landing/Reveal.tsx:107-123` re-declares `BudgetSnapshot` and `ActivityEvent`
  locally instead of importing the canonical types from `web/src/lib/types.ts:48-56`.

### m3. `reconnects` is returned by the budget hook and never used
`web/src/hooks/useBudget.ts:14,19,45,62,133` and `web/src/app/studio/page.tsx:62`. Either
surface it in the UI (useful: "reconnecting...") or delete it.

### m4. CountUp churns observers and never cancels its rAF
`web/src/lib/landing/Reveal.tsx:76-95`. Each poll creates a new `IntersectionObserver`
(the old one is disconnected by the effect cleanup, fine) but the observer that fires after
`started.current` is true returns without calling `io.disconnect()`, leaving it alive until
the next poll. The `requestAnimationFrame(tick)` chain is also not cancelled on unmount, so
it can call `setDisplay` after teardown. Fix both while fixing C3.

### m5. Hero parallax calls `matchMedia` on every pointer move
`web/src/components/landing/Hero.tsx:82-94`. `window.matchMedia("(prefers-reduced-motion:
reduce)")` is evaluated per `pointermove` event and the transform is written to the DOM
without rAF throttling. Cache the media-query result in a ref (it is already checked in
`useRoutingSphere`, `Hero.tsx:15`) and coalesce the writes into one `requestAnimationFrame`.

### m6. `SaveIndicator` puts `aria-live` on a `display: contents` element and hides below `sm`
`web/src/components/studio/SaveIndicator.tsx:7-11`. `display: contents` removes the element
from the accessibility tree in several browsers, so the live announcement is unreliable. The
chip itself is `hidden ... sm:flex`, so on a phone the save state is invisible entirely.
Fix: keep a visually hidden `aria-live="polite"` span that is always in the DOM and put the
visual chip next to it.

### m7. History accordion rows have `aria-expanded` without `aria-controls`
`web/src/components/studio/HistoryPanel.tsx:88-92,112`. The expanded panel is rendered
conditionally with no id, so a screen reader cannot associate the control with the content.
Add `aria-controls={`run-${run.id}-details`}` and `id` on the details container.

### m8. The overspend demo control overlaps the React Flow MiniMap
`web/src/components/studio/OverdraftDemo.tsx:28` (`absolute bottom-3 right-3`) versus
`web/src/components/Canvas.tsx:93` (`<MiniMap>` default position `bottom-right`). They
occupy the same corner; the demo button can cover the minimap on short viewports.
Fix: move the demo control to `bottom-16 right-3`, or move the MiniMap to `bottom-left`.

### m9. R3F label textures are never disposed
`web/src/components/landing/RoutingScene.tsx:35-52,69`. `makeLabel` creates a 512x96 canvas
per label (3 labels, roughly 590 KB of texture) and the geometries/materials/textures are
never disposed. The hero is `dynamic(..., {ssr:false})` and remounts on route changes.
Fix: add a `useEffect` cleanup that calls `texture.dispose()`, `material.dispose()` and
`geometry.dispose()` on the memoised labels and lines.

### m10. Duplicated scrollbar CSS and an unused keyframe
`web/src/app/globals.css:45-61` and `:63-84` are byte-identical rule sets, and
`web/src/app/globals.css:122-132` defines `@keyframes oo-float` which is never referenced.
Delete both.

### m11. Run-history load race
`web/src/hooks/useRunHistory.ts:19-33`. History is loaded in a `setTimeout(0)` while
`recordRun` writes `runsRef.current`. A run recorded before the load resolves is persisted
as the only entry and the loaded history is then overwritten.
Fix: load synchronously during the initialiser (`useState(() => loadRunHistory())`) guarded
by `typeof window !== "undefined"`, and seed `runsRef` from the same value.

### m12. No localStorage schema migration for run history
`web/src/lib/workflow/runHistory.ts:30-43`. `isRunRecord` requires `demo: boolean`, so any
record written before that field existed is silently discarded on load. Either default
missing fields (`demo: r.demo ?? false`) or version the key (`otarioptm.runs.v2`) and
migrate.

### m13. `addNode` positions nodes from a stale `nodes.length`
`web/src/hooks/useWorkflowState.ts:147-166`. `idx` comes from the closure's `nodes.length`,
so two additions in the same tick land on the same coordinates. Use a functional
`setNodes(prev => ...)` and read `prev.length` inside it.

### m14. The health poll keeps hammering an offline gateway every 20 s
`web/src/app/studio/page.tsx:109-130`. There is no backoff and no pause when the page is
hidden, so a judge with the gateway down generates a failing request every 20 s for the
whole session. Add exponential backoff after a failure and pause on `visibilitychange`.

### m15. Clipboard failure is silent
`web/src/components/landing/DX.tsx:53-59`. `navigator.clipboard.writeText` rejects on
insecure origins (a LAN IP over http) and in some embedded webviews; the empty `catch {}`
leaves the button reading "COPY" with no feedback. Set a "COPY FAILED" state.

### m16. Hover-opened nav dropdowns can stick open on touch
`web/src/components/landing/Nav.tsx:46-47`. `onMouseEnter` opens the menu; on touch
devices the synthetic mouseenter can fire on tap and the menu stays open because
`onMouseLeave` never fires. Gate the hover path behind `matchMedia("(hover: hover)")` and
rely on the existing `onClick` toggle for coarse pointers.

### m17. Cyan (`signal`) is used for static, non-live information
- `web/src/components/Sidebar.tsx:26-31` (`web-search` legend dot -> `bg-signal`)
- `web/src/components/Palette.tsx:10` (same)
- `web/src/components/nodes/NodeWebSearch.tsx:39` (node border `#65C9E8`)

MASTER reserves cyan for "data flows and live data only". These three are static legends and
a static node border.
Fix: use `bg-silver` / `text-silver` for the legend dots and `border-steel` for the
web-search card, keeping cyan for actual live flow.

### m18. Off-token status colours in the node cards
`web/src/components/nodes/NodeChat.tsx:19,21-22` and the identical lines in the other three
node files: `bg-indigo-500/10 text-indigo-300` for "running", `bg-emerald-500/10
text-emerald-300` for "done", `bg-red-500/10 text-red-300` for "error", `bg-amber-500/10`
for "skipped", plus `bg-sky-500/15 text-sky-300` for the "demo" chip
(`NodeChat.tsx:81`, `NodeWebSearch.tsx:74`, `NodeCodeExec.tsx:76`). These are covered by C1;
listed separately because they are a different palette family from the indigo/neutral
fields and need their own mapping (running -> lime pulse, done -> ice/silver, error ->
fail, skipped -> amber, demo -> steel/silver).

### m19. Amber is used for a non-latency meaning
`web/src/app/studio/page.tsx:37`. The gateway badge maps "Groq fallback" to `bg-amber`.
MASTER assigns amber to latency warnings. Use `bg-silver` for a fallback tier and keep
amber for warnings only.

### m20. The landing root hardcodes hex values instead of the theme tokens
`web/src/app/page.tsx:22` (`bg-[#090B0D] text-[#F3F5F2] selection:bg-[#C6F36B]
selection:text-[#10140A]`) while the studio uses `bg-obsidian text-ice`. The token names
already exist in `web/src/app/globals.css:3-18`; use them so there is one source of truth.

### m21. The cyan token is named `signal`, MASTER calls it `cyan`
`web/src/app/globals.css:13` defines `--color-signal: #65c9e8`. This is a naming drift
only, but it makes grep-based contract checks harder. Either rename the token or add an
alias.

### m22. CSV export has no error state
`web/src/app/studio/page.tsx:427-429`. `<a href={CSV_EXPORT_URL} download>` points at the
gateway; if the gateway is down the browser downloads a JSON error body named
`otarioptm-activity.csv`. Fetch it in JS and surface a failure instead.

### m23. The demo graph SVG is exposed to screen readers with no description
`web/src/components/landing/ProductDemo.tsx:154` sets `aria-hidden={false}` on an SVG whose
text nodes ("WEB SEARCH", "MODEL ROUTER", ...) are then read as loose text. Either give the
SVG a `<title>`/`aria-label` describing the pipeline or hide it and provide a text
alternative.

### m24. `useUndoRedo` receives a new `restore` callback every render
`web/src/app/studio/page.tsx:59-61` passes an inline arrow, so `applySnapshot` is rebuilt on
every render and `undo`/`redo` identities change constantly. Wrap it in `useCallback`.

### m25. Run statuses are applied to all nodes at once, so the canvas never shows progress
`web/src/app/studio/page.tsx:190-206`. Every node is set to "running" before the single
POST and every node flips to done/error when the response arrives. The visual language in
MASTER (node activation, routing energy) implies progressive execution. The gateway returns
all steps at once, so the cheapest honest improvement is to animate the states in sequence
client-side after the response arrives, or to label the states clearly.

---

## Dead code and inconsistency summary

| Item | Location | Action |
|---|---|---|
| `NODES[].cost`, `NODES[].lat` | `landing/Hero.tsx:36-38` | delete (also removes invented prices) |
| `getModels()` | `lib/api.ts:34` | delete or wire up |
| `GATEWAY_BASE` duplicated | `lib/api.ts:69`, `lib/landing/Reveal.tsx:185` | import one from the other |
| Local `BudgetSnapshot` / `ActivityEvent` types | `lib/landing/Reveal.tsx:107-123` | import from `lib/types.ts` |
| `reconnects` counter | `hooks/useBudget.ts:14,133` | use or delete |
| `@keyframes oo-float` | `app/globals.css:122-132` | delete |
| Duplicated scrollbar rules | `app/globals.css:45-61` and `:63-84` | delete one copy |
| `NodeProps` unused `type` casts | `nodes/Node*.tsx:31` etc. | `props.type` is always defined by React Flow; harmless |
| `reset` returned by `useUndoRedo` | `hooks/useUndoRedo.ts:30,85-87,94` | never called; delete or wire to a "clear history" action |
| `Options.persist` / `hydrated` flag | `hooks/useWorkflowState.ts:54,68,74` | `persist` is never set to false by any caller; `hydrated` is only an autosave gate - both are fine but unused externally |

---

## What is genuinely good (do not churn this)

1. **Landing-page token discipline is excellent.** `web/src/components/landing/**` uses
   lime `#C6F36B`, steel `#293239`, elevated `#171D22`, obsidian `#090B0D`, ice `#F3F5F2`,
   silver `#929DA5` throughout. No indigo, no `neutral-*`, no gradient text, no
   glassmorphism, no `backdrop-blur`, no neon borders. Radii are 12px cards / 16px hero
   panels / 8px buttons as specified. The only `shadow-` in the codebase is the ambient
   lime glow on the two primary CTAs, which MASTER explicitly allows.
2. **No forbidden easing.** There is no `bounce`, `elastic`, `spring` or `back` easing
   anywhere in `web/src`; every transition uses `cubic-bezier(0.22, 0.61, 0.36, 1)`
   (`app/globals.css:25`) or the Tailwind `duration-150/200/300` tokens. Nothing overshoots.
3. **Reduced motion is handled globally and correctly.**
   `web/src/app/globals.css:134-152` collapses every animation and transition, restores
   `.reveal` to visible, disables `.panel:hover` lift and turns off `scroll-behavior:
   smooth`. On top of that, `Reveal.tsx:23-27`, `CountUp` (`:68-72`), `ProductDemo.tsx:37-41`
   and `Architecture.tsx:44-49` all read `prefers-reduced-motion` and render the static
   compromise instead of relying on CSS alone. This is exactly what MASTER asks for.
4. **Focus-visible is present everywhere.** `web/src/components/studio/ui.ts:1-2` exports a
   single `FOCUS_RING` constant that every studio control uses, and the landing components
   use the equivalent `focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50`. There is no
   `outline: none` without a replacement ring.
5. **The hero 3D scene is well engineered.** `RoutingScene.tsx:283-287` caps DPR at
   `[1, 1.5]`, pauses the frameloop when the panel leaves the viewport
   (`:269-278` IntersectionObserver), requests `powerPreference: "low-power"` and is
   `aria-hidden`. `Hero.tsx:11-28` additionally feature-detects WebGL, refuses to mount on
   reduced-motion, and skips the scene below 768px, keeping the SVG trace as the fallback.
   The whole bundle is `dynamic(..., { ssr: false })` so three.js never blocks first paint.
6. **Honesty labelling is thorough and correct.** Every non-live visual carries a DEMO MODE
   or ILLUSTRATIVE label: `Hero.tsx:206,276`, `ProductDemo.tsx:107-111`,
   `RoutingIntelligence.tsx:147-149,336-340`, `ProblemSolution.tsx:90-92,103-105`. The
   routing simulator's footer states that the weights come from `src/services/router.py`
   while the inputs are illustrative. This satisfies the "never invented" rule in
   PRODUCT.md.
7. **The live/offline degradation pattern is the right one.** `useLiveGuard`
   (`lib/landing/Reveal.tsx:137-183`) polls the real gateway, cancels on unmount, and
   `BudgetGovernance.tsx:164-176` shows an honest "GATEWAY NOT REACHABLE AT ... START THE
   BACKEND: python run_server.py" card instead of a canned screenshot. Only the stale-data
   edge case (C5) needs fixing.
8. **`lib/workflow/validate.ts` is genuinely good code.** It checks missing ids, duplicate
   ids, unknown node types, invalid positions, missing edge endpoints and duplicate edge
   ids, and returns structured errors rather than throwing. It is already used by both the
   template loader and the import path. It just needs cycle and size rules (M14) and to be
   reused for the localStorage snapshot (C6).
9. **The drawer closed-state handling is correct and modern.**
   `web/src/components/studio/Drawer.tsx:41-43` uses `aria-hidden` **and** `inert` on the
   closed panel, so its controls are genuinely removed from the tab order rather than just
   visually hidden. That is the right pattern.
10. **The shortcuts dialog has a real focus trap and restores focus.**
    `web/src/components/studio/ShortcutsDialog.tsx:52-65` implements a proper
    wrap-around Tab trap and returns focus to the opener on close (`:71`). Only the
    unstable `onClose` dependency needs fixing (M8).
11. **The keyboard layer has no stale-closure bug.** `useKeyboardShortcuts.ts:12-16` keeps
    the handlers in a ref updated on every render, and `:53-62` correctly ignores key
    events originating in inputs, textareas, selects and contenteditable. The Delete /
    Backspace guard does not fire while the user is typing.
12. **The WebSocket hook is well behaved.** `useBudget.ts:115-130` nulls all four handlers,
    closes the socket and clears both timers on unmount; `:41-47` uses capped exponential
    backoff and resets the attempt counter on a successful open. No leaked sockets.
13. **Node inputs do not fight the canvas.** Every field in the node cards carries
    `nodrag` (and `nowheel` where relevant), so typing in a prompt does not drag or zoom
    the canvas. Small detail, high value.
14. **Autosave adopts the loaded value instead of rewriting it.**
    `useAutosave.ts:44-47` means opening the studio does not immediately rewrite
    localStorage, which avoids a pointless write and a flash of "saving".
15. **The run-history save degrades gracefully on quota.**
    `lib/workflow/runHistory.ts:62-70` retries with half the records rather than losing
    the history entirely.
16. **The template loader never leaves the user stranded.**
    `lib/workflow/templates.ts:107-131` falls back to `LOCAL_TEMPLATES` when the gateway
    has no templates, so the zero-key demo path always has something to load. The four
    local templates are real, runnable graphs.
17. **The overspend demo is honestly bounded.** `OverdraftDemo.tsx:14-18` and
    `BlockedCard.tsx:9-16` state in the UI that it is a local client-side demonstration
    that never touches the real gateway cap, and that nothing was executed or spent. This
    is exactly the kind of labelling MASTER and PRODUCT.md demand.
18. **The landing page has no images to mis-optimise.** Everything is inline SVG or CSS,
    so there is no `next/image` gap and no layout shift to fix.

---

## Top 5 fixes for a judge's first 10 seconds

Ordered by what a judge sees first and by effort.

1. **Repaint the studio surface to the MASTER palette (C1, C2, M1, M17).** One file per
   component, token swaps only. The canvas node cards, the budget meter and the activity
   feed are the only surfaces a judge sees in the studio, and right now they are indigo /
   emerald / neutral on an otherwise lime-and-steel product. This is the single highest
   visual-severity fix and it touches 6 files with no logic changes.
2. **Make the live numbers actually live (C3, C5).** The hero strip reads
   "GATEWAY LIVE / BUDGET CAP / REMAINING" and the budget panel repeats three figures.
   Today those figures freeze at the first poll and the badge stays "LIVE" after the
   gateway dies. A judge who watches for 30 s will notice a number that never moves. The
   fix is 5 lines in `CountUp` plus one line in the offline branch.
3. **Give the studio an empty state and a mobile path (M20, M4, M5).** Today the studio
   opens blank with a dead "Run Workflow" button, and below 768px there is no palette and
   no inspector at all. Add a centred empty-state card with a "Load template" CTA, and move
   the palette and inspector into drawers under `md`. A judge on a phone must be able to
   load a template and see the result.
4. **Stop the activity feed from showing ping noise (M2, M3).** The newest row in the feed
   is currently "pong / gateway ping" every 15 s, and real events are evicted after 25
   minutes. Filter `pong` out of the event list (use it as a budget refresh instead) and
   fix the `workflow.started` node-count read. A judge who runs one workflow should see
   that workflow's `node.completed` events at the top of the feed.
5. **Protect the budget claim (C4, M19, M13).** Add a ref-based run lock so a double-click
   cannot fire two runs, and record a run whose nodes failed as "error" instead of
   "completed". The product's tagline is "every token accounted for before it is spent";
   a double spend or a green "completed" chip on a failed run undermines exactly that.

## Notes for the main session

- Everything above is a **read-only** finding; no file was modified by this audit.
- The landing page (`web/src/components/landing/**`, `web/src/lib/landing/Reveal.tsx`)
  is in good shape apart from C3, C5 and M17. Do not reskin it.
- The riskiest regressions to avoid: the studio palette swap touches the four node card
  files that are also the only place `nodrag` is applied, and the `run()` lock in C4 sits
  next to the `updateNodeData` batching in `useWorkflowState`. Change one at a time and
  re-run a workflow after each.
- `web/src/lib/workflow/validate.ts` is the right place to add cycle/size checks, and it is
  already the single validator used by templates, import and (after C6) localStorage.
