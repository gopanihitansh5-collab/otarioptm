"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NODE_LABELS, type NodeType, type WorkflowNodeData } from "@/lib/types";

export type { WorkflowNode, WorkflowEdge } from "@/lib/types";
import type { WorkflowNode, WorkflowEdge } from "@/lib/types";

export type { NodeChange, EdgeChange } from "@xyflow/react";
import type { Connection, NodeChange, EdgeChange } from "@xyflow/react";

const STORAGE_KEY = "otarioptm.workflow.v1";
const SAVE_DEBOUNCE_MS = 300;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function loadSnapshot(persist: boolean): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (!persist || typeof window === "undefined") return { nodes: [], edges: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };
    const parsed = JSON.parse(raw) as {
      nodes?: unknown;
      edges?: unknown;
    };
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return {
        nodes: parsed.nodes as WorkflowNode[],
        edges: parsed.edges as WorkflowEdge[],
      };
    }
  } catch {
    /* corrupt snapshot ignored */
  }
  return { nodes: [], edges: [] };
}

function defaultNodeData(type: NodeType): WorkflowNodeData {
  switch (type) {
    case "chat":
      return { label: NODE_LABELS.chat, prompt: "" };
    case "web-search":
      return { label: NODE_LABELS["web-search"], query: "" };
    case "code-exec":
      return { label: NODE_LABELS["code-exec"], code: 'print("hello")' };
    case "guardrails":
      return { label: NODE_LABELS.guardrails, banned: [], stop_on_block: true };
  }
}

export function useWorkflowState(options?: { persist?: boolean }): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType) => string;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  clearAll: () => void;
  setGraph: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
} {
  const persist = options?.persist !== false;
  // Start empty so SSR and first client render match; hydrate from
  // localStorage in an effect to avoid a hydration mismatch (React keeps
  // stale SSR attributes such as a wrongly-disabled Run button).
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const hydratedRef = useRef(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      hydratedRef.current = true;
      const snapshot = loadSnapshot(persist);
      if (snapshot.nodes.length > 0 || snapshot.edges.length > 0) {
        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [persist]);

  const serialized = JSON.stringify({ nodes, edges });

  useEffect(() => {
    if (!persist || typeof window === "undefined" || !hydratedRef.current)
      return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch {
        /* quota exceeded ignored */
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [serialized, persist]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => {
      let next: WorkflowNode[] | null = null;
      for (const change of changes) {
        const c = change as {
          id?: string;
          type?: string;
          position?: { x: number; y: number };
          positionAbsolute?: { x: number; y: number };
        };
        if (typeof c.id !== "string") continue;
        if (c.type === "remove") {
          next = (next ?? prev).filter((n) => n.id !== c.id);
        } else if (c.type === "position" && (c.position || c.positionAbsolute)) {
          const position = c.position ?? c.positionAbsolute!;
          next = (next ?? prev).map((n) =>
            n.id === c.id ? { ...n, position } : n,
          );
        }
        /* select / dimensions / others: no-op */
      }
      return next ?? prev;
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => {
      let next: WorkflowEdge[] | null = null;
      for (const change of changes) {
        const c = change as { id?: string; type?: string };
        if (c.type === "remove" && typeof c.id === "string") {
          next = (next ?? prev).filter((e) => e.id !== c.id);
        }
      }
      return next ?? prev;
    });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target) return;
    setEdges((prev) => {
      if (prev.some((e) => e.source === source && e.target === target)) {
        return prev;
      }
      return [...prev, { id: `e-${source}-${target}`, source, target }];
    });
  }, []);

  const addNode = useCallback(
    (type: NodeType): string => {
      counterRef.current += 1;
      const id = `node-${Date.now().toString(36)}-${counterRef.current}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      // Cascade new nodes across the canvas instead of stacking them.
      const idx = nodes.length;
      const position = {
        x: clamp(80 + (idx % 2) * 560, 0, 900),
        y: 60 + (Math.floor(idx / 2) % 4) * 300,
      };
      setNodes((prev) => [
        ...prev,
        { id, type, position, data: defaultNodeData(type) },
      ]);
      return id;
    },
    [nodes.length],
  );

  const removeNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) =>
      prev.filter((e) => e.source !== id && e.target !== id),
    );
  }, []);

  const updateNodeData = useCallback(
    (id: string, data: Partial<WorkflowNodeData>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
      );
    },
    [],
  );

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  const setGraph = useCallback(
    (nextNodes: WorkflowNode[], nextEdges: WorkflowEdge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [],
  );

  return {
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
  };
}
