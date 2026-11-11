"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./motion.module.css";

/**
 * Reveal - scroll-triggered reveals, one shot per element.
 *
 * Variants:
 *  - "fade-up": the whole block rises into place.
 *  - "mask":    the block is unclipped top to bottom.
 *  - "word":    children must be a plain string; words rise one by one.
 *
 * SSR-safe: content is fully visible on first paint. The hidden-start state
 * is only armed after mount, only when motion is allowed, and only when
 * IntersectionObserver exists - otherwise everything stays visible.
 * Reduced motion renders statically (see motion.module.css).
 */
type Props = {
  children: React.ReactNode;
  /** Delay before the reveal starts once in view, ms. Default 0. */
  delay?: number;
  variant?: "fade-up" | "mask" | "word";
  /** Word stagger for variant="word", ms. Default 55. */
  wordStaggerMs?: number;
  className?: string;
};

export default function Reveal({
  children,
  delay = 0,
  variant = "fade-up",
  wordStaggerMs = 55,
  className,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!("IntersectionObserver" in window)) return;
    const t = window.setTimeout(() => setArmed(true), 0);
    let seen = false;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && !seen) {
          seen = true;
          io.disconnect();
        }
        setInView((prev) => prev || hit);
      },
      { threshold: variant === "word" ? 0.35 : 0.25 },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [reduced, variant]);

  const inClass = inView ? styles.inView : "";
  const armedAttr = armed ? "true" : "false";

  if (variant === "word") {
    const words = String(children).split(" ");
    return (
      <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
        {words.map((w, i) => (
          <span
            key={i}
            className={`${styles.word} ${inClass}`}
            data-armed={armedAttr}
            style={
              { "--motion-delay": `${delay + i * wordStaggerMs}ms` } as React.CSSProperties
            }
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div
      ref={ref}
      className={`${variant === "mask" ? styles.mask : styles.fadeUp} ${inClass}${
        className ? ` ${className}` : ""
      }`}
      data-armed={armedAttr}
      style={{ "--motion-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
