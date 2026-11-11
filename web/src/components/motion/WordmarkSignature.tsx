"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./motion.module.css";

/**
 * WordmarkSignature - the OTARIOPTM wordmark as a kinetic signature.
 *
 * Letters sharpen into place one by one (blur-to-focus rise), then a hairline
 * underline draws itself in champagne. Plays once on mount when motion is
 * allowed; fully static and visible otherwise. SSR-safe: everything renders
 * at first paint, the hidden-start state arms only after mount.
 */
type Props = {
  text?: string;
  as?: React.ElementType;
  className?: string;
  /** Letter stagger, ms. Default 70. */
  staggerMs?: number;
  /** Draw the champagne underline after the letters. Default true. */
  underline?: boolean;
};

export default function WordmarkSignature({
  text = "OTARIOPTM",
  as: Tag = "span",
  className,
  staggerMs = 70,
  underline = true,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
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
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [reduced]);

  const inClass = inView ? styles.inView : "";
  const armedAttr = armed ? "true" : "false";
  const letters = text.split("");

  return (
    <Tag
      ref={ref}
      className={className}
      aria-label={text}
      style={{ display: "inline-block" }}
    >
      <span aria-hidden>
        {letters.map((c, i) => (
          <span
            key={i}
            className={`${styles.sigChar} ${inClass}`}
            data-armed={armedAttr}
            style={{ "--motion-delay": `${i * staggerMs}ms` } as React.CSSProperties}
          >
            {c}
          </span>
        ))}
        {underline && (
          <span
            className={`${styles.sigUnderline} ${inClass}`}
            data-armed={armedAttr}
            style={
              {
                "--motion-delay": `${letters.length * staggerMs + 120}ms`,
              } as React.CSSProperties
            }
          />
        )}
      </span>
    </Tag>
  );
}
