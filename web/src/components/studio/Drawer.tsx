"use client";

import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "./useFocusTrap";

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
  useFocusTrap({ active: open, containerRef: panelRef, onEscape: onClose });

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
