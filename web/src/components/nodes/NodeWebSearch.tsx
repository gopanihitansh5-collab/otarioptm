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

const ACCENT = "#38bdf8";

const STATUS_CHIPS: Record<NodeRunStatus, string> = {
  idle: "border-white/10 bg-neutral-800 text-neutral-400",
  running: "animate-pulse border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  skipped: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const FIELD =
  "nodrag w-full rounded-md border border-white/10 bg-neutral-950/80 px-2 py-1.5 text-[11px] text-neutral-200 outline-none focus:border-sky-500/60";

export function NodeWebSearch(props: any) {
  const { id, data } = props as { id: string; data: WorkflowNodeData };
  const type: NodeType = (props.type as NodeType) ?? "web-search";
  const onPatch = useNodePatch();

  const status: NodeRunStatus = data.status ?? "idle";
  const step = (data.statusInfo ?? null) as StepResult | null;
  const title = data.label || NODE_LABELS[type] || "Web Search";

  return (
    <div className="w-56 rounded-xl border border-sky-500/60 bg-neutral-900/90 p-3 shadow-xl backdrop-blur">
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
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500/90 text-[9px] font-bold text-white">
          S
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
        placeholder="Query..."
        value={data.query ?? ""}
        onChange={(e) => onPatch(id, { query: e.target.value })}
      />

      {step && (status === "done" || status === "error") && (
        <div className="mt-2 space-y-0.5 border-t border-white/10 pt-1.5 text-[10px] text-neutral-400">
          {step.demo && (
            <span className="rounded bg-sky-500/15 px-1 py-0.5 text-[9px] text-sky-300">demo</span>
          )}
          {step.model && (
            <div>
              <span className="text-neutral-600">model</span>{" "}
              <span className="text-neutral-300">
                {step.model.length > 24 ? `${step.model.slice(0, 24)}...` : step.model}
              </span>
            </div>
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
