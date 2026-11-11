"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";

import { Canvas } from "@/components/Canvas";
import { Palette } from "@/components/Palette";
import { Sidebar } from "@/components/Sidebar";
import { nodeTypes } from "@/components/nodeTypes";
import { NodePatchProvider } from "@/components/nodeDataPatch";
import { HistoryPanel } from "@/components/studio/HistoryPanel";
import { SaveIndicator } from "@/components/studio/SaveIndicator";
import { ShortcutsDialog } from "@/components/studio/ShortcutsDialog";
import { TemplatesPanel } from "@/components/studio/TemplatesPanel";
import { DANGER_BTN, FOCUS_RING, SECONDARY_BTN } from "@/components/studio/ui";
import { useBudget } from "@/hooks/useBudget";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRunHistory } from "@/hooks/useRunHistory";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { CSV_EXPORT_URL, getHealth, runWorkflow } from "@/lib/api";
import { buildWorkflowExport, downloadWorkflowJson } from "@/lib/workflow/exportImport";
import { buildRunRecord } from "@/lib/workflow/runHistory";
import { fetchTemplates, type WorkflowTemplate } from "@/lib/workflow/templates";
import { validateWorkflowInput, validateWorkflowJson } from "@/lib/workflow/validate";
import type { HealthResponse, WorkflowNode } from "@/lib/types";

type GatewayState = "checking" | "otari" | "groq" | "demo" | "offline";

const GATEWAY_BADGE: Record<GatewayState, { dot: string; label: string; title?: string }> = {
  checking: { dot: "bg-silver", label: "checking gateway" },
  otari: { dot: "bg-lime", label: "Otari live" },
  groq: { dot: "bg-amber", label: "Groq fallback" },
  demo: { dot: "bg-silver", label: "Demo mode" },
  offline: { dot: "bg-fail", label: "Gateway offline", title: "Gateway unreachable" },
};

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
  } = state;

  const { undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, (nn, ee) =>
    setGraph(nn, ee),
  );
  const { snapshot, events, connected } = useBudget();
  const { runs, recordRun, clearRuns } = useRunHistory();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [offlineCard, setOfflineCard] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[] | null>(null);
  const [templateSource, setTemplateSource] = useState<"gateway" | "local" | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const setError = (message: string) => {
    setErrorBanner(message);
    window.setTimeout(
      () => setErrorBanner((current) => (current === message ? null : current)),
      6000,
    );
  };

  const canvasEmpty = nodes.length === 0 && edges.length === 0;

  const run = async () => {
    if (running || nodes.length === 0) return;
    if (!healthChecked) return;
    if (!health) {
      setOfflineCard(true);
      return;
    }
    setRunning(true);
    setOfflineCard(false);
    const startedAt = performance.now();
    for (const node of nodes) {
      updateNodeData(node.id, { status: "running", statusInfo: null });
    }
    try {
      const response = await runWorkflow(nodes, edges);
      const byId = new Map(response.steps.map((s) => [s.nodeId, s]));
      for (const node of nodes as WorkflowNode[]) {
        const step = byId.get(node.id);
        if (step) {
          updateNodeData(node.id, {
            status: step.error || step.blocked ? "error" : "done",
            statusInfo: step,
          });
        } else {
          updateNodeData(node.id, { status: "skipped", statusInfo: null });
        }
      }
      recordRun(
        buildRunRecord({
          status: response.aborted ? "aborted" : "completed",
          nodeCount: nodes.length,
          durationMs: Math.round(performance.now() - startedAt),
          steps: response.steps,
        }),
      );
      if (response.aborted) {
        setError(`Run aborted at node ${response.aborted} (budget cap or guardrail).`);
      }
    } catch (err) {
      for (const node of nodes) {
        updateNodeData(node.id, { status: "error" });
      }
      recordRun(
        buildRunRecord({
          status: "error",
          nodeCount: nodes.length,
          durationMs: Math.round(performance.now() - startedAt),
          steps: [],
        }),
      );
      setError(err instanceof Error ? err.message : "Workflow run failed");
    } finally {
      setRunning(false);
    }
  };

  const loadTemplate = (template: WorkflowTemplate) => {
    const result = validateWorkflowInput(template.graph);
    if (!result.ok) {
      setError(`Template "${template.name}" is malformed and cannot be loaded.`);
      return;
    }
    setGraph(result.graph.nodes, result.graph.edges);
    setSelectedId(null);
    setTemplatesOpen(false);
    setFitKey((k) => k + 1);
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-obsidian text-ice">
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-steel bg-graphite px-2 sm:gap-2 sm:px-4">
        <Link
          href="/"
          className={`flex h-11 shrink-0 items-center rounded-lg px-1 text-sm font-semibold tracking-tight text-ice transition-colors duration-150 hover:text-lime ${FOCUS_RING}`}
        >
          OtariOptm
        </Link>
        <span className="mono-label hidden md:inline">studio</span>

        <span
          className="hidden h-6 shrink-0 items-center gap-1.5 rounded border border-steel bg-elevated px-2 font-mono text-[10px] tracking-wider text-silver sm:flex"
          title={GATEWAY_BADGE[gatewayState].title}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${GATEWAY_BADGE[gatewayState].dot}`} />
          {GATEWAY_BADGE[gatewayState].label}
        </span>

        <div className="min-w-0 flex-1" />

        <button
          type="button"
          onClick={() => setTemplatesOpen((v) => !v)}
          aria-expanded={templatesOpen}
          aria-controls="templates-panel"
          className={SECONDARY_BTN}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
          aria-controls="history-panel"
          className={SECONDARY_BTN}
        >
          History
        </button>

        <div className="min-w-0 flex-1" />

        <SaveIndicator status={saveStatus} />

        <button
          type="button"
          onClick={run}
          disabled={running || nodes.length === 0}
          className={`flex h-11 shrink-0 items-center gap-2 rounded-lg bg-lime px-3.5 text-xs font-semibold text-lime-ink transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          {running && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-lime-ink/30 border-t-lime-ink"
              aria-hidden="true"
            />
          )}
          {running ? "Running…" : "Run Workflow"}
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
          <Palette addNode={addNode} />
        </div>

        <main className="relative min-w-0 flex-1">
          <NodePatchProvider onPatch={updateNodeData}>
            <Canvas
              nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              animated={running}
              fitKey={fitKey}
            />
          </NodePatchProvider>

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
                  and run again. Nothing was executed — no simulated results.
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
        </main>

        <div className="hidden md:contents">
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
            events={events}
          />
        </div>

        <TemplatesPanel
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          templates={templates}
          source={templateSource}
          canvasEmpty={canvasEmpty}
          onLoad={loadTemplate}
        />
        <HistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          runs={runs}
          onClear={clearRuns}
        />
      </div>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
