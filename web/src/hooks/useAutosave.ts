"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved";

/**
 * Debounced localStorage autosave controller with an explicit status so the
 * UI can show a Saved/Saving chip. Coalesces bursts of changes into a single
 * write (the timer restarts on every change) and adopts the loaded value on
 * hydration without rewriting it.
 */
export function useAutosave(
  key: string,
  value: string,
  enabled: boolean,
  options?: { debounceMs?: number },
): { status: AutosaveStatus; saveNow: () => void } {
  const debounceMs = options?.debounceMs ?? 300;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const valueRef = useRef(value);
  const lastSavedRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const write = useCallback(
    (raw: string) => {
      try {
        window.localStorage.setItem(key, raw);
        lastSavedRef.current = raw;
        setStatus("saved");
      } catch {
        /* quota exceeded or storage unavailable — keep the last saved value */
      }
    },
    [key],
  );

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === null) {
      lastSavedRef.current = value;
      return;
    }
    if (value === lastSavedRef.current) return;
    setStatus("saving");
    const raw = value;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      write(raw);
    }, debounceMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, enabled, debounceMs, write]);

  const saveNow = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (valueRef.current === lastSavedRef.current && status === "saved") return;
    write(valueRef.current);
  }, [enabled, write, status]);

  return { status, saveNow };
}
