"use client";

import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "./useFocusTrap";
import { CLOSE_BTN } from "./ui";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  label: string;
  panelId: string;
  title: string;
  panelClassName?: string;
  children: ReactNode;
};

/**
 * Small-screen drawer used below the md breakpoint. It reuses the Drawer
 * pattern (off-canvas panel, inert when closed, labelled close control) and
 * adds a backdrop plus a real focus trap so the authoring surface is usable
 * on a phone.
 */
export function MobileDrawer({
  open,
  onClose,
  side,
  label,
  panelId,
  title,
  panelClassName = "w-[min(320px,86vw)]",
  children,
}: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ active: open, containerRef: panelRef, onEscape: onClose });

  return (
    <div
      className={`absolute inset-0 z-30 md:hidden ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${label}`}
        tabIndex={open ? 0 : -1}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
      />
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute bottom-0 top-0 flex flex-col border-steel bg-graphite transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${panelClassName} ${
          side === "left" ? "left-0 border-r" : "right-0 border-l"
        } ${
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-steel px-3 py-2">
          <span className="mono-label">{title}</span>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={`Close ${label}`}
            className={CLOSE_BTN}
          >
            ×
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
