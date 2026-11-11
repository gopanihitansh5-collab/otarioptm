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
  onLoad: (template: WorkflowTemplate) => void;
};

export function TemplatesPanel({
  open,
  onClose,
  templates,
  source,
  canvasEmpty,
  onLoad,
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
                onLoad={onLoad}
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
  onLoad,
}: {
  template: WorkflowTemplate;
  canvasEmpty: boolean;
  onLoad: (template: WorkflowTemplate) => void;
}) {
  return (
    <article className="rounded-lg border border-steel bg-elevated p-3">
      <h3 className="text-sm font-semibold text-ice">{template.name}</h3>
      <p className="mt-1 text-xs leading-snug text-silver">{template.description}</p>
      <div className="mt-2 font-mono text-[10px] tracking-wider text-silver">
        {template.graph.nodes.length} nodes · {template.graph.edges.length} edges
      </div>
      <button
        type="button"
        onClick={() => {
          if (
            canvasEmpty ||
            window.confirm(`Replace the current canvas with "${template.name}"?`)
          ) {
            onLoad(template);
          }
        }}
        className={`mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-steel text-xs font-medium text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`}
      >
        Load template
      </button>
    </article>
  );
}
