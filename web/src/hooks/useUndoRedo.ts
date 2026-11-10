"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkflowNode, WorkflowEdge } from "@/lib/types";

type Snapshot = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

function parseSnapshot(raw: string): Snapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return { nodes: parsed.nodes, edges: parsed.edges };
    }
    return null;
  } catch {
    return null;
  }
}

export function useUndoRedo(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  restore: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void,
  options?: { debounceMs?: number; maxDepth?: number },
): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: () => void;
} {
  const debounceMs = options?.debounceMs ?? 300;
  const maxDepth = options?.maxDepth ?? 50;

  const [history, setHistory] = useState<{ stack: string[]; index: number }>({
    stack: [],
    index: -1,
  });
  const restoringRef = useRef(false);

  useEffect(() => {
    if (restoringRef.current) return;
    const snapshot = JSON.stringify({ nodes, edges });
    const timer = window.setTimeout(() => {
      if (restoringRef.current) return;
      setHistory((prev) => {
        const stack = prev.stack.slice(0, prev.index + 1);
        if (stack[stack.length - 1] === snapshot) return prev;
        stack.push(snapshot);
        const capped =
          stack.length > maxDepth ? stack.slice(stack.length - maxDepth) : stack;
        return { stack: capped, index: capped.length - 1 };
      });
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, debounceMs, maxDepth]);

  const applySnapshot = useCallback(
    (raw: string) => {
      const snapshot = parseSnapshot(raw);
      if (!snapshot) return;
      restoringRef.current = true;
      restore(snapshot.nodes, snapshot.edges);
      window.setTimeout(() => {
        restoringRef.current = false;
      }, 0);
    },
    [restore],
  );

  const undo = useCallback(() => {
    if (restoringRef.current || history.index <= 0) return;
    restoringRef.current = true;
    setHistory({ stack: history.stack, index: history.index - 1 });
    applySnapshot(history.stack[history.index - 1]);
  }, [history, applySnapshot]);

  const redo = useCallback(() => {
    if (restoringRef.current || history.index >= history.stack.length - 1) return;
    restoringRef.current = true;
    setHistory({ stack: history.stack, index: history.index + 1 });
    applySnapshot(history.stack[history.index + 1]);
  }, [history, applySnapshot]);

  const reset = useCallback(() => {
    setHistory({ stack: [], index: -1 });
  }, []);

  return {
    undo,
    redo,
    canUndo: history.index > 0,
    canRedo: history.index < history.stack.length - 1,
    reset,
  };
}
