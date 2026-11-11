"use client";

import { useEffect, useState } from "react";

/**
 * Reports the user's prefers-reduced-motion setting, reactively.
 * SSR-safe: returns false during SSR/first paint so markup is identical on
 * server and client; the real value arrives after mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
