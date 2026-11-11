import type { SVGProps } from "react";

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

type IconProps = SVGProps<SVGSVGElement>;

export function IconPlus(props: IconProps) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M12 3 4 7l8 4 8-4-8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...ICON_PROPS} {...props}>
      <path d="M7 4.5 19 12 7 19.5v-15Z" />
    </svg>
  );
}
