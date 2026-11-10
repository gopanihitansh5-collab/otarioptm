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
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
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
    return () => io.disconnect();
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

export function CountUp({
  value,
  format,
  className = "",
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || started.current) return;
      started.current = true;
      io.disconnect();
      const t0 = performance.now();
      const dur = 900;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(value * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {format
        ? format(display)
        : display.toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </span>
  );
}

type BudgetSnapshot = {
  cap: number;
  spent: number;
  reserved: number;
  committed: number;
  remaining: number;
};

type ActivityEvent = {
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
};

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

export function useLiveGuard(pollMs = 15000): LiveState {
  const [state, setState] = useState<LiveState>({ status: "idle", events: [] });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const pull = async () => {
      try {
        const [budgetRes, activityRes] = await Promise.all([
          fetch(`${GATEWAY_URL}/api/v1/budget`, { cache: "no-store" }),
          fetch(`${GATEWAY_URL}/api/v1/activity`, { cache: "no-store" }),
        ]);
        if (!budgetRes.ok || !activityRes.ok) throw new Error("gateway");
        const budget = (await budgetRes.json()) as BudgetSnapshot;
        const body = (await activityRes.json()) as { events?: ActivityEvent[] };
        if (cancelled) return;
        setState({
          status: "live",
          budget,
          events: (body.events ?? []).slice(-6).reverse(),
        });
      } catch {
        if (!cancelled) {
          setState((s) => (s.budget ? s : { status: "offline", events: [] }));
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
