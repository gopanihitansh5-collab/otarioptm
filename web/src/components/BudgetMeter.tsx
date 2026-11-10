import type { BudgetSnapshot } from "@/lib/types";

type BudgetMeterProps = {
  snapshot: BudgetSnapshot | null;
  connected: boolean;
};

export function BudgetMeter({ snapshot, connected }: BudgetMeterProps) {
  const pct =
    snapshot && snapshot.cap > 0
      ? Math.min(100, Math.max(0, (snapshot.committed / snapshot.cap) * 100))
      : 0;
  const bar = pct > 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-500";

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Budget</span>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-amber-400" : "bg-neutral-600"}`} />
          {connected ? "live" : "disconnected"}
        </span>
      </div>

      {!snapshot ? (
        <div className="mt-3 animate-pulse space-y-2">
          <div className="h-6 w-24 rounded bg-neutral-800" />
          <div className="h-1.5 w-full rounded bg-neutral-800" />
          <div className="h-3 w-20 rounded bg-neutral-800" />
        </div>
      ) : (
        <>
          <div className="mt-2 font-mono text-xl text-neutral-100">
            ${snapshot.remaining.toFixed(4)}
          </div>
          <div className="text-[10px] text-neutral-500">remaining</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-neutral-500">
            <div className="flex justify-between">
              <span>spent</span>
              <span className="font-mono text-neutral-300">${snapshot.spent.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>cap</span>
              <span className="font-mono text-neutral-300">${snapshot.cap.toFixed(4)}</span>
            </div>
            {snapshot.reserved > 0 && (
              <div className="flex justify-between">
                <span>reserved</span>
                <span className="font-mono text-neutral-300">${snapshot.reserved.toFixed(4)}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
