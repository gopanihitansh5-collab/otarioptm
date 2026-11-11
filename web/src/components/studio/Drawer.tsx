"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  label: string;
  panelId: string;
  children: ReactNode;
};

export function Drawer({ open, onClose, side, label, panelId, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(
        "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      id={panelId}
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      className={`absolute bottom-0 top-0 z-20 w-[min(320px,88vw)] border-steel bg-graphite transition-[transform,visibility] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
        side === "left" ? "left-0 border-r" : "right-0 border-l"
      } ${
        open
          ? "visible translate-x-0"
          : side === "left"
            ? "invisible -translate-x-full"
            : "invisible translate-x-full"
      }`}
    >
      {children}
    </div>
  );
}
