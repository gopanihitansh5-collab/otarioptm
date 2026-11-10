import {
  ActivityFeed,
} from "@/components/ActivityFeed";
import { BudgetMeter } from "@/components/BudgetMeter";
import {
  NODE_LABELS,
  type ActivityEvent,
  type BudgetSnapshot,
  type NodeRunStatus,
  type NodeType,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/lib/types";

type SidebarProps = {
  node: WorkflowNode | null;
  onUpdateData: (id: string, patch: Partial<WorkflowNodeData>) => void;
  onRemove: (id: string) => void;
  onDeselect?: () => void;
  snapshot: BudgetSnapshot | null;
  connected: boolean;
  events: ActivityEvent[];
};

const TYPE_COLORS: Record<NodeType, string> = {
  chat: "bg-indigo-400",
  "web-search": "bg-sky-400",
  "code-exec": "bg-emerald-400",
  guardrails: "bg-amber-400",
};

const STATUS_CHIPS: Record<NodeRunStatus, string> = {
  idle: "border-white/10 bg-neutral-800 text-neutral-400",
  running: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  skipped: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const FIELD =
  "nodrag w-full rounded-md border border-white/10 bg-neutral-950/80 px-2 py-1.5 text-[11px] text-neutral-200 outline-none focus:border-indigo-500/60";

function Inspector({
  node,
  onUpdateData,
  onRemove,
  onDeselect,
}: {
  node: WorkflowNode;
  onUpdateData: (id: string, patch: Partial<WorkflowNodeData>) => void;
  onRemove: (id: string) => void;
  onDeselect?: () => void;
}) {
  const type = node.type;
  const data = node.data;
  const status = (data.status ?? "idle") as NodeRunStatus;
  const step = data.statusInfo ?? null;

  const patch = (p: Partial<WorkflowNodeData>) => onUpdateData(node.id, p);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[type] ?? "bg-neutral-500"}`} />
        <span className="flex-1 truncate text-xs font-medium text-neutral-100">
          {data.label || NODE_LABELS[type] || node.id}
        </span>
        <span
          className={`rounded border px-1 py-0.5 text-[9px] uppercase tracking-wide ${
            STATUS_CHIPS[status]
          }`}
        >
          {status}
        </span>
        {onDeselect && (
          <button
            type="button"
            onClick={onDeselect}
            title="Close inspector"
            className="text-xs leading-none text-neutral-500 hover:text-neutral-200"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2 text-[10px] text-neutral-600">{node.id}</div>

      <div className="mt-3 space-y-1.5">
        {type === "chat" && (
          <>
            <textarea
              className={FIELD}
              rows={2}
              placeholder="Prompt..."
              value={data.prompt ?? ""}
              onChange={(e) => patch({ prompt: e.target.value })}
            />
            <input
              className={FIELD}
              placeholder="System text..."
              value={data.system ?? ""}
              onChange={(e) => patch({ system: e.target.value })}
            />
          </>
        )}
        {type === "web-search" && (
          <input
            className={FIELD}
            placeholder="Query..."
            value={data.query ?? ""}
            onChange={(e) => patch({ query: e.target.value })}
          />
        )}
        {type === "code-exec" && (
          <textarea
            className={`${FIELD} font-mono text-[10px]`}
            rows={3}
            placeholder="// python code..."
            spellCheck={false}
            value={data.code ?? ""}
            onChange={(e) => patch({ code: e.target.value })}
          />
        )}
        {type === "guardrails" && (
          <>
            <input
              className={FIELD}
              placeholder="banned, terms, comma sep"
              value={Array.isArray(data.banned) ? data.banned.join(", ") : ""}
              onChange={(e) =>
                patch({
                  banned: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <label className="flex items-center gap-2 text-[10px] text-neutral-400">
              <input
                type="checkbox"
                checked={data.stop_on_block ?? false}
                onChange={(e) => patch({ stop_on_block: e.target.checked })}
                className="h-3 w-3 accent-amber-500"
              />
              Stop on block
            </label>
          </>
        )}
      </div>

      {step && (
        <div className="mt-3 rounded-lg border border-white/10 bg-neutral-950/60 p-2.5 text-[10px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            {step.blocked && (
              <span className="rounded bg-red-500/15 px-1 py-0.5 text-red-300">blocked</span>
            )}
            {step.demo && (
              <span className="rounded bg-sky-500/15 px-1 py-0.5 text-sky-300">demo</span>
            )}
            {step.error && <span className="truncate text-red-300">{step.error}</span>}
          </div>
          {step.model && (
            <div className="mt-1.5">
              <span className="text-neutral-600">model</span>{" "}
              <span className="text-neutral-300">{step.model}</span>
            </div>
          )}
          {step.routing && (
            <div>
              <span className="text-neutral-600">routing</span>{" "}
              <span className="text-neutral-300">{step.routing}</span>
            </div>
          )}
          {step.chain && step.chain.length > 0 && (
            <div
              className="mt-1.5 truncate font-mono text-neutral-300"
              title={step.chain.join(" -> ")}
            >
              {step.chain.join(" -> ")}
            </div>
          )}
          <div className="mt-1.5 flex gap-3 font-mono text-neutral-300">
            <span>{step.tokens ?? 0} tok</span>
            <span>${(step.cost ?? 0).toFixed(4)}</span>
            <span>{step.latencyMs ?? 0} ms</span>
          </div>
          {step.violations && step.violations.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {step.violations.map((v, i) => (
                <span key={i} className="rounded bg-red-500/10 px-1 py-0.5 text-red-300">
                  {v.rule}
                </span>
              ))}
            </div>
          )}
          {step.output && (
            <pre className="scroll-thin mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-900 p-1.5 font-mono text-[10px] leading-relaxed text-neutral-300">
              {step.output}
            </pre>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onRemove(node.id)}
        className="mt-3 w-full rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300 transition-colors hover:bg-red-500/20"
      >
        Remove node
      </button>
    </div>
  );
}

export function Sidebar({
  node,
  onUpdateData,
  onRemove,
  onDeselect,
  snapshot,
  connected,
  events,
}: SidebarProps) {
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#0d0d10]">
      <div className="shrink-0 p-4">
        <BudgetMeter snapshot={snapshot} connected={connected} />
      </div>
      <div className="shrink-0 border-t border-white/10 p-4">
        {node ? (
          <Inspector
            node={node}
            onUpdateData={onUpdateData}
            onRemove={onRemove}
            onDeselect={onDeselect}
          />
        ) : (
          <div className="text-[11px] text-neutral-600">
            Select a node on the canvas to inspect it.
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 border-t border-white/10">
        <ActivityFeed events={events} />
      </div>
    </aside>
  );
}
