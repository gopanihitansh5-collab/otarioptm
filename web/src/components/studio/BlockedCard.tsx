"use client";

import { FOCUS_RING } from "./ui";

type BlockedCardProps = {
  estimated: number;
  remaining: number;
  onRestore: () => void;
  onDismiss: () => void;
};

/**
 * Honest inline card for the demo overdraft block. Mirrors the gateway's real
 * HTTP 402 pre-spend block (docs/api.md): the run is refused before any
 * provider request is made, so nothing was executed and nothing was spent.
 */
export function BlockedCard({ estimated, remaining, onRestore, onDismiss }: BlockedCardProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-10 w-[min(380px,88vw)] -translate-x-1/2 -translate-y-1/2"
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-xl border border-fail/50 bg-elevated p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fail">
          budget guard · http 402
        </div>
        <div className="mt-2 text-sm font-semibold text-ice">Run blocked before spend</div>
        <p className="mt-1.5 text-xs leading-relaxed text-silver">
          Blocked by budget guard: estimated cost exceeds remaining. HTTP 402 is
          the pre-spend block.
        </p>
        <div className="mt-2 rounded-lg border border-steel-dim bg-obsidian p-2 font-mono text-[10px] tracking-wide text-silver">
          estimated ${estimated.toFixed(4)} &gt; remaining ${remaining.toFixed(4)}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-silver">
          <span className="font-mono uppercase tracking-widest text-amber">demo cap</span>: local
          client-side demonstration; the real gateway cap is untouched. Nothing
          was executed and nothing was spent.
        </p>
        <p className="mt-1.5 text-[10px] leading-relaxed text-silver">
          docs/api.md: when a reservation does not fit the remaining cap, the
          call is refused with HTTP 402 before any provider request is made.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onRestore}
            aria-label="Restore real budget cap and dismiss this block"
            className={`flex h-11 flex-1 items-center justify-center rounded-lg border border-steel px-4 text-xs font-medium text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`}
          >
            Restore real cap
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss blocked run message"
            className={`flex h-11 items-center justify-center rounded-lg border border-steel px-4 text-xs text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime ${FOCUS_RING}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
