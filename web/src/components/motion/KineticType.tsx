"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./motion.module.css";

/**
 * KineticType - hero typewriter with per-character rise.
 *
 * Every character is rendered at first paint (SSR-safe, zero layout shift);
 * after mount, when motion is allowed, characters dim and reveal
 * progressively. A keyboard-reachable "Skip intro" button finishes the
 * sequence instantly. Total runtime never exceeds maxDurationMs (default
 * 3000ms), and the CTA/page never waits on the animation.
 */
type Props = {
  text: string;
  as?: React.ElementType;
  className?: string;
  /** Characters per second. Default 40; automatically accelerated so the
   * whole string finishes within maxDurationMs. */
  speed?: number;
  /** Delay before the first character reveals, ms. Default 400. */
  startDelay?: number;
  /** Hard cap on the whole sequence, ms. Default 3000. */
  maxDurationMs?: number;
  onComplete?: () => void;
};

export default function KineticType({
  text,
  as: Tag = "span",
  className,
  speed = 40,
  startDelay = 400,
  maxDurationMs = 3000,
  onComplete,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(text.length);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const step = useMemo(() => {
    if (text.length === 0) return 0;
    const natural = 1000 / Math.max(1, speed);
    return Math.max(8, Math.min(natural, maxDurationMs / text.length));
  }, [speed, maxDurationMs, text.length]);

  const finish = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setShown(text.length);
    setPlaying(false);
    onComplete?.();
  }, [text.length, onComplete]);

  useEffect(() => {
    if (reduced || text.length === 0) return;
    let n = 0;
    const tick = () => {
      n += 1;
      setShown(n);
      if (n >= text.length) {
        setPlaying(false);
        onComplete?.();
        return;
      }
      timer.current = window.setTimeout(tick, step);
    };
    const t0 = window.setTimeout(() => {
      setShown(0);
      setPlaying(true);
      timer.current = window.setTimeout(tick, step);
    }, startDelay);
    return () => {
      window.clearTimeout(t0);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
    // text/step/startDelay define the sequence; onComplete is stable enough
    // for a one-shot intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, text, step, startDelay]);

  const animate = !reduced && playing;
  const chars = text.split("");

  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden>
        {chars.map((c, i) => (
          <span
            key={i}
            className={`${styles.char} ${
              animate ? (i < shown ? styles.charShown : styles.charPending) : ""
            }`}
          >
            {c}
          </span>
        ))}
        {animate && <span className={styles.cursor} />}
      </span>
      {animate && (
        <button
          type="button"
          aria-label="Skip intro"
          onClick={finish}
          style={{
            marginLeft: "0.75em",
            fontSize: "0.35em",
            verticalAlign: "middle",
            padding: "0.4em 0.9em",
            border: "1px solid var(--accent, #b8a98f)",
            borderRadius: "999px",
            background: "transparent",
            color: "var(--accent, #b8a98f)",
            cursor: "pointer",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Skip intro
        </button>
      )}
    </Tag>
  );
}
