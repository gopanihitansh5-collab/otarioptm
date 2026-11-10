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

const ACCENT = "#34d399";

const STATUS_CHIPS: Record<NodeRunStatus, string> = {
  idle: "border-white/10 bg-neutral-800 text-neutral-400",
  running: "animate-pulse border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  skipped: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const FIELD =
  "nodrag nowheel w-full rounded-md border border-white/10 bg-neutral-950/80 px-2 py-1.5 text-[10px] font-mono text-neutral-200 outline-none focus:border-emerald-500/60";

export function NodeCodeExec(props: any) {
  const { id, data } = props as { id: string; data: WorkflowNodeData };
  const type: NodeType = (props.type as NodeType) ?? "code-exec";
  const onPatch = useNodePatch();

  const status: NodeRunStatus = data.status ?? "idle";
  const step = (data.statusInfo ?? null) as StepResult | null;
  const title = data.label || NODE_LABELS[type] || "Code Exec";

  return (
    <div className="w-56 rounded-xl border border-[#E8B44A] bg-[#171D22] p-3">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: ACCENT, width: 10, height: 10, borderColor: "#18181b" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: ACCENT, width: 10, height: 10, borderColor: "#18181b" }}
      />

      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500/90 text-[9px] font-bold text-white">
          C
        </span>
        <span className="flex-1 truncate text-xs font-medium text-neutral-100">{title}</span>
        <span
          className={`rounded border px-1 py-0.5 text-[9px] uppercase tracking-wide ${STATUS_CHIPS[status]}`}
        >
          {status}
        </span>
      </div>

      <textarea
        className={`${FIELD} mt-2`}
        rows={3}
        placeholder="// python code..."
        spellCheck={false}
        value={data.code ?? ""}
        onChange={(e) => onPatch(id, { code: e.target.value })}
      />

      {step && (status === "done" || status === "error") && (
        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-1.5 text-[10px] text-neutral-400">
          {step.demo && (
            <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[9px] text-sky-300">demo</span>
          )}
          <div className="font-mono text-neutral-500">
            {step.tokens ?? 0} tok · ${(step.cost ?? 0).toFixed(4)} · {step.latencyMs ?? 0} ms
          </div>
          {step.output && (
            <div className="text-neutral-300">
              {step.output.length > 80 ? `${step.output.slice(0, 80)}...` : step.output}
            </div>
          )}
          {step.error && (
            <div className="truncate text-red-300" title={step.error}>
              {step.error}
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
