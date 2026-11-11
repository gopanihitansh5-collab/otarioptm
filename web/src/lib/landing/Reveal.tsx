"use client";

import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    // Safety: never leave content hidden if the observer misses (capture
    // tooling, odd viewports). Reveal anyway shortly after mount.
    const safety = window.setTimeout(() => setSeen(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [seen]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${seen ? "is-in" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

export function CountUp({ value, format, className = "" }: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  // Financial values are data, not animation frames. Never interpolate them.
  return <span className={className}>{format ? format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
}

type BudgetSnapshot = {
  cap: number;
  spent: number;
  reserved: number;
  committed: number;
  remaining: number;
};

type ActivityEvent = {
  costSource?: string;
  id?: number | string;
  event?: string;
  nodeId?: string;
  model?: string;
  chain?: string;
  cost?: number;
  latencyMs?: number;
};

type LiveState = {
  status: "idle" | "live" | "offline";
  budget?: BudgetSnapshot;
  events: ActivityEvent[];
  /** True when the gateway has a real provider key configured (otari/groq).
   *  False means it answers from the deterministic demo tier. */
  liveProviders?: boolean;
};

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "";

export function useLiveGuard(pollMs = 15000): LiveState {
  const [state, setState] = useState<LiveState>({ status: "idle", events: [] });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const pull = async () => {
      try {
        const [budgetRes, activityRes, healthRes] = await Promise.all([
          fetch(`${GATEWAY_URL}/api/v1/budget`, { cache: "no-store" }),
          fetch(`${GATEWAY_URL}/api/v1/activity`, { cache: "no-store" }),
          fetch(`${GATEWAY_URL}/api/v1/health`, { cache: "no-store" }),
        ]);
        if (!budgetRes.ok || !activityRes.ok || !healthRes.ok)
          throw new Error("gateway");
        const budget = (await budgetRes.json()) as BudgetSnapshot;
        const body = (await activityRes.json()) as { events?: ActivityEvent[] };
        const health = (await healthRes.json()) as {
          otari?: boolean;
          groq?: boolean;
        };
        if (cancelled) return;
        setState({
          status: "live",
          budget,
          events: (body.events ?? []).slice(-6).reverse(),
          liveProviders: Boolean(health.otari || health.groq),
        });
      } catch {
        if (!cancelled) {
          // The gateway is unreachable: keep the last known budget for context,
          // but never keep claiming the feed is live.
          setState((s) =>
            s.budget
              ? { ...s, status: "offline" }
              : { status: "offline", events: [] },
          );
        }
      } finally {
        if (!cancelled) timer = setTimeout(pull, pollMs);
      }
    };

    pull();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollMs]);

  return state;
}

export const GATEWAY_BASE = GATEWAY_URL;
export type { BudgetSnapshot, ActivityEvent };
