import { useEffect } from "react";

export const useKeyboardShortcuts = (onUndo: () => void, onRedo: () => void, onDelete: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "z") {
          event.preventDefault();
          onUndo();
        } else if (event.key === "y") {
          event.preventDefault();
          onRedo();
        }
      }

      if (event.key === "Delete") {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, onDelete]);
};