"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      );
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("otari-theme", next);
    } catch {
      /* private mode */
    }
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className={
        className ??
        "h-11 rounded-lg border border-[var(--color-steel)] px-3 font-mono text-[10px] tracking-[0.15em] text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-ice)]"
      }
    >
      {theme === "light" ? "DARK" : "LIGHT"}
    </button>
  );
}
