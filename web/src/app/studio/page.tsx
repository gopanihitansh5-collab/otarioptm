"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { Canvas } from "@/components/Canvas";
import { Palette } from "@/components/Palette";
import { Sidebar } from "@/components/Sidebar";
import { nodeTypes } from "@/components/nodeTypes";
import { NodePatchProvider } from "@/components/nodeDataPatch";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBudget } from "@/hooks/useBudget";
import { CSV_EXPORT_URL, getHealth, runWorkflow } from "@/lib/api";
import type { HealthResponse, WorkflowNode } from "@/lib/types";

type GatewayState = "checking" | "otari" | "groq" | "demo" | "offline";

function StudioInner() {
  const state = useWorkflowState();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, removeNode, updateNodeData, clearAll, setGraph } = state;

  const { undo, redo, canUndo, canRedo } = useUndoRedo(nodes, edges, (nn, ee) =>
    setGraph(nn, ee),
  );
  const { snapshot, events, connected } = useBudget();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useKeyboardShortcuts({
    undo,
    redo,
    onDelete: () => {
      if (selectedId) {
        removeNode(selectedId);
        setSelectedId(null);
      }
    },
  });

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then((h) => {
        if (mounted) setHealth(h);
      })
      .catch(() => {
        if (mounted) setHealth(null);
      });
    const t = setInterval(() => {
      getHealth()
        .then((h) => {
          if (mounted) setHealth(h);
        })
        .catch(() => {});
    }, 20000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const gatewayState: GatewayState = !health
    ? connected
      ? "demo"
      : "offline"
    : health.otari
      ? "otari"
      : health.groq
        ? "groq"
        : "demo";

  const GATEWAY_BADGE: Record<GatewayState, { dot: string; label: string }> = {
    checking: { dot: "bg-neutral-500", label: "checking gateway" },
    otari: { dot: "bg-emerald-400", label: "Otari live" },
    groq: { dot: "bg-amber-400", label: "Groq fallback" },
    demo: { dot: "bg-sky-400", label: "Demo mode" },
    offline: { dot: "bg-red-500", label: "Gateway offline" },
  };

  const setError = (message: string) => {
    setErrorBanner(message);
    window.setTimeout(() => setErrorBanner((current) => (current === message ? null : current)), 6000);
  };

  const run = async () => {
    if (running || nodes.length === 0) return;
    setRunning(true);
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
      if (response.aborted) {
        setError(`Run aborted at node ${response.aborted} (budget cap or guardrail).`);
      }
    } catch (err) {
      for (const node of nodes) {
        updateNodeData(node.id, { status: "error" });
      }
      setError(err instanceof Error ? err.message : "Workflow run failed");
    } finally {
      setRunning(false);
    }
  };

  const selectedNode = selectedId ? (nodes.find((n) => n.id === selectedId) ?? null) : null;

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0d] text-neutral-100">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d0d10] px-4">
        <a href="/" className="text-sm font-semibold tracking-tight text-neutral-100">
          OtariOptm
        </a>
        <span className="text-[10px] uppercase tracking-widest text-neutral-600">studio</span>
        <span
          className="ml-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900 px-2.5 py-1 text-[10px] text-neutral-400"
          title={health ? undefined : "Gateway unreachable"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${GATEWAY_BADGE[gatewayState].dot}`} />
          {GATEWAY_BADGE[gatewayState].label}
        </span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={run}
          disabled={running || nodes.length === 0}
          className="flex h-8 items-center gap-2 rounded-lg bg-indigo-500 px-3.5 text-xs font-medium text-white transition-transform hover:bg-indigo-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {running ? "Running…" : "Run Workflow"}
        </button>

        <a
          href={CSV_EXPORT_URL}
          download
          className="h-8 rounded-lg border border-white/10 px-3 text-xs leading-8 text-neutral-300 transition-colors hover:border-indigo-500/50 hover:text-white"
        >
          Export CSV
        </a>

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="h-8 rounded-lg border border-white/10 px-2.5 text-xs text-neutral-300 transition-colors hover:border-indigo-500/50 hover:text-white disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="h-8 rounded-lg border border-white/10 px-2.5 text-xs text-neutral-300 transition-colors hover:border-indigo-500/50 hover:text-white disabled:opacity-40"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear the whole canvas?")) {
              clearAll();
              setSelectedId(null);
            }
          }}
          className="h-8 rounded-lg border border-red-500/20 px-2.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
        >
          Clear
        </button>
      </header>

      {errorBanner && (
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-4 text-xs text-red-300">
          <span className="flex-1 truncate">{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-red-300 hover:text-white">
            ×
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Palette addNode={addNode} />
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
            />
          </NodePatchProvider>
        </main>
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
