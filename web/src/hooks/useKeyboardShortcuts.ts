"use client";

import { useEffect, useRef } from "react";

export function useKeyboardShortcuts(handlers: {
  undo: () => void;
  redo: () => void;
  onDelete?: () => void;
  save?: () => void;
}): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const h = handlersRef.current;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.altKey && (event.key === "z" || event.key === "Z")) {
        event.preventDefault();
        if (event.shiftKey) h.redo();
        else h.undo();
        return;
      }
      if (mod && !event.shiftKey && (event.key === "y" || event.key === "Y")) {
        event.preventDefault();
        h.redo();
        return;
      }
      if (mod && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        h.save?.();
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        h.onDelete?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
