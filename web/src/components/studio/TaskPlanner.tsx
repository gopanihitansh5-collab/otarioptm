"use client";

import { useRef, useState } from "react";
import { planWorkflow, type PlanResponse } from "@/lib/api";
import { validateWorkflowInput } from "@/lib/workflow/validate";
import type { WorkflowNode, WorkflowEdge } from "@/lib/types";
import { useFocusTrap } from "./useFocusTrap";
import { CLOSE_BTN, SECONDARY_BTN } from "./ui";

export function TaskPlanner({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (nodes: WorkflowNode[], edges: WorkflowEdge[], task: string, plan: PlanResponse) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lock = useRef(false);
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [plannedTask, setPlannedTask] = useState("");
  useFocusTrap({ active: open, containerRef: ref, onEscape: () => { if (!busy) onClose(); } });
  if (!open) return null;
  const generate = async () => {
    if (lock.current || !task.trim()) return;
    lock.current = true; setBusy(true); setError(null); setPlan(null);
    try {
      const result = await planWorkflow(task.trim());
      const checked = validateWorkflowInput(result.graph);
      if (!checked.ok) throw new Error(checked.errors.join(" "));
      setPlan({ ...result, graph: checked.graph }); setPlannedTask(task.trim());
    } catch (e) { setError(e instanceof Error ? e.message : "Planning failed."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div ref={ref} role="dialog" aria-modal="true" aria-labelledby="planner-title" className="flex max-h-[90vh] w-[min(900px,96vw)] flex-col overflow-hidden rounded-2xl border border-steel bg-graphite shadow-2xl">
    <header className="flex items-center justify-between border-b border-steel px-5 py-4"><div><p className="mono-label">Live model planning</p><h2 id="planner-title" className="mt-1 text-xl font-semibold text-ice">Turn a task into a workflow</h2></div><button disabled={busy} onClick={onClose} aria-label="Close task planner" className={CLOSE_BTN}>×</button></header>
    <div className="scroll-thin overflow-y-auto p-5">
      <p className="mb-4 text-sm leading-6 text-silver">Describe the outcome you need. A real model generates connected nodes, not a preset. The returned provider and planning cost are shown below. Review prompts, search queries and code before running.</p>
      <label htmlFor="planner-task" className="text-xs font-medium text-ice">Your task</label>
      <textarea id="planner-task" data-autofocus maxLength={8000} disabled={busy} value={task} onChange={e => { setTask(e.target.value); setPlan(null); }} rows={4} placeholder="Describe the research, analysis and final report you need..." className="mt-2 w-full resize-y rounded-xl border border-steel bg-obsidian p-3 text-sm leading-6 text-ice outline-none focus:border-lime" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-silver">Planning uses Groq only. Free-tier limits apply; no paid fallback.</p><button disabled={busy || !task.trim()} onClick={generate} className={`${SECONDARY_BTN} disabled:opacity-40`}>{busy ? "Generating plan…" : "Generate plan"}</button></div>
      {error && <p role="alert" className="mt-4 whitespace-pre-wrap rounded-xl border border-fail/40 bg-fail/10 p-3 text-sm text-fail">{error}</p>}
      {plan && <section className="mt-6 space-y-4">
        <div className="rounded-xl border border-lime/30 bg-lime/5 p-4"><h3 className="text-sm font-semibold text-ice">Generated plan · {plan.graph.nodes.length} nodes</h3><p className="mt-2 text-sm leading-6 text-silver">{plan.summary || "Inspect the generated nodes below."}</p><p className="mt-3 font-mono text-[10px] leading-5 text-silver">Answered by {plan.planner.provider} · Route: {plan.planner.chain.join(" → ")} · Recorded planning cost: ${(plan.planner.cost ?? 0).toFixed(6)} ({plan.planner.costSource})</p></div>
        {plan.stages && <div className="space-y-2">{Object.entries(plan.stages).map(([stage, info]) => <p key={stage} className="rounded-xl border border-steel p-3 font-mono text-[10px] leading-5 text-silver">{stage}: {info.provider || "not reported"} · {info.chain?.join(" → ") || "route not reported"} · {info.costSource === "catalog-zero" ? "catalog $0 (actual charge unverified)" : `$${info.cost?.toFixed(6) ?? "not reported"} (${info.costSource || "not reported"})`}</p>)}</div>}
        {plan.warnings.map((w, i) => <p key={i} className="rounded-xl border border-amber/30 p-3 text-xs text-amber">{w}</p>)}
        {plan.graph.nodes.map(n => <details key={n.id} open className="rounded-xl border border-steel bg-obsidian p-4"><summary className="cursor-pointer text-sm font-medium text-ice">{n.data.label || n.id} · {n.type}</summary><pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-silver">{JSON.stringify(n.data, null, 2)}</pre><p className="mt-2 font-mono text-[10px] text-silver">Depends on: {plan.graph.edges.filter(e => e.target === n.id).map(e => e.source).join(", ") || "none"}</p></details>)}
        <p className="text-xs leading-6 text-amber">Applying replaces the current canvas, but does not run it. Exa search uses a separate provider balance outside the app model budget. Confirm your search quota before running search nodes.</p>
        <button className={SECONDARY_BTN} onClick={() => onApply(plan.graph.nodes, plan.graph.edges, plannedTask, plan)}>Apply plan to canvas</button>
      </section>}
    </div>
  </div></div>;
}
