import type { BudgetSnapshot } from "@/lib/types";

type BudgetMeterProps = {
  snapshot: BudgetSnapshot | null;
  connected: boolean;
};

/**
 * Budget health panel. MASTER.md: lime is the budget-health accent, amber is
 * the warning tier, red is the blocked / over-cap tier, silver carries the
 * labels and the figures are mono. The panel is an elevated surface with a
 * steel border, never a shadow.
 */
export function BudgetMeter({ snapshot, connected }: BudgetMeterProps) {
  const pct =
    snapshot && snapshot.cap > 0
      ? Math.min(100, Math.max(0, (snapshot.committed / snapshot.cap) * 100))
      : 0;
  const bar = pct > 90 ? "bg-fail" : pct >= 80 ? "bg-amber" : "bg-lime";
  const figure = pct > 90 ? "text-fail" : pct >= 80 ? "text-amber" : "text-lime";

  return (
    <div className="rounded-xl border border-steel bg-elevated p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-lime">
          Budget
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-silver">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-lime" : "bg-steel"}`}
            aria-hidden="true"
          />
          {connected ? "live" : "disconnected"}
        </span>
      </div>

      {!snapshot ? (
        <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
          <div className="h-6 w-24 rounded bg-steel-dim" />
          <div className="h-1.5 w-full rounded bg-steel-dim" />
          <div className="h-3 w-20 rounded bg-steel-dim" />
        </div>
      ) : (
        <>
          <div className={`mt-2 font-mono text-xl font-semibold ${figure}`}>
            ${snapshot.remaining.toFixed(4)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-silver">
            remaining
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-obsidian"
            role="progressbar"
            aria-label="Budget committed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-silver">
            <div className="flex justify-between">
              <span>spent</span>
              <span className="font-mono text-ice">${snapshot.spent.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>cap</span>
              <span className="font-mono text-ice">${snapshot.cap.toFixed(4)}</span>
            </div>
            {snapshot.reserved > 0 && (
              <div className="flex justify-between">
                <span>reserved</span>
                <span className="font-mono text-ice">${snapshot.reserved.toFixed(4)}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
