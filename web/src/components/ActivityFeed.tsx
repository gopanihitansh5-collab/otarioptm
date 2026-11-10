import type { ActivityEvent } from "@/lib/types";

type ActivityFeedProps = {
  events: ActivityEvent[];
};

const CHIPS: Record<string, string> = {
  "node.completed": "bg-emerald-500/15 text-emerald-300",
  "workflow.started": "bg-indigo-500/15 text-indigo-300",
  "workflow.finished": "bg-neutral-500/15 text-neutral-300",
  "workflow.blocked": "bg-red-500/15 text-red-300",
  pong: "bg-neutral-800 text-neutral-500",
};

function chipCls(event: string): string {
  return CHIPS[event] ?? "bg-neutral-800 text-neutral-400";
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
      <div className="shrink-0 px-4 pb-2 pt-3 text-[10px] uppercase tracking-widest text-neutral-500">
        Activity
      </div>
      {events.length === 0 ? (
        <div className="px-4 pb-4 text-[11px] text-neutral-600">
          No activity yet — run a workflow.
        </div>
      ) : (
        <ul className="scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
          {[...events]
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 60)
            .map((e, i) => {
              const detail = rowDetail(e);
              return (
                <li key={`${e.event}-${e.ts}-${i}`} className="flex items-start gap-2 text-[10px]">
                  <span className="shrink-0 pt-0.5 font-mono text-neutral-600">{fmtTime(e.ts)}</span>
                  <span className={`shrink-0 rounded px-1 py-0.5 font-medium ${chipCls(e.event)}`}>
                    {e.event}
                  </span>
                  {detail && (
                    <span className="min-w-0 flex-1 truncate text-neutral-400" title={detail}>
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
