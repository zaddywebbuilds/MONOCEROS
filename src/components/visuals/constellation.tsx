import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The Monoceros constellation, drawn from the real thing.
 *
 * The flat scatter of dots this replaces was decorative and arbitrary. These are
 * the seven named stars of Monoceros, projected from their approximate right
 * ascension and declination, sized by apparent magnitude — Beta is genuinely the
 * brightest of them at 3.76, and it is drawn that way. The stick figure follows
 * the conventional joins.
 *
 * The soft bloom near Epsilon is the Rosette Nebula, which really does sit in
 * this constellation at roughly 6h 33m, +4° 57'.
 *
 * Coordinates are rounded and the projection is a plain linear one, so this is a
 * fair likeness rather than a navigational chart.
 */

interface Star {
  id: string;
  /** Greek letter, shown for the brighter few. */
  label?: string;
  ra: number;
  dec: number;
  mag: number;
}

const STARS: Star[] = [
  { id: "zeta", label: "ζ", ra: 8.144, dec: -2.983, mag: 4.34 },
  { id: "alpha", label: "α", ra: 7.687, dec: -9.551, mag: 3.93 },
  { id: "delta", label: "δ", ra: 7.198, dec: -0.492, mag: 4.15 },
  { id: "thirteen", ra: 6.533, dec: 7.333, mag: 4.47 },
  { id: "beta", label: "β", ra: 6.483, dec: -7.033, mag: 3.76 },
  { id: "epsilon", label: "ε", ra: 6.383, dec: 4.6, mag: 4.39 },
  { id: "gamma", label: "γ", ra: 6.248, dec: -6.275, mag: 3.98 },
];

const LINES: [string, string][] = [
  ["zeta", "alpha"],
  ["alpha", "delta"],
  ["delta", "beta"],
  ["beta", "gamma"],
  ["delta", "epsilon"],
  ["epsilon", "thirteen"],
];

// Plot area inside the frame.
const X0 = 68;
const Y0 = 118;
const W = 424;
const H = 218;

const RA_MAX = 8.144;
const RA_MIN = 6.248;
const DEC_MAX = 7.333;
const DEC_MIN = -9.551;

/** Right ascension runs east, which is leftward on a sky chart. */
const px = (ra: number) => X0 + ((RA_MAX - ra) / (RA_MAX - RA_MIN)) * W;
const py = (dec: number) => Y0 + ((DEC_MAX - dec) / (DEC_MAX - DEC_MIN)) * H;
/** Brighter stars carry a lower magnitude, so the scale is inverted. */
const radius = (mag: number) => Math.max(1.6, 4.3 - (mag - 3.7) * 2.4);

/** A quiet field of unnamed stars. Fixed values so the sky never reflows. */
const FIELD = Array.from({ length: 90 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  const c = Math.sin(i * 39.425) * 24634.6345;
  return {
    x: 14 + (a - Math.floor(a)) * 532,
    y: 14 + (b - Math.floor(b)) * 372,
    r: 0.35 + (c - Math.floor(c)) * 0.95,
    o: 0.18 + (a - Math.floor(a)) * 0.5,
  };
});

export function Constellation({
  className,
  title = "The unicorn constellation",
  caption = "Structure brought to something hard to see.",
}: {
  className?: string;
  title?: string;
  caption?: string;
}) {
  const id = "mono";
  const byId = new Map(STARS.map((s) => [s.id, s]));

  return (
    <svg
      viewBox="0 0 560 400"
      fill="none"
      role="img"
      aria-label="The constellation Monoceros, its seven named stars joined by the conventional figure, with the Rosette Nebula glowing beside Epsilon"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="0.75" y="0.75" width="558.5" height="398.5" rx="18" />
        </clipPath>

        {/* Deep sky: darkest at the horizon, faintly lit toward the top. */}
        <radialGradient id={`${id}-sky`} cx="62%" cy="18%" r="95%">
          <stop offset="0%" stopColor="#101c33" />
          <stop offset="45%" stopColor="#080f1e" />
          <stop offset="100%" stopColor="#03060d" />
        </radialGradient>

        {/* The Rosette, which genuinely lies in Monoceros. */}
        <radialGradient id={`${id}-nebula`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9ae5c" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#a8628f" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#a8628f" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fdf8ec" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#e6c987" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e6c987" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${id}-join`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9963f" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#e6c987" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#c9963f" stopOpacity="0.25" />
        </linearGradient>

        <filter id={`${id}-bloom`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <rect x="0.75" y="0.75" width="558.5" height="398.5" rx="18" fill={`url(#${id}-sky)`} />

      <g clipPath={`url(#${id}-clip)`}>
        {/* Nebula sits beside Epsilon, where it actually is. */}
        <circle cx={px(6.55)} cy={py(4.95)} r="96" fill={`url(#${id}-nebula)`} />

        {FIELD.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cbd8ee" opacity={s.o} />
        ))}

        {/* The figure. */}
        {LINES.map(([from, to]) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={px(a.ra)}
              y1={py(a.dec)}
              x2={px(b.ra)}
              y2={py(b.dec)}
              stroke={`url(#${id}-join)`}
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          );
        })}

        {STARS.map((star) => {
          const x = px(star.ra);
          const y = py(star.dec);
          const r = radius(star.mag);
          return (
            <React.Fragment key={star.id}>
              {/* Halo, scaled with brightness. */}
              <circle cx={x} cy={y} r={r * 6} fill={`url(#${id}-glow)`} />
              <circle cx={x} cy={y} r={r * 1.9} fill="#e6c987" opacity="0.28" filter={`url(#${id}-bloom)`} />
              <circle cx={x} cy={y} r={r} fill="#fdf8ec" />
              {/* Diffraction spikes on the brightest, as a lens would render them. */}
              {star.mag < 4 ? (
                <g stroke="#fdf8ec" strokeWidth="0.7" opacity="0.5" strokeLinecap="round">
                  <line x1={x - r * 4.2} y1={y} x2={x + r * 4.2} y2={y} />
                  <line x1={x} y1={y - r * 4.2} x2={x} y2={y + r * 4.2} />
                </g>
              ) : null}
              {star.label ? (
                <text
                  x={x + r + 8}
                  y={y + 4}
                  fill="#94a4bd"
                  fontSize="11"
                  opacity="0.75"
                  fontStyle="italic"
                >
                  {star.label}
                </text>
              ) : null}
            </React.Fragment>
          );
        })}
      </g>

      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="398.5"
        rx="18"
        stroke="#1f2c48"
        strokeWidth="1.5"
      />

      <text x="34" y="42" fill="#94a4bd" fontSize="10.5" fontWeight="600" letterSpacing="2">
        MONOCEROS
      </text>
      <text x="34" y="70" fill="#e9eef6" fontSize="17" fontWeight="600">
        {title}
      </text>
      <text x="34" y="92" fill="#94a4bd" fontSize="12.5">
        {caption}
      </text>

      <text x="526" y="378" fill="#64748b" fontSize="10" textAnchor="end">
        β Mon · magnitude 3.76 · brightest in the figure
      </text>
    </svg>
  );
}
