import type { SVGProps } from 'react';

/** The pull brand mark — an upward chevron ("pull yourself back up"). */
export function BrandMark({ color = 'var(--brass)', ...props }: SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      <path d="M20 76 L50 32 L80 76" fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const stroke = (props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...props,
});

export const Globe = (p: SVGProps<SVGSVGElement>) => (
  <svg {...stroke({ width: 15, height: 15, ...p })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
);

export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...stroke({ width: 16, height: 16, ...p })}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Menu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...stroke({ ...p })}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const Close = (p: SVGProps<SVGSVGElement>) => (
  <svg {...stroke({ ...p })}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ShieldCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...stroke({ width: 20, height: 20, ...p })}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/** Feature icons, indexed to match home.features.items order. */
export const featureIcons = [
  // 0 · the pause (clock)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  // 1 · wind-down (moon)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
  // 2 · the circle (users)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  ),
  // 3 · focus room (timer)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <path d="M10 2h4" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l2 2" />
    </svg>
  ),
  // 4 · insights (chart)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <path d="M3 3v18h18" />
      <path d="m7 14 3-4 3 3 4-6" />
    </svg>
  ),
  // 5 · pacers (sparkle)
  (p: SVGProps<SVGSVGElement>) => (
    <svg {...stroke(p)}>
      <path d="M12 3v18M3 12h18M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
    </svg>
  ),
];
