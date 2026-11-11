"use client";

import { useState } from "react";
import { NODE_LABELS, type NodeType } from "@/lib/types";
import { FOCUS_RING } from "@/components/studio/ui";
import { TYPE_DOT } from "@/components/nodes/theme";

type PaletteProps = {
  addNode: (type: NodeType) => string;
  codeExecAvailable: boolean;
};
const ITEMS: { type: NodeType; desc: string; group: string; icon: string }[] = [
  { type: "chat", desc: "Prompt a model through automatic routing", group: "Intelligence", icon: "M" },
  { type: "web-search", desc: "Bring live web context into your workflow", group: "Intelligence", icon: "S" },
  { type: "code-exec", desc: "Run Python in an isolated microVM", group: "Control", icon: "</>" },
  { type: "guardrails", desc: "Check content against banned terms", group: "Control", icon: "G" },
];

export function Palette({ addNode, codeExecAvailable }: PaletteProps) {
  const [query, setQuery] = useState("");
  const filtered = ITEMS.filter(item => `${NODE_LABELS[item.type]} ${item.desc}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-steel bg-elevated/90">
      <header className="px-4 pb-3 pt-5">
        <p className="mono-label">Build your flow</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-ice">Node library</h2>
        <label className="mt-4 block">
          <span className="sr-only">Find a node</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a node..." className={`h-10 w-full rounded-xl border border-steel-dim bg-obsidian px-3 text-xs text-ice placeholder:text-silver ${FOCUS_RING}`} />
        </label>
      </header>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {["Intelligence", "Control"].map(group => {
          const items = filtered.filter(item => item.group === group);
          if (!items.length) return null;
          return <section key={group} className="mb-5">
            <h3 className="mb-2 flex justify-between px-1 font-mono text-[9px] uppercase tracking-[0.16em] text-silver"><span>{group}</span><span>{items.length}</span></h3>
            <div className="space-y-2">
              {items.map(item => {
                const unavailable = item.type === "code-exec" && !codeExecAvailable;
                return <button key={item.type} type="button" aria-label={`Add ${NODE_LABELS[item.type]}`} onClick={() => addNode(item.type)} disabled={unavailable} title={unavailable ? "Code execution is unavailable in this deployment" : undefined} className={`group w-full rounded-xl border border-steel-dim bg-obsidian/80 p-3 text-left transition-colors hover:border-lime/50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-steel-dim bg-elevated font-mono text-[10px] text-lime">{item.icon}</span>
                    <span className="flex-1 text-xs font-medium text-ice">{NODE_LABELS[item.type]}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[item.type]}`} />
                    <span className="text-silver group-hover:text-lime" aria-hidden>+</span>
                  </span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-silver">{unavailable ? "Unavailable in this deployment" : item.desc}</span>
                </button>;
              })}
            </div>
          </section>;
        })}
        {!filtered.length && <p className="px-1 text-xs text-silver">No nodes match your search.</p>}
      </div>
      <footer className="border-t border-steel-dim p-4 font-mono text-[9px] leading-relaxed tracking-wide text-silver">Click a node to add it<br />Ctrl+Z Undo · Delete Remove</footer>
    </aside>
  );
}
