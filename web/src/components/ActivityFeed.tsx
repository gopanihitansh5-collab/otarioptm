import type { ActivityEvent } from "@/lib/types";

type ActivityFeedProps = {
  events: ActivityEvent[];
};

/**
 * Activity stream. Every label sits at or above 4.5:1 on the elevated panel:
 * silver timestamps (6.0:1), lime for a completed node, silver for a started
 * workflow, ice for a finished one, red for a blocked run. Rows are separated
 * by a steel hairline because the content is tabular.
 */
const CHIPS: Record<string, string> = {
  "node.completed": "border border-lime/40 bg-lime/10 text-lime",
  "workflow.started": "border border-steel bg-graphite text-silver",
  "workflow.finished": "border border-steel bg-graphite text-ice",
  "workflow.blocked": "border border-fail/40 bg-obsidian text-fail",
  pong: "border border-steel-dim bg-graphite text-silver",
};

function chipCls(event: string): string {
  return CHIPS[event] ?? "border border-steel-dim bg-graphite text-silver";
}

function fmtTime(ts: number): string {
  if (!ts) return "--:--:--";
  return new Date(ts * 1000).toLocaleTimeString("en-GB", { hour12: false });
}

function rowDetail(e: ActivityEvent): string {
  if (e.event === "node.completed") {
    const parts: string[] = [];
    if (typeof e.nodeId === "string") parts.push(e.nodeId);
    if (typeof e.model === "string") parts.push(e.model);
    if (typeof e.tokens === "number") parts.push(`${e.tokens} tok`);
    if (typeof e.cost === "number") parts.push(`$${e.cost.toFixed(4)}`);
    if (typeof e.latencyMs === "number") parts.push(`${e.latencyMs} ms`);
    return parts.join(" · ");
  }
  if (e.event === "workflow.started") {
    const n = Array.isArray(e.nodes)
      ? e.nodes.length
      : typeof e.nodeCount === "number"
        ? e.nodeCount
        : typeof e.node_count === "number"
          ? e.node_count
          : typeof e.nodes === "number"
            ? e.nodes
            : undefined;
    return n != null ? `${n} nodes` : "";
  }
  if (e.event === "workflow.blocked") {
    const parts: string[] = [];
    if (typeof e.nodeId === "string") parts.push(e.nodeId);
    if (typeof e.reason === "string") parts.push(e.reason);
    return parts.join(" · ");
  }
  if (e.event === "pong") return "gateway ping";
  return "";
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pb-2 pt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-lime">
        Activity
      </div>
      {events.length === 0 ? (
        <div className="px-4 pb-4 text-[11px] text-silver">
          No activity yet. Run a workflow.
        </div>
      ) : (
        <ul className="scroll-thin min-h-0 flex-1 divide-y divide-steel-dim overflow-y-auto px-4 pb-4">
          {[...events]
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 60)
            .map((e, i) => {
              const detail = rowDetail(e);
              return (
                <li
                  key={`${e.event}-${e.ts}-${i}`}
                  className="flex items-start gap-2 py-1.5 text-[10px]"
                >
                  <span className="shrink-0 pt-0.5 font-mono text-silver">
                    {fmtTime(e.ts)}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest ${chipCls(e.event)}`}
                  >
                    {e.event}
                  </span>
                  {detail && (
                    <span className="min-w-0 flex-1 truncate text-silver" title={detail}>
                      {detail}
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
