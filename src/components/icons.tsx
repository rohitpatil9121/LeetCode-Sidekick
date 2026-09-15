import type { SVGProps } from "react";

const p = (props: SVGProps<SVGSVGElement>) => ({
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Minus = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M3.5 8h9" />
  </svg>
);
export const Expand = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M3 10v3h3M13 6V3h-3M13 3l-4 4M3 13l4-4" />
  </svg>
);
export const X = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const Gear = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" />
  </svg>
);
export const ArrowRight = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
export const ArrowLeft = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </svg>
);
export const Check = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M3 8.5l3 3 7-7" />
  </svg>
);
export const Play = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M5 3.5v9l7-4.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const Pause = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M5 3.5v9M11 3.5v9" strokeWidth={2} />
  </svg>
);
export const Rotate = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M13 8a5 5 0 1 1-1.5-3.6" />
    <path d="M13 3v3h-3" />
  </svg>
);
export const Lock = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);
export const Bug = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M6 5.5a2 2 0 0 1 4 0v1H6z" />
    <rect x="4.5" y="6.5" width="7" height="6" rx="3" />
    <path d="M2.5 9h2M11.5 9h2M3.5 12.5l1.5-1M12.5 12.5l-1.5-1M3.5 5.5l1.5 1M12.5 5.5l-1.5 1" />
  </svg>
);
export const Spark = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)}>
    <path d="M8 2l1.4 3.6L13 7l-3.6 1.4L8 12l-1.4-3.6L3 7l3.6-1.4z" />
  </svg>
);
export const Grip = (props: SVGProps<SVGSVGElement>) => (
  <svg {...p(props)} width={10} height={10}>
    <path d="M2 14L14 2M8 14l6-6" />
  </svg>
);
