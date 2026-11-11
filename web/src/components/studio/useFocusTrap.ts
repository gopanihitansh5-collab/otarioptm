"use client";

import { useEffect, useRef, type RefObject } from "react";

function queryFocusables(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ),
  ).filter((el) => el.getClientRects().length > 0);
}

function isVisible(el: HTMLElement | null): el is HTMLElement {
  return !!el && el.getClientRects().length > 0;
}

/**
 * Keeps Tab focus inside a panel while it is open and returns focus to the
 * element that opened it on close. The trap is skipped when the panel is
 * mounted but hidden by CSS (responsive layouts), so a hidden drawer can never
 * steal the keyboard from the visible page.
 */
export function useFocusTrap({
  active,
  containerRef,
  onEscape,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}): void {
  const escapeRef = useRef(onEscape);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!isVisible(container)) return;
    const panel = container;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial =
      panel.querySelector<HTMLElement>("[data-autofocus]") ??
      queryFocusables(panel)[0] ??
      panel;
    initial.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = queryFocusables(containerRef.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      const inside = containerRef.current?.contains(activeEl) ?? false;
      if (event.shiftKey && (activeEl === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeEl === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener && isVisible(opener)) opener.focus();
    };
  }, [active, containerRef]);
}
