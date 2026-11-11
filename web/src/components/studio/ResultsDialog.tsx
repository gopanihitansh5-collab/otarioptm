"use client";

import { stepFailed } from "@/lib/stepStatus";
import { costLabel } from "@/lib/costLabel";
import { useRef } from "react";
import type { PlanResponse } from "@/lib/api";
import type { StepResult, WorkflowEdge } from "@/lib/types";
import { useFocusTrap } from "./useFocusTrap";
import { CLOSE_BTN, SECONDARY_BTN } from "./ui";

export type RunDeliverable = {
  steps: StepResult[];
  edges: WorkflowEdge[];
  completedAt: string;
  aborted?: string | null;
  task?: string;
  planner?: PlanResponse["planner"];
  stages?: PlanResponse["stages"];
  partial?: boolean;
  failedNodes?: string[];
  reportStatus?: string;
  unverifiedNodes?: string[];
  computedData?: Record<string, string>;
  computedJson?: Record<string, unknown>;
  sources?: string[];
};

function reportMarkdown(run: RunDeliverable): string {
  const incomplete = Boolean(run.reportStatus === "incomplete" || run.unverifiedNodes?.length || run.partial || run.failedNodes?.length || run.aborted || run.steps.some(stepFailed) || run.steps.length === 0);
  const demo = run.steps.some(s => s.demo);
  const sections = ["# OtariOptm run report", `Recorded: ${run.completedAt}`, `Status: ${incomplete ? "Incomplete or blocked" : "Returned by gateway"}${demo ? " (includes demo output)" : ""}`];
  if (run.failedNodes?.length) sections.push(`Failed or skipped nodes: ${run.failedNodes.join(", ")}`);
  if (run.computedJson) sections.push(`## Structured computed output\n\n${JSON.stringify(run.computedJson, null, 2)}`);
  if (run.computedData) for (const [id, output] of Object.entries(run.computedData)) sections.push(`## Computed data: ${id}\n\nExact successful Python stdout, not model prose:\n\n${output}`);
  if (run.sources?.length) sections.push(`## Search source URLs\n\n${run.sources.join("\n")}\n\nSearch URLs are returned references, not verification of every report claim.`);
  if (run.task) sections.push(`## Task\n\n${run.task}`);
  if (run.planner) sections.push(`## Planning provenance\n\nProvider: ${run.planner.provider} | Route: ${run.planner.chain.join(" -> ")} | Recorded cost: $${run.planner.cost?.toFixed(6) ?? "not reported"} (${run.planner.costSource ?? "not reported"})`);
  if (run.stages) sections.push(`## Planning stages\n\n${JSON.stringify(run.stages, null, 2)}`);
  for (const s of run.steps) {
    sections.push(`## ${s.nodeId} (${s.type ?? "step"})`, `Provider/model: ${s.model ?? s.provider ?? "not reported"}\n\nRoute: ${s.chain?.join(" -> ") || "not reported"}\n\nRecorded cost: ${costLabel(s)}\n\nTokens: ${s.tokens ?? "not reported"} | Latency: ${s.latencyMs === undefined ? "not reported" : `${s.latencyMs} ms`}`);
    if (s.consistency) sections.push(`Numeric citation check: ${s.consistency.status}. ${s.consistency.note || ""} This is not a factual correctness guarantee.`);
    if (s.demo) sections.push("DEMO OUTPUT - not live model inference.");
    if (s.error) sections.push(`Error: ${s.error}`);
    if (s.status === "failed" || s.status === "skipped") sections.push(`Step status: ${s.status}`);
    if (s.blocked) sections.push("This step was blocked.");
    if (s.note) sections.push(`Diagnostic: ${s.note}`);
    sections.push(s.output || "No output was returned for this step.");
  }
  sections.push("## Cost note\n\nAmounts are the gateway's recorded costs, not an independent provider invoice. Estimates and reservations depend on configured prices. The app run budget is separate from provider wallets.");
  return sections.join("\n\n");
}

export function ResultsDialog({ run, open, onClose }: { run: RunDeliverable | null; open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ active: open, containerRef: panelRef, onEscape: onClose });
  if (!open || !run) return null;
  const outgoing = new Set(run.edges.map(e => e.source));
  const terminals = run.steps.filter(s => !outgoing.has(s.nodeId));
  const failed = Boolean(run.reportStatus === "incomplete" || run.unverifiedNodes?.length || run.partial || run.failedNodes?.length || run.aborted || run.steps.some(stepFailed) || run.steps.length === 0);
  const demo = run.steps.some(s => s.demo);
  const download = () => {
    const blob = new Blob([reportMarkdown(run)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otarioptm-report-${run.completedAt.replace(/[:.]/g, "-")}.md`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="results-title" className="flex max-h-[90vh] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl border border-steel bg-graphite shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-steel px-5 py-4">
        <div><p className="mono-label">Actual gateway response</p><h2 id="results-title" className="mt-1 text-xl font-semibold text-ice">Run results</h2></div>
        <div className="flex items-center gap-2"><button type="button" onClick={download} className={SECONDARY_BTN}>Download report</button><button type="button" data-autofocus onClick={onClose} aria-label="Close run results" className={CLOSE_BTN}>×</button></div>
      </header>
      <div className="scroll-thin overflow-y-auto p-5">
        {(failed || demo) && <p role="status" className="mb-5 rounded-xl border border-amber/40 bg-amber/10 p-3 text-sm text-amber">{failed ? "This run is incomplete or contains blocked/failed steps. " : ""}{demo ? "This run includes explicitly labeled demo output, not live model inference." : ""}</p>}
        {run.task && <p className="mb-5 whitespace-pre-wrap text-sm text-silver">{run.task}</p>}
        {run.computedJson && Object.entries(run.computedJson).map(([id, value]) => {
          if (!value || typeof value !== "object") return null;
          const obj = value as { rows?: unknown[]; results?: unknown[]; currency?: unknown };
          const rawRows = Array.isArray(obj.rows) ? obj.rows : Array.isArray(obj.results) ? obj.results : [];
          const rows = rawRows.filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r));
          if (!rows.length) return null;
          const columns = ["model", "input_rate", "output_rate", "volume", "monthly_cost"].filter(k => rows.some(r => k in r));
          if (!columns.length) return null;
          return <section key={id} className="mb-6"><h3 className="mb-2 text-sm font-semibold text-ice">Structured computation: {id}</h3><p className="mb-3 text-xs text-silver">Fields from actual parsed Python output. Currency: {typeof obj.currency === "string" ? obj.currency : "not reported"}. Rate units and source accuracy must be checked against the inputs.</p><div className="overflow-x-auto rounded-xl border border-steel"><table className="w-full text-left text-xs"><thead><tr>{columns.map(c => <th key={c} className="bg-elevated p-3 text-silver">{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-steel">{columns.map(c => <td key={c} className="p-3 text-ice">{typeof r[c] === "string" || typeof r[c] === "number" ? String(r[c]) : "not reported"}</td>)}</tr>)}</tbody></table></div></section>;
        })}
        {run.computedData && Object.keys(run.computedData).length > 0 && <section className="mb-6"><h3 className="mb-2 text-sm font-semibold text-ice">Computed data</h3><p className="mb-3 text-xs text-silver">Exact successful Python output. Model commentary below cannot replace these values. Correct computation does not verify the input data.</p><div className="overflow-x-auto rounded-xl border border-steel"><table className="w-full text-left text-xs"><thead className="bg-elevated text-silver"><tr><th className="p-3">Node</th><th className="p-3">Actual stdout</th></tr></thead><tbody>{Object.entries(run.computedData).map(([id, output]) => <tr key={id} className="border-t border-steel"><th className="p-3 align-top font-medium text-ice">{id}</th><td className="p-3"><pre className="whitespace-pre-wrap break-words font-mono leading-6 text-ice">{output}</pre></td></tr>)}</tbody></table></div></section>}
        {run.sources && run.sources.length > 0 && <section className="mb-6"><h3 className="mb-2 text-sm font-semibold text-ice">Search source URLs</h3><p className="mb-2 text-xs text-silver">Returned references, not verification of every claim.</p><ul className="space-y-2">{run.sources.filter(url => /^https?:\/\//.test(url)).map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-lime underline">{url}</a></li>)}</ul></section>}
        <p className="mb-3 text-xs text-silver">Model output / commentary. Execution completion is not factual verification.</p>
        <div className="space-y-5">
          {terminals.length === 0 && <p className="text-sm text-silver">No terminal-node output was returned. Inspect the trace below.</p>}
          {terminals.map(s => <section key={s.nodeId} className="rounded-xl border border-steel bg-elevated p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-ice">{s.nodeId}</h3><span className="font-mono text-[10px] text-silver">{s.model || s.provider || s.type || "terminal output"}</span>{s.demo && <span className="text-xs text-amber">DEMO</span>}{stepFailed(s) && <span className="text-xs text-fail">{s.status === "skipped" ? "SKIPPED" : "FAILED / BLOCKED"}</span>}</div>
            {s.consistency && <p className="mb-3 rounded-lg border border-amber/40 p-3 text-xs leading-6 text-amber">{s.consistency.status === "mismatch" ? "UNVERIFIED: this output does not match all computed inputs. Do not treat it as a trusted report." : "Numeric citation check only. Numbers cited does not verify the facts, sources, assumptions or recommendation."} {s.consistency.note}</p>}
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-ice">{s.output || s.error || "No output returned."}</pre>
          </section>)}
        </div>
        <h3 className="mb-3 mt-7 text-sm font-semibold text-ice">Execution trace</h3>
        <div className="space-y-2">{run.steps.map(s => <details key={s.nodeId} className="rounded-xl border border-steel-dim bg-obsidian p-3">
          <summary className="cursor-pointer text-xs text-ice"><span className="font-medium">{s.nodeId}</span> · {s.chain?.join(" → ") || s.model || s.type || "step"} · {stepFailed(s) ? "failed / blocked" : s.demo ? "demo" : "response received"}</summary>
          <p className="mt-3 font-mono text-[10px] leading-5 text-silver">Model: {s.model || s.provider || "not reported"} · Cost: {costLabel(s)} · Tokens: {s.tokens ?? "not reported"} · Latency: {s.latencyMs === undefined ? "not reported" : `${s.latencyMs} ms`}</p>
          {s.consistency && <p className="mt-2 text-xs text-amber">Numeric check: {s.consistency.status}. {s.consistency.note} Not a factual correctness guarantee.</p>}
          {s.note && <p className="mt-2 text-xs text-amber">{s.note}</p>}{s.error && <p className="mt-2 text-xs text-fail">{s.error}</p>}
          <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-silver">{s.output || "No output returned."}</pre>
        </details>)}</div>
        <p className="mt-5 text-[11px] leading-5 text-silver">Otari catalog zero prices are not proof of zero wallet charges. Recorded costs are not an independent provider invoice. Source citations, if returned by the workflow, remain in the output above and the downloaded report. Workflow data and node outputs may persist in this browser. Download saves a local Markdown copy.</p>
      </div>
    </div>
  </div>;
}
