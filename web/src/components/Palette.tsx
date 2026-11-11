import { NODE_LABELS, type NodeType } from "@/lib/types";
import { FOCUS_RING } from "@/components/studio/ui";

type PaletteProps = {
  addNode: (type: NodeType) => string;
};

const ITEMS: { type: NodeType; desc: string; dot: string }[] = [
  { type: "chat", desc: "LLM chain step: prompt + system", dot: "bg-lime" },
  { type: "web-search", desc: "Fetch live web context", dot: "bg-signal" },
  { type: "code-exec", desc: "Sandboxed code snippet", dot: "bg-silver" },
  { type: "guardrails", desc: "Block banned terms", dot: "bg-amber" },
];

const ADD_BTN = `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-steel text-base leading-none text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`;

export function Palette({ addNode }: PaletteProps) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-steel bg-elevated">
      <div className="mono-label px-4 pb-2 pt-4">Nodes</div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {ITEMS.map((item) => (
          <div key={item.type} className="rounded-lg border border-steel-dim bg-obsidian p-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
              <span className="flex-1 truncate text-xs font-medium text-ice">
                {NODE_LABELS[item.type]}
              </span>
              <button
                type="button"
                aria-label={`Add ${NODE_LABELS[item.type]}`}
                onClick={() => addNode(item.type)}
                className={ADD_BTN}
              >
                +
              </button>
            </div>
            <div className="mt-1 text-[10px] leading-snug text-silver">{item.desc}</div>
          </div>
        ))}
      </div>
      <footer className="border-t border-steel-dim p-3 font-mono text-[10px] leading-relaxed tracking-wide text-silver">
        Ctrl+Z Undo · Ctrl+Y Redo · Delete Remove
      </footer>
    </aside>
  );
}
