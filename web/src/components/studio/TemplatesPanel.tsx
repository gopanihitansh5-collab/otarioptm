"use client";

import { Drawer } from "./Drawer";
import { CLOSE_BTN, FOCUS_RING } from "./ui";
import type { WorkflowTemplate } from "@/lib/workflow/templates";

type TemplatesPanelProps = {
  open: boolean;
  onClose: () => void;
  templates: WorkflowTemplate[] | null;
  source: "gateway" | "local" | null;
  canvasEmpty: boolean;
  /** Live from /api/v1/health: whether the code-exec node executes. */
  codeExecAvailable: boolean;
  onLoad: (template: WorkflowTemplate) => void;
  onLoadAndRun: (template: WorkflowTemplate) => void;
};

export function TemplatesPanel({
  open,
  onClose,
  templates,
  source,
  canvasEmpty,
  codeExecAvailable,
  onLoad,
  onLoadAndRun,
}: TemplatesPanelProps) {
  return (
    <Drawer open={open} onClose={onClose} side="left" label="Workflow templates" panelId="templates-panel">
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-steel px-4 pb-3 pt-4">
          <div className="min-w-0">
            <div className="mono-label">Templates</div>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-silver">
              {templates === null
                ? "loading…"
                : source === "gateway"
                  ? "GET /api/v1/templates"
                  : "local starter set"}
            </p>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close templates panel"
            className={CLOSE_BTN}
          >
            ×
          </button>
        </header>
        <div className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
          {templates === null ? (
            <p className="px-1 pt-2 text-xs text-silver">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="px-1 pt-2 text-xs text-silver">No templates available yet.</p>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                canvasEmpty={canvasEmpty}
                codeExecAvailable={codeExecAvailable}
                onLoad={onLoad}
                onLoadAndRun={onLoadAndRun}
              />
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}

function TemplateCard({
  template,
  canvasEmpty,
  codeExecAvailable,
  onLoad,
  onLoadAndRun,
}: {
  template: WorkflowTemplate;
  canvasEmpty: boolean;
  codeExecAvailable: boolean;
  onLoad: (template: WorkflowTemplate) => void;
  onLoadAndRun: (template: WorkflowTemplate) => void;
}) {
  const confirmReplace = () =>
    canvasEmpty ||
    window.confirm(`Replace the current canvas with "${template.name}"?`);
  const usesCodeExec = template.graph.nodes.some((n) => n.type === "code-exec");
  const codeExecBlocked = usesCodeExec && !codeExecAvailable;

  return (
    <article className="rounded-lg border border-steel bg-elevated p-3">
      <h3 className="text-sm font-semibold text-ice">{template.name}</h3>
      <p className="mt-1 text-xs leading-snug text-silver">{template.description}</p>
      <div className="mt-2 font-mono text-[10px] tracking-wider text-silver">
        {template.graph.nodes.length} nodes · {template.graph.edges.length} edges
      </div>
      {codeExecBlocked && (
        <p className="mt-2 font-mono text-[9px] leading-snug tracking-wide text-amber">
          Contains a code-exec step: unavailable in this deployment, that step
          will fail with an explicit error.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (confirmReplace()) {
              onLoad(template);
            }
          }}
          className={`flex h-11 items-center justify-center rounded-lg border border-steel text-xs font-medium text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`}
        >
          Load template
        </button>
        <button
          type="button"
          onClick={() => {
            if (!codeExecBlocked && confirmReplace()) {
              onLoadAndRun(template);
            }
          }}
          disabled={codeExecBlocked}
          title={codeExecBlocked ? "Contains a code-exec step that is unavailable in this deployment" : undefined}
          aria-label={`Load ${template.name} and run it immediately`}
          className={`flex h-11 items-center justify-center rounded-lg border border-steel text-xs font-medium text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-steel disabled:hover:text-silver ${FOCUS_RING}`}
        >
          Load and run
        </button>
      </div>
    </article>
  );
}
