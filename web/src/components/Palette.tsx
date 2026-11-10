import { NODE_LABELS, type NodeType } from "@/lib/types";

type PaletteProps = {
  addNode: (type: NodeType) => string;
};

const ITEMS: { type: NodeType; desc: string; dot: string }[] = [
  { type: "chat", desc: "LLM chain step: prompt + system", dot: "bg-indigo-400" },
  { type: "web-search", desc: "Fetch live web context", dot: "bg-sky-400" },
  { type: "code-exec", desc: "Sandboxed code snippet", dot: "bg-emerald-400" },
  { type: "guardrails", desc: "Block banned terms", dot: "bg-amber-400" },
];

export function Palette({ addNode }: PaletteProps) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/10 bg-[#0d0d10]">
      <div className="px-4 pb-2 pt-4 text-[10px] uppercase tracking-widest text-neutral-500">
        Nodes
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {ITEMS.map((item) => (
          <div key={item.type} className="rounded-lg border border-white/10 bg-neutral-900/50 p-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
              <span className="flex-1 truncate text-xs font-medium text-neutral-200">
                {NODE_LABELS[item.type]}
              </span>
              <button
                type="button"
                aria-label={`Add ${NODE_LABELS[item.type]}`}
                onClick={() => addNode(item.type)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/15 bg-neutral-800 text-xs leading-none text-neutral-300 transition-colors hover:border-indigo-500/60 hover:text-white"
              >
                +
              </button>
            </div>
            <div className="mt-1 text-[10px] leading-snug text-neutral-500">{item.desc}</div>
          </div>
        ))}
      </div>
      <footer className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-neutral-600">
        Ctrl+Z Undo · Ctrl+Y Redo · Delete Remove
      </footer>
    </aside>
  );
}
