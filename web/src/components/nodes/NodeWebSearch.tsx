"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  NODE_LABELS,
  type NodeRunStatus,
  type NodeType,
  type StepResult,
  type WorkflowNodeData,
} from "@/lib/types";
import { useNodePatch } from "@/components/nodeDataPatch";
import { RunBadge } from "@/components/nodes/RunBadge";
import {
  BADGE,
  CARD,
  FIELD_PLAIN,
  NODE_ACCENT,
  RESULT_PANEL,
  STATUS_CHIPS,
  STATUS_DOT,
  TYPE_RULE,
  handleStyle,
} from "@/components/nodes/theme";

export function NodeWebSearch(props: NodeProps) {
  const id = props.id;
  const data = props.data as WorkflowNodeData;
  const type: NodeType = (props.type as NodeType) ?? "web-search";
  const onPatch = useNodePatch();

  const status: NodeRunStatus = data.status ?? "idle";
  const step = (data.statusInfo ?? null) as StepResult | null;
  const title = data.label || NODE_LABELS[type] || "Web Search";

  return (
    <div className={`${CARD} border-t-2 border-steel ${TYPE_RULE[type]}`}>
      <RunBadge status={status} step={step} />
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle(NODE_ACCENT)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle(NODE_ACCENT)}
      />

      <div className="flex items-center gap-2">
        <span className={BADGE} role="img" aria-label={NODE_LABELS[type]}>
          <span aria-hidden="true">S</span>
        </span>
        <span className="flex-1 truncate text-xs font-medium text-ice">{title}</span>
        <span
          className={`flex items-center gap-1 rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_CHIPS[status]}`}
        >
          <span
            className={`h-1 w-1 shrink-0 rounded-full ${STATUS_DOT[status]}`}
            aria-hidden="true"
          />
          {status}
        </span>
      </div>

      <input
        className={`${FIELD_PLAIN} mt-2`}
        aria-label="Web search query"
        placeholder="Query..."
        value={data.query ?? ""}
        onChange={(e) => onPatch(id, { query: e.target.value })}
      />

      {step && (status === "done" || status === "error") && (
        <div className={RESULT_PANEL}>
          {step.demo && (
            <span className="inline-block rounded border border-steel bg-elevated px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest text-silver">
              demo
            </span>
          )}
          {step.model && (
            <div>
              <span className="text-silver">model</span>{" "}
              <span className="text-ice">
                {step.model.length > 24 ? `${step.model.slice(0, 24)}...` : step.model}
              </span>
            </div>
          )}
          <div className="font-mono text-silver">
            {step.tokens ?? 0} tok · ${(step.cost ?? 0).toFixed(4)} · {step.latencyMs ?? 0} ms
          </div>
          {step.output && (
            <div className="text-ice">
              {step.output.length > 80 ? `${step.output.slice(0, 80)}...` : step.output}
            </div>
          )}
          {step.error && (
            <div className="truncate text-fail" title={step.error}>
              {step.error}
            </div>
          )}
          <div className="font-mono text-[8px] uppercase tracking-widest text-silver">
            showing latest run
          </div>
        </div>
      )}
    </div>
  );
}
