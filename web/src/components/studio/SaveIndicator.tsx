"use client";

import type { AutosaveStatus } from "@/hooks/useAutosave";

export function SaveIndicator({ status }: { status: AutosaveStatus }) {
  return (
    <span aria-live="polite" className="contents">
      {status !== "idle" && (
        <span className="hidden h-6 shrink-0 items-center rounded border border-steel bg-elevated px-2 font-mono text-[9px] uppercase tracking-widest text-silver sm:flex">
          {status === "saving" ? "saving…" : "saved"}
        </span>
      )}
    </span>
  );
}
