"use client";

import { Canvas } from "@/components/Canvas";
import { NodeChat } from "@/components/nodes/NodeChat";
import { NodeWebSearch } from "@/components/nodes/NodeWebSearch";
import { NodeCodeExec } from "@/components/nodes/NodeCodeExec";
import { NodeGuardrails } from "@/components/nodes/NodeGuardrails";
import { NodeBudgetMeter as NodeBudgetNode } from "@/components/nodes/NodeBudgetMeter";
import { NodeOrchestration } from "@/components/nodes/NodeOrchestration";
import { NodeExport } from "@/components/nodes/NodeExport";
import { BudgetMeter } from "@/components/BudgetMeter";
import { useWorkflowState } from "@/hooks/useWorkflowState";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBudget } from "@/hooks/useBudget";

export const Page = () => {
  const { nodes, edges, addNode, removeNode, updateEdge, clearAll } = useWorkflowState();
  const { undo, redo, saveState } = useUndoRedo();
  const { onUndo, onRedo, onDelete } = useKeyboardShortcuts(undo, redo, () => {
    // Delete handler - would need selection state
  });
  const { spent, remaining, cap, progress, color, isConnected } = useBudget();

  useEffect(() => {
    saveState();
  }, [nodes, edges]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <Canvas />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <NodeChat />
          <NodeWebSearch />
          <NodeCodeExec />
          <NodeGuardrails />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NodeBudgetNode />
          <NodeOrchestration />
          <NodeExport />
        </div>
      </div>
      <aside className="w-64 border-l p-6 bg-secondary/60 dark:bg-secondary/80 min-h-screen">
        <BudgetMeter />
        <div className="mt-6">
          <h3 className="font-semibold mb-4">Budget</h3>
          {isConnected && (
            <div className="bg-secondary/50 rounded p-3 mb-4">
              <p className="text-sm text-muted-foreground mb-2">Spent: {spent} / {cap}</p>
              <div className="bg-secondary-900 rounded h-2 w-full overflow-hidden">
                <div
                  className={`bg-${color} h-full transition-colors duration-300 ease-out w-${progress}%`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
            </div>
          )}
          {!isConnected && (
            <p className="text-xs text-muted-foreground mb-4">Connecting to OTARI activity...</p>
          )}
          <button
            onClick={clearAll}
            className="w-full px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded mb-3"
          >
            Clear Canvas
          </button>
          <button
            onClick={undo}
            className="w-full px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded mb-3"
          >
            Undo (Ctrl+Z)
          </button>
          <button
            onClick={redo}
            className="w-full px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded"
          >
            Redo (Ctrl+Y)
          </button>
        </div>
      </aside>
    </div>
  );
};

export default function Home() {
  return <Page />;
}