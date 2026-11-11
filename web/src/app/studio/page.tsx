"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";

import { Canvas } from "@/components/Canvas";
import { Palette } from "@/components/Palette";
import { Sidebar } from "@/components/Sidebar";
import { nodeTypes } from "@/components/nodeTypes";
import { NodePatchProvider } from "@/components/nodeDataPatch";
import { BlockedCard } from "@/components/studio/BlockedCard";
import { HistoryPanel } from "@/components/studio/HistoryPanel";
import { MobileDrawer } from "@/components/studio/MobileDrawer";
import { NoticeBar } from "@/components/studio/NoticeBar";
import ThemeToggle from "@/components/ThemeToggle";
import { OverdraftDemo } from "@/components/studio/OverdraftDemo";
import { SaveIndicator } from "@/components/studio/SaveIndicator";
import { ShortcutsDialog } from "@/components/studio/ShortcutsDialog";
import { TaskPlanner } from "@/components/studio/TaskPlanner";
import { ResultsDialog, type RunDeliverable } from "@/components/studio/ResultsDialog";
import { TemplatesPanel } from "@/components/studio/TemplatesPanel";
import { DANGER_BTN, FOCUS_RING, SECONDARY_BTN } from "@/components/studio/ui";
import { IconClock, IconLayers, IconPlay, IconPlus, IconSliders } from "@/components/studio/icons";
import { useBudget } from "@/hooks/useBudget";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRunHistory } from "@/hooks/useRunHistory";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { CSV_EXPORT_URL, getHealth, streamWorkflow, type PlanResponse } from "@/lib/api";
import { DEMO_CAP, estimateOverdraft } from "@/lib/workflow/demoOverdraft";
import { buildWorkflowExport, downloadWorkflowJson } from "@/lib/workflow/exportImport";
import { buildRunRecord, deriveRunStatus } from "@/lib/workflow/runHistory";
import { fetchTemplates, type WorkflowTemplate } from "@/lib/workflow/templates";
import { validateWorkflowInput, validateWorkflowJson } from "@/lib/workflow/validate";
import { stepFailed } from "@/lib/stepStatus";
import type {
  HealthResponse,
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/types";

type GatewayState = "checking" | "otari" | "groq" | "demo" | "offline";

const GATEWAY_BADGE: Record<GatewayState, { dot: string; label: string; title?: string }> = {
  checking: { dot: "bg-silver", label: "checking gateway" },
  otari: { dot: "bg-lime", label: "Otari connected", title: "Gateway reachable and key configured; not proof a model answer succeeds" },
  groq: { dot: "bg-amber", label: "Groq fallback" },
  demo: { dot: "bg-silver", label: "Demo mode" },
  offline: { dot: "bg-fail", label: "Gateway offline", title: "Gateway unreachable" },
};

const ICON_BTN = `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-steel bg-elevated/95 text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`;

function isNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function StudioInner() {
  const state = useWorkflowState();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    removeNode,
    updateNodeData,
    clearAll,
    setGraph,
    saveNow,
    saveStatus,
    loadNotice,
    hydrated,
    draftRestored,
  } = state;

  const restoreGraph = useCallback(
    (nn: WorkflowNode[], ee: WorkflowEdge[]) => setGraph(nn, ee),
    [setGraph],
  );
  const { undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, restoreGraph);
  const { snapshot, events, connected, transport } = useBudget();
  const { runs, recordRun, clearRuns } = useRunHistory();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState<string | null>(null);
  const [offlineCard, setOfflineCard] = useState(false);
  const [demoCap, setDemoCap] = useState<number | null>(null);
  const [blocked402, setBlocked402] = useState<{
    estimated: number;
    remaining: number;
  } | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[] | null>(null);
  const [templateSource, setTemplateSource] = useState<"gateway" | "local" | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [searchProvider, setSearchProvider] = useState<"duckduckgo" | "exa">("duckduckgo");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [planStages, setPlanStages] = useState<PlanResponse["stages"]>();
  const [planProvenance, setPlanProvenance] = useState<PlanResponse["planner"] | undefined>();
  const [generatedTask, setGeneratedTask] = useState<string | undefined>();
  const [resultsOpen, setResultsOpen] = useState(false);
  const [lastDeliverable, setLastDeliverable] = useState<RunDeliverable | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Ref based run lock: the `running` state is only a label, a double click
  // inside one task must never fire two POST /workflow/run requests.
  const runLockRef = useRef(false);
  const errorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchTemplates().then((result) => {
      if (!mounted) return;
      setTemplates(result.templates);
      setTemplateSource(result.source);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // First-visit demo: an empty canvas shows nothing, so load the first
  // starter template once the draft check has run and none was restored.
  // One-shot per session; a user who clears the canvas keeps it cleared.
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (!hydrated || draftRestored) return;
    if (!templates || templates.length === 0) return;
    if (nodes.length > 0 || edges.length > 0) return;
    autoLoadedRef.current = true;
    // Deferred out of the effect body: setState synchronously inside an
    // effect triggers cascading-render lint and a double paint.
    const t = window.setTimeout(() => {
      const result = validateWorkflowInput(templates[0].graph);
      if (!result.ok) return;
      setGraph(result.graph.nodes, result.graph.edges);
      setFitKey((k) => k + 1);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draftRestored, templates, nodes.length, edges.length]);

  useEffect(
    () => () => {
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    },
    [],
  );

  useKeyboardShortcuts({
    undo,
    redo,
    onDelete: () => {
      if (selectedId) {
        removeNode(selectedId);
        setSelectedId(null);
      }
    },
    save: saveNow,
    onHelp: () => setShortcutsOpen((v) => !v),
  });

  useEffect(() => {
    let mounted = true;
    const poll = () => {
      getHealth()
        .then((h) => {
          if (!mounted) return;
          setHealth(h);
          setHealthChecked(true);
        })
        .catch(() => {
          if (!mounted) return;
          setHealth(null);
          setHealthChecked(true);
        });
    };
    poll();
    const t = window.setInterval(poll, 20000);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  const gatewayState: GatewayState = !healthChecked
    ? "checking"
    : !health
      ? "offline"
      : health.otari
        ? "otari"
        : health.groq
          ? "groq"
          : "demo";

  const setError = useCallback((message: string) => {
    setErrorBanner(message);
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = window.setTimeout(() => {
      errorTimerRef.current = null;
      setErrorBanner((current) => (current === message ? null : current));
    }, 6000);
  }, []);

  const canvasEmpty = nodes.length === 0 && edges.length === 0;

  const budgetRemaining = snapshot?.remaining ?? health?.budget?.remaining ?? null;

  const flowNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [nodes, selectedId],
  );

  const run = async (graph?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
    // Synchronous lock: nothing above the first await can interleave with a
    // second click, so a double click cannot spend the budget twice.
    if (runLockRef.current) return;
    const runNodes = graph?.nodes ?? nodes;
    const runEdges = graph?.edges ?? edges;
    if (runNodes.length === 0) return;
    if (!healthChecked) return;
    if (!health) {
      setOfflineCard(true);
      return;
    }
    runLockRef.current = true;
    try {
      // Local demo cap: client-side pre-spend estimate demonstrating the
      // gateway's real HTTP 402 block path. The real gateway cap is untouched;
      // the block refuses the run before any provider request (docs/api.md).
      if (demoCap !== null) {
        const lastBilledCost =
          runs.find((r) => r.status === "completed")?.cost ?? 0;
        const estimate = estimateOverdraft(runNodes, lastBilledCost, demoCap);
        if (estimate.estimated > estimate.remaining) {
          for (const node of runNodes) {
            updateNodeData(node.id, { status: "error", statusInfo: null });
          }
          recordRun(
            buildRunRecord({
              status: "blocked",
              nodeCount: runNodes.length,
              durationMs: 0,
              steps: [],
            }),
          );
          setBlocked402({
            estimated: estimate.estimated,
            remaining: estimate.remaining,
          });
          return;
        }
      }
      setRunning(true);
      setOfflineCard(false);
      setBlocked402(null);
      const startedAt = performance.now();
      for (const node of runNodes) {
        updateNodeData(node.id, { status: "idle", statusInfo: null });
      }
      try {
        const response = await streamWorkflow(runNodes, runEdges, (event) => {
          if (!event.nodeId) return;
          if (event.event === "node.started") updateNodeData(event.nodeId, { status: "running", statusInfo: null });
          if (event.event === "node.completed") updateNodeData(event.nodeId, { status: stepFailed(event as import("@/lib/types").StepResult) ? "error" : "done", statusInfo: event as import("@/lib/types").StepResult });
          if (event.event === "node.blocked") updateNodeData(event.nodeId, { status: "error" });
        }, searchProvider);
        setLastDeliverable({ steps: response.steps, edges: runEdges, aborted: response.aborted, completedAt: new Date().toISOString(), task: generatedTask, planner: planProvenance, stages: planStages, partial: response.partial, failedNodes: response.failedNodes, reportStatus: response.reportStatus, unverifiedNodes: response.unverifiedNodes, computedData: response.computedData, computedJson: response.computedJson, sources: response.sources });
        const byId = new Map(response.steps.map((s) => [s.nodeId, s]));
        // Batch responses carry real results, but not live per-node start times.
        for (const step of response.steps) {
          updateNodeData(step.nodeId, {
            status: stepFailed(step) ? "error" : "done",
            statusInfo: step,
          });
        }
        for (const node of runNodes as WorkflowNode[]) {
          if (!byId.has(node.id)) {
            updateNodeData(node.id, { status: "skipped", statusInfo: null });
          }
        }
        // Bring the final step's output into view: select it (and open the
        // inspector drawer on small screens) so the answer is on screen
        // without hunting for it.
        const finalStep = response.steps[response.steps.length - 1];
        if (finalStep) {
          setSelectedId(finalStep.nodeId);
          if (isNarrowViewport()) setInspectorOpen(true);
        }
        recordRun(
          buildRunRecord({
            status: response.partial || response.reportStatus === "incomplete" ? "error" : deriveRunStatus(response.steps, response.aborted),
            nodeCount: runNodes.length,
            durationMs: Math.round(performance.now() - startedAt),
            steps: response.steps,
          }),
        );
        if (response.aborted) {
          setError(`Run aborted at node ${response.aborted} (budget cap or guardrail).`);
        }
      } catch (err) {
        for (const node of runNodes) {
          updateNodeData(node.id, { status: "error" });
        }
        recordRun(
          buildRunRecord({
            status: "error",
            nodeCount: runNodes.length,
            durationMs: Math.round(performance.now() - startedAt),
            steps: [],
          }),
        );
        setError(err instanceof Error ? err.message : "Workflow run failed");
      } finally {
        setRunning(false);
      }
    } finally {
      runLockRef.current = false;
    }
  };

  const loadTemplate = (template: WorkflowTemplate) => {
    setGeneratedTask(undefined); setPlanProvenance(undefined); setPlanStages(undefined);
    const result = validateWorkflowInput(template.graph);
    if (!result.ok) {
      setError(`Template "${template.name}" is malformed and cannot be loaded.`);
      return;
    }
    setGraph(result.graph.nodes, result.graph.edges);
    setSelectedId(null);
    setTemplatesOpen(false);
    setPaletteOpen(false);
    setFitKey((k) => k + 1);
  };

  const loadAndRunTemplate = (template: WorkflowTemplate) => {
    const result = validateWorkflowInput(template.graph);
    if (!result.ok) {
      setError(`Template "${template.name}" is malformed and cannot be loaded.`);
      return;
    }
    if (runLockRef.current) {
      setError("A run is already in flight. Wait for it to finish before starting another.");
      return;
    }
    loadTemplate(template);
    if (!healthChecked) return;
    if (!health) {
      // Run only after the health probe says the gateway is up.
      setOfflineCard(true);
      return;
    }
    setBlocked402(null);
    void run({ nodes: result.graph.nodes, edges: result.graph.edges });
  };

  const enableOverdraftDemo = () => {
    if (!healthChecked) return;
    if (!health) {
      setOfflineCard(true);
      return;
    }
    setBlocked402(null);
    setDemoCap(DEMO_CAP);
  };

  const restoreRealCap = () => {
    setDemoCap(null);
    setBlocked402(null);
  };

  const exportJson = () => {
    downloadWorkflowJson(buildWorkflowExport(nodes, edges));
  };

  const importJsonFile = (file: File) => {
    void file.text().then((text) => {
      const result = validateWorkflowJson(text);
      if (!result.ok) {
        const first = result.errors[0];
        const extra =
          result.errors.length > 1 ? ` (+${result.errors.length - 1} more)` : "";
        setError(`Import failed: ${first}${extra}`);
        return;
      }
      setGraph(result.graph.nodes, result.graph.edges);
      setSelectedId(null);
      setFitKey((k) => k + 1);
      setErrorBanner(null);
    });
  };

  const selectedNode = selectedId
    ? (nodes.find((n) => n.id === selectedId) ?? null)
    : null;

  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeInspector = useCallback(() => setInspectorOpen(false), []);
  const closeTemplates = useCallback(() => setTemplatesOpen(false), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  const sidebar = (
    <Sidebar
      node={selectedNode}
      onUpdateData={updateNodeData}
      onRemove={(id) => {
        removeNode(id);
        if (selectedId === id) setSelectedId(null);
      }}
      onDeselect={() => setSelectedId(null)}
      snapshot={snapshot}
      connected={connected}
      transport={transport}
      events={events}
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-clip bg-transparent text-ice">
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-steel bg-graphite px-2 sm:gap-2 sm:px-4">
        <Link
          href="/"
          className={`flex h-11 shrink-0 items-center rounded-lg px-1 text-sm font-semibold tracking-tight text-ice transition-colors duration-150 hover:text-lime ${FOCUS_RING}`}
        >
          OtariOptm
        </Link>
        <span className="mono-label hidden md:inline">studio</span>

        {/* Budget health stays visible at every width: it is the core claim. */}
        <span
          className={`flex h-7 shrink-0 items-center gap-1.5 rounded border px-2 font-mono text-[10px] tracking-wider ${
            blocked402
              ? "border-fail/50 bg-fail/10 text-fail"
              : budgetRemaining === null
                ? "border-steel bg-elevated text-silver"
                : "border-lime/40 bg-lime/10 text-lime"
          }`}
          title={
            blocked402
              ? "Budget guard blocked this run (demo cap), restore the real cap to continue"
              : demoCap !== null
                ? "DEMO CAP active locally, the real gateway cap is untouched"
                : "Budget health from the live gateway snapshot"
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              blocked402 ? "bg-fail" : budgetRemaining === null ? "bg-silver" : "bg-lime"
            }`}
          />
          {blocked402 ? (
            <span>BUDGET BLOCKED</span>
          ) : budgetRemaining === null ? (
            <span>BUDGET n/a</span>
          ) : (
            <>
              <span className="sm:hidden">BUDGET ${budgetRemaining.toFixed(4)}</span>
              <span className="hidden sm:inline">
                BUDGET ${budgetRemaining.toFixed(4)} LEFT
                {demoCap !== null ? " · DEMO CAP" : ""}
              </span>
            </>
          )}
        </span>

        {/* Secondary controls scroll horizontally on narrow screens so the Run
            action is never pushed off screen. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span
            className="hidden h-6 shrink-0 items-center gap-1.5 rounded border border-steel bg-elevated px-2 font-mono text-[10px] tracking-wider text-silver sm:flex"
            title={GATEWAY_BADGE[gatewayState].title}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${GATEWAY_BADGE[gatewayState].dot}`} />
            {GATEWAY_BADGE[gatewayState].label}
          </span>

          <button
            type="button"
            onClick={() => setTemplatesOpen((v) => !v)}
            aria-expanded={templatesOpen}
            aria-controls="templates-panel"
            aria-label="Workflow templates"
            title="Workflow templates"
            className={`${SECONDARY_BTN} w-11 px-0 sm:w-auto sm:px-3`}
          >
            <IconLayers className="sm:hidden" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            aria-controls="history-panel"
            aria-label="Run history"
            title="Run history"
            className={`${SECONDARY_BTN} w-11 px-0 sm:w-auto sm:px-3`}
          >
            <IconClock className="sm:hidden" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button type="button" onClick={() => setPlannerOpen(true)} disabled={running} className={`${SECONDARY_BTN} disabled:opacity-40`}>Plan a task</button>
          <button type="button" onClick={() => setResultsOpen(true)} disabled={!lastDeliverable || running} className={`${SECONDARY_BTN} disabled:opacity-40`} aria-label="View run results">Results</button>
          <select aria-label="Search provider for this run" value={searchProvider} disabled={running} onChange={e => setSearchProvider(e.target.value as "duckduckgo" | "exa")} className="h-11 rounded-lg border border-steel bg-elevated px-2 text-xs text-ice"><option value="duckduckgo">Search: DuckDuckGo (free)</option><option value="exa">Search: Exa (separate credits)</option></select>
          <SaveIndicator status={saveStatus} />
        </div>

        <button
          type="button"
          onClick={() => run()}
          aria-label="Run Workflow"
          disabled={running || plannerOpen || nodes.length === 0}
          title={
            nodes.length === 0
              ? "Add a node or load a template to run a workflow"
              : "Run the workflow on the canvas"
          }
          className={`flex h-11 shrink-0 items-center gap-2 rounded-lg bg-lime px-3.5 text-xs font-semibold text-lime-ink transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          {running ? (
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-lime-ink/30 border-t-lime-ink"
              aria-hidden="true"
            />
          ) : (
            <IconPlay className="sm:hidden" />
          )}
          <span className="sm:hidden">Run</span>
          <span className="hidden sm:inline">
            {running ? "Running…" : "Run Workflow"}
          </span>
        </button>

        <div className="hidden items-center gap-1.5 lg:flex">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`${SECONDARY_BTN} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`${SECONDARY_BTN} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={exportJson}
            title="Download workflow as JSON"
            className={SECONDARY_BTN}
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import workflow JSON"
            className={SECONDARY_BTN}
          >
            Import
          </button>
          <a href={CSV_EXPORT_URL} download className={SECONDARY_BTN} title="Download activity log as CSV">
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear the whole canvas?")) {
                clearAll();
                setSelectedId(null);
              }
            }}
            className={DANGER_BTN}
          >
            Clear
          </button>
        </div>

        <ThemeToggle className="h-11 shrink-0 rounded-lg border border-steel px-3 font-mono text-[10px] tracking-[0.15em] text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime" />

        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          aria-haspopup="dialog"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-steel text-sm text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime sm:flex ${FOCUS_RING}`}
        >
          ?
        </button>
      </header>

      {loadNotice && loadNotice !== noticeDismissed && (
        <NoticeBar
          message={loadNotice}
          onDismiss={() => setNoticeDismissed(loadNotice)}
        />
      )}

      {errorBanner && (
        <div
          className="flex h-11 shrink-0 items-center gap-2 border-b border-fail/40 bg-fail/10 px-3 sm:px-4"
          role="alert"
        >
          <span className="min-w-0 flex-1 truncate text-xs text-fail">{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss error"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-fail transition-colors duration-150 hover:bg-fail/20 ${FOCUS_RING}`}
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) importJsonFile(file);
        }}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden md:contents">
          <Palette addNode={addNode} codeExecAvailable={health?.code_exec ?? false} />
        </div>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <NodePatchProvider onPatch={updateNodeData}>
            <Canvas
              nodes={flowNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(node) => {
                setSelectedId(node.id);
                if (isNarrowViewport()) setInspectorOpen(true);
              }}
              onPaneClick={() => setSelectedId(null)}
              animated={false}
              fitKey={fitKey}
            />
          </NodePatchProvider>

          {/* Small-screen authoring controls: add a node or inspect the
              selected one without a pointer-sized panel. */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open node palette"
              aria-expanded={paletteOpen}
              aria-controls="palette-drawer"
              className={ICON_BTN}
            >
              <IconPlus />
            </button>
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              aria-label="Open node inspector"
              aria-expanded={inspectorOpen}
              aria-controls="inspector-drawer"
              disabled={!selectedNode}
              className={ICON_BTN}
            >
              <IconSliders />
            </button>
          </div>

          {offlineCard && (
            <div
              className="absolute left-1/2 top-1/2 z-10 w-[min(340px,88vw)] -translate-x-1/2 -translate-y-1/2"
              role="status"
              aria-live="polite"
            >
              <div className="rounded-xl border border-amber/50 bg-elevated p-5 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
                  gateway offline
                </div>
                <div className="mt-2 text-sm font-semibold text-ice">
                  No gateway connection
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-silver">
                  Run Workflow needs the gateway on port 8000. Start it with{" "}
                  <code className="rounded bg-obsidian px-1 py-0.5 font-mono text-[10px] text-signal">
                    python run_server.py
                  </code>{" "}
                  and run again. Nothing was executed, no simulated results.
                </p>
                <button
                  type="button"
                  onClick={() => setOfflineCard(false)}
                  className={`mt-3 inline-flex h-11 items-center rounded-lg border border-steel px-4 text-xs text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime ${FOCUS_RING}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {blocked402 && (
            <BlockedCard
              estimated={blocked402.estimated}
              remaining={blocked402.remaining}
              onRestore={restoreRealCap}
              onDismiss={() => setBlocked402(null)}
            />
          )}

          {!blocked402 && (
            <OverdraftDemo
              active={demoCap !== null}
              demoCap={DEMO_CAP}
              blocked={blocked402 !== null}
              offline={healthChecked && !health}
              onEnable={enableOverdraftDemo}
              onRestore={restoreRealCap}
            />
          )}
        </main>

        <div className="hidden md:contents">
          {sidebar}
        </div>

        <TaskPlanner open={plannerOpen} onClose={() => setPlannerOpen(false)} onApply={(nn, ee, task, plan) => {
          setPlanProvenance(plan.planner); setPlanStages(plan.stages);
          setGraph(nn, ee); setGeneratedTask(task); setSelectedId(null); setFitKey(k => k + 1); setPlannerOpen(false);
        }} />
        <ResultsDialog run={lastDeliverable} open={resultsOpen} onClose={() => setResultsOpen(false)} />
        <TemplatesPanel
          open={templatesOpen}
          onClose={closeTemplates}
          templates={templates}
          source={templateSource}
          canvasEmpty={canvasEmpty}
          codeExecAvailable={health?.code_exec ?? false}
          onLoad={loadTemplate}
          onLoadAndRun={loadAndRunTemplate}
        />
        <HistoryPanel
          open={historyOpen}
          onClose={closeHistory}
          runs={runs}
          onClear={clearRuns}
        />

        <MobileDrawer
          open={paletteOpen}
          onClose={closePalette}
          side="left"
          label="Node palette"
          panelId="palette-drawer"
          title="Nodes"
          panelClassName="w-[min(248px,86vw)]"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <Palette addNode={addNode} codeExecAvailable={health?.code_exec ?? false} />
          </div>
        </MobileDrawer>

        <MobileDrawer
          open={inspectorOpen}
          onClose={closeInspector}
          side="right"
          label="Node inspector"
          panelId="inspector-drawer"
          title="Inspector"
          panelClassName="w-[min(330px,88vw)]"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {sidebar}
          </div>
        </MobileDrawer>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  );
}

export default function StudioPage() {
  return (
    <ReactFlowProvider>
      <StudioInner />
    </ReactFlowProvider>
  );
}
