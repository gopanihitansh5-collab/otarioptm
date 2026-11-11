"use client";

import { useEffect, useRef } from "react";
import type { NodeRunStatus, StepResult } from "@/lib/types";

type RunBadgeProps = {
  status: NodeRunStatus;
  step: StepResult | null;
};

/**
 * Small mono run badge pinned to the top-right of a node card. Shows the
 * node's real cost from the latest run ("$0.0000 · DEMO" in demo mode) or a
 * red BLOCKED / FAILED chip. Fades in over 200ms; reduced-motion renders it
 * instantly (global prefers-reduced-motion rule collapses the transition).
 */
export function RunBadge({ status, step }: RunBadgeProps) {
  const badgeRef = useRef<HTMLSpanElement | null>(null);

  const visible = status === "done" || status === "error";
  useEffect(() => {
    if (!visible) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (badgeRef.current) badgeRef.current.style.opacity = "1";
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [visible]);

  if (!visible) return null;

  const blocked = step?.blocked === true;
  const failed = status === "error" && !blocked;
  const cost = step?.cost ?? 0;
  const demo = step?.demo === true;

  return (
    <span
      title={step?.costSource === "catalog-zero" ? "Catalog $0; actual wallet charge unverified" : undefined}
      ref={badgeRef}
      style={{ opacity: 0 }}
      className={`absolute -top-2.5 right-2 rounded border px-1 py-0.5 font-mono text-[9px] tracking-widest transition-opacity duration-200 ${
        blocked || failed
          ? "border-fail/50 bg-obsidian text-fail"
          : demo
            ? "border-steel bg-obsidian text-silver"
            : "border-steel bg-obsidian text-lime"
      }`}
    >
      {blocked ? "BLOCKED" : failed ? "FAILED" : `${step?.costSource === "catalog-zero" ? "CATALOG $0*" : `$${cost.toFixed(4)}`}${demo ? " · DEMO" : ""}`}
    </span>
  );
}
