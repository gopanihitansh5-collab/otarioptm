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
import { FOCUS_RING } from "@/components/studio/ui";
import {
  BADGE,
  CARD,
  FIELD_PLAIN,
  NODE_ACCENT,
  NODE_FAIL,
  RESULT_PANEL,
  STATUS_CHIPS,
  STATUS_DOT,
  TYPE_RULE,
  handleStyle,
} from "@/components/nodes/theme";

export function NodeGuardrails(props: NodeProps) {
  const id = props.id;
  const data = props.data as WorkflowNodeData;
  const type: NodeType = (props.type as NodeType) ?? "guardrails";
  const onPatch = useNodePatch();

  const status: NodeRunStatus = data.status ?? "idle";
  const step = (data.statusInfo ?? null) as StepResult | null;
  const blocked = step?.blocked === true;
  const title = data.label || NODE_LABELS[type] || "Guardrails";

  return (
    <div
      className={`${CARD} border-t-2 ${
        blocked ? "border-fail" : `border-steel ${TYPE_RULE[type]}`
      }`}
    >
      <RunBadge status={status} step={step} />
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle(blocked ? NODE_FAIL : NODE_ACCENT)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle(blocked ? NODE_FAIL : NODE_ACCENT)}
      />

      <div className="flex items-center gap-2">
        <span className={BADGE} role="img" aria-label={NODE_LABELS[type]}>
          <span aria-hidden="true">G</span>
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
        aria-label="Banned terms"
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

      <label className="nodrag mt-1.5 flex min-h-[44px] items-center gap-2 text-[10px] text-silver">
        <input
          type="checkbox"
          checked={data.stop_on_block ?? false}
          onChange={(e) => onPatch(id, { stop_on_block: e.target.checked })}
          className={`h-4 w-4 accent-amber ${FOCUS_RING}`}
        />
        Stop on block
      </label>

      {blocked && step?.violations && step.violations.length > 0 && (
        <div className="mt-2 space-y-1 rounded-lg border border-fail/30 bg-obsidian p-2">
          <div className="font-mono text-[9px] uppercase tracking-widest text-fail">
            violations
          </div>
          {step.violations.map((v, i) => (
            <div key={i} className="truncate text-[10px] text-fail" title={v.rule}>
              · {v.rule}
            </div>
          ))}
        </div>
      )}

      {step && (status === "done" || status === "error") && (
        <div className={RESULT_PANEL}>
          <div className="font-mono text-silver">
            {step.latencyMs ?? 0} ms{step.tokens != null ? ` · ${step.tokens} tok` : ""}
            {step.cost != null ? ` · $${step.cost.toFixed(4)}` : ""}
          </div>
          {step.output && (
            <div className="text-ice">
              {step.output.length > 80 ? `${step.output.slice(0, 80)}...` : step.output}
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
