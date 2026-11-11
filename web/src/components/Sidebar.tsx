import { ActivityFeed } from "@/components/ActivityFeed";
import { BudgetMeter } from "@/components/BudgetMeter";
import { CLOSE_BTN, DANGER_BTN, FOCUS_RING } from "@/components/studio/ui";
import { STATUS_CHIPS, TYPE_DOT } from "@/components/nodes/theme";
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

const TYPE_COLORS: Record<NodeType, string> = TYPE_DOT;

const FIELD = `nodrag w-full rounded-md border border-steel-dim bg-obsidian px-2 py-1.5 text-[11px] text-ice outline-none transition-colors duration-150 placeholder:text-silver focus:border-lime/60 ${FOCUS_RING}`;

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
        <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[type] ?? "bg-silver"}`} />
        <span className="flex-1 truncate text-xs font-medium text-ice">
          {data.label || NODE_LABELS[type] || node.id}
        </span>
        <span
          className={`rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
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
            aria-label="Close inspector"
            className={CLOSE_BTN}
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wide text-silver">{node.id}</div>

      <div className="mt-3 space-y-1.5">
        {type === "chat" && (
          <>
            <textarea
              className={FIELD}
              rows={2}
              aria-label="Chat prompt"
              placeholder="Prompt..."
              value={data.prompt ?? ""}
              onChange={(e) => patch({ prompt: e.target.value })}
            />
            <input
              className={FIELD}
              aria-label="Chat system prompt"
              placeholder="System text..."
              value={data.system ?? ""}
              onChange={(e) => patch({ system: e.target.value })}
            />
          </>
        )}
        {type === "web-search" && (
          <input
            className={FIELD}
            aria-label="Web search query"
            placeholder="Query..."
            value={data.query ?? ""}
            onChange={(e) => patch({ query: e.target.value })}
          />
        )}
        {type === "code-exec" && (
          <textarea
            className={`${FIELD} font-mono text-[10px]`}
            rows={3}
            aria-label="Python code"
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
              aria-label="Banned terms"
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
            <label className="flex min-h-[44px] items-center gap-2 text-[10px] text-silver">
              <input
                type="checkbox"
                checked={data.stop_on_block ?? false}
                onChange={(e) => patch({ stop_on_block: e.target.checked })}
                className={`h-4 w-4 accent-amber ${FOCUS_RING}`}
              />
              Stop on block
            </label>
          </>
        )}
      </div>

      {step && (
        <div className="mt-3 rounded-lg border border-steel-dim bg-obsidian p-2.5 text-[10px] text-silver">
          <div className="flex items-center gap-1.5">
            {step.blocked && (
              <span className="rounded border border-fail/40 bg-obsidian px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest text-fail">
                blocked
              </span>
            )}
            {step.demo && (
              <span className="rounded border border-steel bg-elevated px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest text-silver">
                demo
              </span>
            )}
            {step.error && <span className="truncate text-fail">{step.error}</span>}
          </div>
          {step.model && (
            <div className="mt-1.5">
              <span className="text-silver">model</span>{" "}
              <span className="text-ice">{step.model}</span>
            </div>
          )}
          {step.routing && (
            <div>
              <span className="text-silver">routing</span>{" "}
              <span className="text-ice">{step.routing}</span>
            </div>
          )}
          {step.chain && step.chain.length > 0 && (
            <div
              className="mt-1.5 truncate font-mono text-ice"
              title={step.chain.join(" -> ")}
            >
              {step.chain.join(" -> ")}
            </div>
          )}
          <div className="mt-1.5 flex gap-3 font-mono text-ice">
            <span>{step.tokens ?? 0} tok</span>
            <span>${(step.cost ?? 0).toFixed(4)}</span>
            <span>{step.latencyMs ?? 0} ms</span>
          </div>
          {step.violations && step.violations.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {step.violations.map((v, i) => (
                <span key={i} className="rounded bg-fail/10 px-1 py-0.5 text-fail">
                  {v.rule}
                </span>
              ))}
            </div>
          )}
          {step.output && (
            <pre className="scroll-thin mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-graphite p-1.5 font-mono text-[10px] leading-relaxed text-silver">
              {step.output}
            </pre>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onRemove(node.id)}
        className={`mt-3 w-full ${DANGER_BTN}`}
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
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-steel bg-elevated">
      <div className="shrink-0 p-4">
        <BudgetMeter snapshot={snapshot} connected={connected} />
      </div>
      <div className="shrink-0 border-t border-steel-dim p-4">
        {node ? (
          <Inspector
            node={node}
            onUpdateData={onUpdateData}
            onRemove={onRemove}
            onDeselect={onDeselect}
          />
        ) : (
          <div className="text-[11px] text-silver">
            Select a node on the canvas to inspect it.
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 border-t border-steel-dim">
        <ActivityFeed events={events} />
      </div>
    </aside>
  );
}
