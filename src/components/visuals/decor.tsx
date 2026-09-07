import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Decorative layers.
 *
 * All of these are pure CSS/SVG: they stay sharp at any resolution, cost no
 * network requests, and adapt to the viewport instead of being cropped like a
 * raster image would be. Every one is aria-hidden — they carry no meaning.
 */

/** Fine engineering grid, faded towards the bottom. */
export function GridBackdrop({
  className,
  fade = true,
}: {
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 grid-pattern opacity-[0.55]",
        fade && "mask-fade-b",
        className,
      )}
    />
  );
}

export function DotBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 dot-pattern opacity-40", className)}
    />
  );
}

/** Soft coloured light sources behind content. */
export function GlowOrbs({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "section" | "panel";
}) {
  if (variant === "panel") {
    return (
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 size-44 rounded-full bg-gold-400/[0.06] blur-3xl" />
      </div>
    );
  }

  if (variant === "section") {
    return (
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
        <div className="absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full bg-accent-600/[0.07] blur-[110px]" />
      </div>
    );
  }

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="animate-float-slow absolute -left-24 top-[-6rem] size-[460px] rounded-full bg-accent-600/[0.13] blur-[120px]" />
      <div
        className="animate-float-slow absolute right-[-8rem] top-24 size-[420px] rounded-full bg-[#1d4ed8]/[0.10] blur-[130px]"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="animate-float-slow absolute bottom-[-10rem] left-1/3 size-[380px] rounded-full bg-gold-500/[0.07] blur-[120px]"
        style={{ animationDelay: "-9s" }}
      />
    </div>
  );
}

/** Sparse drifting particles — deterministic positions, no layout shift. */
const PARTICLES = [
  { x: 8, y: 22, r: 1.4, d: 0 },
  { x: 21, y: 68, r: 1, d: 2.5 },
  { x: 34, y: 12, r: 1.7, d: 5 },
  { x: 47, y: 51, r: 1.1, d: 1.5 },
  { x: 59, y: 28, r: 1.5, d: 6.5 },
  { x: 68, y: 74, r: 1, d: 3.5 },
  { x: 79, y: 38, r: 1.6, d: 8 },
  { x: 88, y: 63, r: 1.2, d: 4.5 },
  { x: 94, y: 18, r: 1, d: 7 },
  { x: 15, y: 88, r: 1.3, d: 9.5 },
];

export function Particles({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    >
      {PARTICLES.map((p, index) => (
        <circle
          key={index}
          cx={p.x}
          cy={p.y}
          r={p.r / 6}
          fill={index % 3 === 0 ? "#d9ae5c" : "#d9ae5c"}
          opacity="0.5"
          className="animate-shimmer"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}
    </svg>
  );
}

/** Animated market line — an abstract price path, not a real chart. */
export function MarketLine({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 160"
      fill="none"
      preserveAspectRatio="none"
      className={cn("pointer-events-none w-full", className)}
    >
      <defs>
        <linearGradient id="market-line-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a87a2f" stopOpacity="0" />
          <stop offset="18%" stopColor="#c9963f" stopOpacity="0.9" />
          <stop offset="82%" stopColor="#d9ae5c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d9ae5c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="market-line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9963f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#c9963f" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M0 118 C 48 108, 74 128, 108 112 S 168 66, 208 84 S 268 128, 306 96 S 372 34, 414 58 S 470 96, 512 62 S 566 28, 600 40"
        fill="none"
        stroke="url(#market-line-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0 118 C 48 108, 74 128, 108 112 S 168 66, 208 84 S 268 128, 306 96 S 372 34, 414 58 S 470 96, 512 62 S 566 28, 600 40 L600 160 L0 160 Z"
        fill="url(#market-line-fill)"
      />
      <path
        d="M0 118 C 48 108, 74 128, 108 112 S 168 66, 208 84 S 268 128, 306 96 S 372 34, 414 58 S 470 96, 512 62 S 566 28, 600 40"
        fill="none"
        stroke="#e6c987"
        strokeWidth="1.5"
        strokeDasharray="8 460"
        className="animate-dash"
        opacity="0.75"
      />
    </svg>
  );
}

/** Abstract candles + volume bars. Purely ornamental — no data implied. */
export function AbstractChart({ className }: { className?: string }) {
  const candles = [
    { x: 12, o: 78, c: 62, h: 56, l: 84, up: true },
    { x: 40, o: 62, c: 70, h: 58, l: 76, up: false },
    { x: 68, o: 70, c: 52, h: 46, l: 74, up: true },
    { x: 96, o: 52, c: 58, h: 48, l: 64, up: false },
    { x: 124, o: 58, c: 40, h: 34, l: 62, up: true },
    { x: 152, o: 40, c: 46, h: 36, l: 52, up: false },
    { x: 180, o: 46, c: 28, h: 22, l: 50, up: true },
  ];

  return (
    <svg aria-hidden viewBox="0 0 200 100" fill="none" className={cn("w-full", className)}>
      {candles.map((candle) => {
        const colour = candle.up ? "#d9ae5c" : "#7c8aa5";
        const top = Math.min(candle.o, candle.c);
        const height = Math.max(Math.abs(candle.c - candle.o), 2);
        return (
          <g key={candle.x} opacity="0.9">
            <line
              x1={candle.x + 5}
              y1={candle.h}
              x2={candle.x + 5}
              y2={candle.l}
              stroke={colour}
              strokeWidth="1"
              opacity="0.55"
            />
            <rect
              x={candle.x}
              y={top}
              width="10"
              height={height}
              rx="1.5"
              fill={colour}
              opacity={candle.up ? 0.9 : 0.45}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Connected network of processing nodes. */
export function NetworkNodes({ className }: { className?: string }) {
  const nodes = [
    { id: "a", x: 20, y: 30 },
    { id: "b", x: 20, y: 70 },
    { id: "c", x: 50, y: 20 },
    { id: "d", x: 50, y: 50 },
    { id: "e", x: 50, y: 80 },
    { id: "f", x: 80, y: 35 },
    { id: "g", x: 80, y: 65 },
  ];
  const edges: [string, string][] = [
    ["a", "c"],
    ["a", "d"],
    ["b", "d"],
    ["b", "e"],
    ["c", "f"],
    ["d", "f"],
    ["d", "g"],
    ["e", "g"],
  ];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg aria-hidden viewBox="0 0 100 100" className={cn("w-full", className)} fill="none">
      <g stroke="#1f2c48" strokeWidth="0.6">
        {edges.map(([from, to]) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      <g stroke="#c9963f" strokeWidth="0.7" opacity="0.75">
        {edges.slice(0, 4).map(([from, to], index) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`glow-${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeDasharray="3 18"
              className="animate-dash"
              style={{ animationDelay: `${index * 0.8}s` }}
            />
          );
        })}
      </g>
      {nodes.map((node, index) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r="3.4"
            fill="#0b111e"
            stroke={index % 3 === 0 ? "#d9ae5c" : "#d9ae5c"}
            strokeWidth="1"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r="1.3"
            fill={index % 3 === 0 ? "#d9ae5c" : "#d9ae5c"}
            className="animate-shimmer"
            style={{ animationDelay: `${index * 0.35}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

/** Thin accent rule used to separate sections. */
export function Hairline({ className }: { className?: string }) {
  return <div aria-hidden className={cn("hairline w-full", className)} />;
}

/** Small labelled eyebrow above a section heading. */
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-880/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-300">
      <span aria-hidden className="size-1.5 rounded-full bg-accent-400" />
      {children}
    </span>
  );
}
