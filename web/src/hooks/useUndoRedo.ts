import { useState, useCallback } from "react";

export const useUndoRedo = () => {
  const [history, setHistory] = useState<Array<{ nodes: any; edges: any }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [state, setState] = useState({ nodes: [] as any; edges: [] as any });

  const saveState = useCallback(() => {
    const current = { nodes: state.nodes, edges: state.edges };
    setHistory((prev) => {
      const next = [...prev];
      next.splice(historyIndex + 1, next.length);
      next.push(current);
      return next;
    });
    setHistoryIndex(historyIndex + 1);
  }, [state, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    setHistoryIndex(historyIndex - 1);
    const prev = history[historyIndex - 1];
    if (prev) {
      setState({ nodes: prev.nodes, edges: prev.edges });
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    const next = history[historyIndex + 1];
    if (next) {
      setState({ nodes: next.nodes, edges: next.edges });
    }
  }, [historyIndex]);

  return { state, undo, redo, saveState };
};