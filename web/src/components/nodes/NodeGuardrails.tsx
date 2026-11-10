"use client";

import { Handle, Position } from "@xyflow/react";
import {
  NODE_LABELS,
  type NodeRunStatus,
  type NodeType,
  type StepResult,
  type WorkflowNodeData,
} from "@/lib/types";
import { useNodePatch } from "@/components/nodeDataPatch";

const ACCENT = "#fbbf24";

const STATUS_CHIPS: Record<NodeRunStatus, string> = {
  idle: "border-white/10 bg-neutral-800 text-neutral-400",
  running: "animate-pulse border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  skipped: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const FIELD =
  "nodrag w-full rounded-md border border-white/10 bg-neutral-950/80 px-2 py-1.5 text-[11px] text-neutral-200 outline-none focus:border-amber-500/60";

export function NodeGuardrails(props: any) {
  const { id, data } = props as { id: string; data: WorkflowNodeData };
  const type: NodeType = (props.type as NodeType) ?? "guardrails";
  const onPatch = useNodePatch();

  const status: NodeRunStatus = data.status ?? "idle";
  const step = (data.statusInfo ?? null) as StepResult | null;
  const blocked = step?.blocked === true;
  const title = data.label || NODE_LABELS[type] || "Guardrails";

  return (
    <div
      className={`w-56 rounded-xl border ${
        blocked ? "border-[#E05353]" : "border-[#C6F36B]"
      } bg-[#171D22] p-3`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: blocked ? "#ef4444" : ACCENT, width: 10, height: 10, borderColor: "#18181b" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: blocked ? "#ef4444" : ACCENT, width: 10, height: 10, borderColor: "#18181b" }}
      />

      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/90 text-[9px] font-bold text-black">
          G
        </span>
        <span className="flex-1 truncate text-xs font-medium text-neutral-100">{title}</span>
        <span
          className={`rounded border px-1 py-0.5 text-[9px] uppercase tracking-wide ${STATUS_CHIPS[status]}`}
        >
          {status}
        </span>
      </div>

      <input
        className={`${FIELD} mt-2`}
        placeholder="banned, terms, comma sep"
        value={Array.isArray(data.banned) ? data.banned.join(", ") : ""}
        onChange={(e) =>
          onPatch(id, {
            banned: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />

      <label className="nodrag mt-1.5 flex items-center gap-2 text-[10px] text-neutral-400">
        <input
          type="checkbox"
          checked={data.stop_on_block ?? false}
          onChange={(e) => onPatch(id, { stop_on_block: e.target.checked })}
          className="h-3 w-3 accent-amber-500"
        />
        Stop on block
      </label>

      {blocked && step?.violations && step.violations.length > 0 && (
        <div className="mt-2 space-y-0.5 border-t border-red-500/30 pt-1.5">
          <div className="text-[9px] uppercase tracking-widest text-red-400">Violations</div>
          {step.violations.map((v, i) => (
            <div key={i} className="truncate text-[10px] text-red-300">
              · {v.rule}
            </div>
          ))}
        </div>
      )}

      {step && (status === "done" || status === "error") && (
        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-1.5 text-[10px] text-neutral-400">
          <div className="font-mono text-neutral-500">
            {step.latencyMs ?? 0} ms{step.tokens != null ? ` · ${step.tokens} tok` : ""}
            {step.cost != null ? ` · $${step.cost.toFixed(4)}` : ""}
          </div>
          {step.output && (
            <div className="text-neutral-300">
              {step.output.length > 80 ? `${step.output.slice(0, 80)}...` : step.output}
            </div>
          )}
          <div className="text-[8px] uppercase tracking-widest text-neutral-700">
            showing latest run
          </div>
        </div>
      )}
    </div>
  );
}
