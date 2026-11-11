export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/50";

export const SECONDARY_BTN = `inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-steel px-3 text-xs text-silver transition-colors duration-150 hover:border-lime/40 hover:text-lime active:scale-[0.98] ${FOCUS_RING}`;

export const DANGER_BTN = `inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-fail/40 px-3 text-xs text-fail transition-colors duration-150 hover:bg-fail/10 active:scale-[0.98] ${FOCUS_RING}`;

export const CLOSE_BTN = `flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base text-silver transition-colors duration-150 hover:bg-elevated hover:text-ice ${FOCUS_RING}`;
