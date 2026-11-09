import { useState, useCallback } from "react";

type NodeType = "NodeChat" | "NodeWebSearch" | "NodeCodeExec" | "NodeGuardrails" | "NodeBudgetMeter" | "NodeOrchestration" | "NodeExport";

type Node = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: any;
};

type Connection = {
  id: string;
  source: string;
  target: string;
};

export type { Node, Connection };

export const useWorkflowState = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addNode = useCallback((node: Omit<Node, "id">>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNodes([...nodes, { id, ...node }]);
  }, [nodes]);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [nodes, edges]);

  const updateEdge = useCallback((edge: Connection) => {
    setEdges((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === edge.id);
      if (existingIndex >= 0) {
        return [...prev.slice(0, existingIndex), edge, ...prev.slice(existingIndex + 1)];
      }
      return [...prev, edge];
    });
  }, []);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  return {
    nodes,
    edges,
    isLoading,
    error,
    setError,
    addNode,
    removeNode,
    updateEdge,
    clearAll,
  };
};