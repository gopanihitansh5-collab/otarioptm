"use client";

import { useEffect, useRef } from "react";
import { CLOSE_BTN } from "./ui";

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["Ctrl", "Z"], action: "Undo last change" },
  { keys: ["Ctrl", "Shift", "Z"], action: "Redo" },
  { keys: ["Ctrl", "Y"], action: "Redo" },
  { keys: ["Ctrl", "S"], action: "Save workflow now" },
  { keys: ["Delete"], action: "Remove selected node" },
  { keys: ["Backspace"], action: "Remove selected node" },
  { keys: ["?"], action: "Open this help" },
  { keys: ["Esc"], action: "Close panels and dialogs" },
];

function queryFocusables(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    ),
  );
}

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial =
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      queryFocusables(panelRef.current)[0];
    initial?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = queryFocusables(panelRef.current);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current?.contains(active) ?? false;
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close shortcuts"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative w-[min(420px,92vw)] rounded-xl border border-steel bg-elevated p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="mono-label">Keyboard</div>
            <h2 id="shortcuts-title" className="mt-1 text-base font-semibold text-ice">
              Shortcuts
            </h2>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close shortcuts"
            className={CLOSE_BTN}
          >
            ×
          </button>
        </div>
        <ul className="mt-3 divide-y divide-steel-dim">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={`${shortcut.action}-${shortcut.keys.join("+")}`}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-xs text-silver">{shortcut.action}</span>
              <span className="flex shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-steel bg-obsidian px-1.5 py-0.5 font-mono text-[10px] text-silver"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] text-silver">On macOS use ⌘ instead of Ctrl.</p>
      </div>
    </div>
  );
}
