import type { CSSProperties } from "react";
import type { NodeRunStatus, NodeType } from "@/lib/types";
import { FOCUS_RING } from "@/components/studio/ui";

/**
 * Shared visual tokens for the canvas node cards.
 * Values come straight from MASTER.md: elevated panel surface, steel border,
 * ice / silver type, lime for routing energy and active state, amber for
 * warnings, fail-red for blocked and failed nodes. Cyan is reserved for live
 * data and is not used on static node chrome.
 */

export const NODE_ACCENT = "var(--color-lime)";
export const NODE_FAIL = "var(--color-fail)";
export const NODE_SURFACE = "var(--color-elevated)";

export const STATUS_CHIPS: Record<NodeRunStatus, string> = {
  idle: "border-steel-dim bg-graphite text-silver",
  running: "border-lime/40 bg-lime/10 text-lime",
  done: "border-steel bg-graphite text-ice",
  error: "border-fail/40 bg-obsidian text-fail",
  skipped: "border-amber/30 bg-amber/10 text-amber",
};

export const STATUS_DOT: Record<NodeRunStatus, string> = {
  idle: "bg-silver",
  running: "bg-lime",
  done: "bg-ice",
  error: "bg-fail",
  skipped: "bg-amber",
};

/** Per-type border treatment: a 2px top rule keeps the four node types
 *  distinguishable without inventing off-palette hues. */
export const TYPE_RULE: Record<NodeType, string> = {
  chat: "border-t-lime/70",
  "web-search": "border-t-ice/50",
  "code-exec": "border-t-silver/60",
  guardrails: "border-t-amber/70",
};

/** Legend dots used by the palette and the inspector header. */
export const TYPE_DOT: Record<NodeType, string> = {
  chat: "bg-lime",
  "web-search": "bg-ice",
  "code-exec": "bg-silver",
  guardrails: "bg-amber",
};

export const CARD =
  "relative w-60 rounded-2xl border bg-elevated/95 p-3.5 shadow-[0_10px_30px_rgba(10,10,12,0.16)] backdrop-blur-sm transition-all duration-200 hover:shadow-[0_14px_38px_rgba(10,10,12,0.22)]";

export const RESULT_PANEL =
  "mt-2.5 space-y-1 rounded-xl border border-steel-dim/70 bg-obsidian/90 p-2.5 text-[10px] text-silver";

export const FIELD = `nodrag nowheel w-full rounded-lg border border-steel-dim/70 bg-obsidian/80 px-2.5 py-1.5 text-[11px] text-ice outline-none transition-colors duration-150 placeholder:text-silver focus:border-lime/60 ${FOCUS_RING}`;

export const FIELD_PLAIN = `nodrag w-full rounded-lg border border-steel-dim/70 bg-obsidian/80 px-2.5 py-1.5 text-[11px] text-ice outline-none transition-colors duration-150 placeholder:text-silver focus:border-lime/60 ${FOCUS_RING}`;

export const BADGE =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-steel bg-obsidian font-mono text-[9px] font-medium text-silver";

export function handleStyle(color: string): CSSProperties {
  return { background: color, width: 9, height: 9, border: `2px solid ${NODE_SURFACE}` };
}
