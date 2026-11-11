"use client";

import { FOCUS_RING } from "./ui";

/**
 * Honest notice strip used for recoverable problems (a saved draft that could
 * not be read, storage that is unavailable). It never claims a successful
 * outcome that did not happen.
 */
export function NoticeBar({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex min-h-11 shrink-0 items-center gap-2 border-b border-amber/40 bg-amber/10 px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <span className="min-w-0 flex-1 text-xs leading-relaxed text-amber">
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notice"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-amber transition-colors duration-150 hover:bg-amber/20 ${FOCUS_RING}`}
      >
        ×
      </button>
    </div>
  );
}
