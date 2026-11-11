"use client";

import { FOCUS_RING } from "./ui";

type OverdraftDemoProps = {
  active: boolean;
  demoCap: number;
  blocked: boolean;
  offline: boolean;
  onEnable: () => void;
  onRestore: () => void;
};

/**
 * Judge-demo control for the HTTP 402 overdraft moment. Sets a LOCAL demo cap
 * used only by the client to demonstrate the pre-spend block path; the real
 * gateway cap is never changed. Always labeled DEMO CAP.
 */
export function OverdraftDemo({
  active,
  demoCap,
  blocked,
  offline,
  onEnable,
  onRestore,
}: OverdraftDemoProps) {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex w-[min(260px,72vw)] justify-end">
      {active ? (
        <div
          className={`pointer-events-auto rounded-xl border bg-elevated/95 p-3 ${
            blocked ? "border-fail/60" : "border-steel"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-silver">
              demo overdraft
            </span>
            <span
              className={`rounded border px-1 py-0.5 font-mono text-[9px] tracking-widest ${
                blocked
                  ? "border-fail/50 bg-fail/10 text-fail"
                  : "border-steel bg-obsidian text-silver"
              }`}
            >
              DEMO CAP ${demoCap.toFixed(4)}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-silver">
            Local client-side demo only, the real gateway cap is untouched.
            {offline && " Gateway is offline."}
          </p>
          <button
            type="button"
            onClick={onRestore}
            aria-label="Restore real budget cap and end the overspend demo"
            className={`mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-steel px-3 text-xs font-medium text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`}
          >
            Restore real cap
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          aria-label="Enable the local overspend demo cap to preview the HTTP 402 block path"
          title="Client-side demo of the HTTP 402 pre-spend block. The real gateway cap is never changed."
          className={`pointer-events-auto flex h-11 items-center justify-center rounded-lg border border-steel bg-elevated/95 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`}
        >
          Try overspend demo
        </button>
      )}
    </div>
  );
}
