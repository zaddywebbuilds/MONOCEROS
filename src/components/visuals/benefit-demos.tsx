import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Benefit demonstrations.
 *
 * One small looping scene per claim on the "Why Monoceros" cards, so the card
 * shows what it is describing rather than only asserting it. They are SVG with
 * CSS animation rather than video: a few kilobytes instead of megabytes, sharp
 * at any size, correct in both themes, and honest about their own limits.
 *
 * The motion is gated — nothing animates until the section scrolls into view —
 * and every keyframe ends on its resting state, so a reader who has asked for
 * reduced motion gets the finished picture rather than a frozen half-frame.
 *
 * As everywhere else on this site, they depict the mechanism. There are no
 * balances, no returns, no counters and no invented activity: the market line is
 * an abstract path, and every reference is masked.
 */

const C = {
  line: "#1f2c48",
  lineSoft: "#17223a",
  raised: "#131c30",
  well: "#080d18",
  gold: "#d9ae5c",
  goldDeep: "#c9963f",
  goldSoft: "#e6c987",
  emerald: "#12c99b",
  emeraldSoft: "#2fd4a7",
  emeraldDeep: "#0a8368",
  fg: "#e9eef6",
  muted: "#94a4bd",
  subtle: "#64748b",
};

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

function Stage({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 320 120"
      fill="none"
      role="img"
      aria-label={label}
      fontFamily={FONT}
      className={cn("h-auto w-full", className)}
    >
      {children}
    </svg>
  );
}

/** A labelled sub-panel, used where a scene has two sides. */
function Zone({
  x,
  y,
  w,
  h,
  title,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  accent?: boolean;
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="10"
        fill={C.well}
        stroke={accent ? C.goldDeep : C.line}
        strokeWidth="1.1"
        opacity={accent ? 1 : 0.9}
      />
      <text
        x={x + 12}
        y={y + 16}
        fill={accent ? C.goldSoft : C.subtle}
        fontSize="8"
        fontWeight="600"
        letterSpacing="0.9"
      >
        {title.toUpperCase()}
      </text>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. Automated market execution
// ---------------------------------------------------------------------------

/** Execution happens outside; what arrives here is a record of it. */
export function ExecutionDemo({ className }: { className?: string }) {
  return (
    <Stage
      className={className}
      label="An externally operated system trades across markets, and this platform records the resulting subscription entries"
    >
      <defs>
        <linearGradient id="demo1-path" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.goldDeep} stopOpacity="0.2" />
          <stop offset="50%" stopColor={C.goldSoft} />
          <stop offset="100%" stopColor={C.goldDeep} stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <Zone x={4} y={14} w={128} h={92} title="External system" />
      {/* An abstract path, not a real instrument and not a real result. */}
      <path
        d="M16 78 C 30 70, 38 84, 50 72 S 72 50, 86 60 S 106 44, 120 38"
        stroke={C.lineSoft}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 78 C 30 70, 38 84, 50 72 S 72 50, 86 60 S 106 44, 120 38"
        stroke="url(#demo1-path)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="14 150"
        className="demo-anim demo-dash"
      />
      {[
        { x: 24, t: 84, h: 12 },
        { x: 44, t: 76, h: 16 },
        { x: 64, t: 66, h: 14 },
        { x: 84, t: 58, h: 18 },
        { x: 104, t: 50, h: 12 },
      ].map((c, i) => (
        <rect
          key={c.x}
          x={c.x}
          y={c.t}
          width="5"
          height={c.h}
          rx="1.5"
          fill={C.goldDeep}
          opacity="0.5"
          className="demo-anim demo-glow"
          style={{ animationDelay: `${i * 0.32}s` }}
        />
      ))}

      {/* The hand-off: a record travelling from there to here. */}
      <path d="M136 60 H 180" stroke={C.line} strokeWidth="1.2" strokeDasharray="3 3" />
      <g className="demo-anim demo-travel">
        <circle cx="138" cy="60" r="3.5" fill={C.gold} />
      </g>

      <Zone x={188} y={14} w={128} h={92} title="This platform" accent />
      {[0, 1, 2].map((i) => (
        <g key={i} className="demo-anim demo-appear" style={{ animationDelay: `${i * 0.5}s` }}>
          <rect
            x={198}
            y={30 + i * 22}
            width={108}
            height={16}
            rx="5"
            fill={C.raised}
            stroke={C.line}
            strokeWidth="1"
          />
          <circle cx={208} cy={38 + i * 22} r="2.5" fill={i === 0 ? C.emerald : C.subtle} />
          <rect x={218} y={35 + i * 22} width={54 - i * 8} height="5" rx="2.5" fill="#2c3c5c" />
        </g>
      ))}
      <text x={198} y={100} fill={C.subtle} fontSize="7.5">
        Subscription records
      </text>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 2. Structured investment cycles
// ---------------------------------------------------------------------------

/** A fixed weekly start and a fixed end, drawn as a term filling up. */
export function CyclesDemo({ className }: { className?: string }) {
  const gap = 6;
  const cellW = (304 - gap * 6) / 7;
  const letters = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <Stage
      className={className}
      label="A week with the cycle day marked, and a fixed term filling from its start to its maturity"
    >
      <defs>
        <linearGradient id="demo2-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.goldDeep} />
          <stop offset="100%" stopColor={C.emerald} />
        </linearGradient>
      </defs>

      {letters.map((letter, i) => {
        const x = 8 + i * (cellW + gap);
        const isCycleDay = i === 4;
        return (
          <React.Fragment key={i}>
            <rect
              x={x}
              y={14}
              width={cellW}
              height={30}
              rx="7"
              fill={isCycleDay ? "#3d2b10" : C.well}
              stroke={isCycleDay ? C.goldDeep : C.line}
              strokeWidth={isCycleDay ? 1.4 : 1}
              className={isCycleDay ? "demo-anim demo-glow" : undefined}
            />
            <text
              x={x + cellW / 2}
              y={33}
              fill={isCycleDay ? C.goldSoft : C.subtle}
              fontSize="9"
              textAnchor="middle"
              fontWeight={isCycleDay ? 600 : 400}
            >
              {letter}
            </text>
          </React.Fragment>
        );
      })}

      <text x={8} y={62} fill={C.subtle} fontSize="8" letterSpacing="0.8">
        FIXED TERM
      </text>

      <rect x={8} y={70} width={304} height={10} rx="5" fill={C.well} stroke={C.line} strokeWidth="1" />
      <rect
        x={8}
        y={70}
        width={304}
        height={10}
        rx="5"
        fill="url(#demo2-fill)"
        className="demo-anim demo-fill"
      />

      <circle cx={13} cy={75} r="4" fill={C.gold} />
      <circle cx={307} cy={75} r="4" fill={C.emerald} />
      <text x={8} y={100} fill={C.goldSoft} fontSize="8.5">
        Cycle opens
      </text>
      <text x={312} y={100} fill={C.emeraldSoft} fontSize="8.5" textAnchor="end">
        Maturity
      </text>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 3. Secure account management
// ---------------------------------------------------------------------------

/** Verification, hashing and private storage, shown as three guarded rows. */
export function SecurityDemo({ className }: { className?: string }) {
  return (
    <Stage
      className={className}
      label="An identity-verified account, a credential being hashed rather than stored, and documents kept in private storage"
    >
      {/* Shield */}
      <path
        d="M40 14 L68 24 V56 C68 76 54 88 40 94 C26 88 12 76 12 56 V24 Z"
        fill={C.well}
        stroke={C.line}
        strokeWidth="1.4"
      />
      <path
        d="M28 54 l8 9 l16 -20"
        stroke={C.emerald}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="46"
        className="demo-anim demo-draw"
        style={{ "--demo-len": "46" } as React.CSSProperties}
      />

      {/* Identity verified */}
      <rect x={84} y={16} width={232} height={24} rx="7" fill={C.well} stroke={C.line} strokeWidth="1" />
      <circle cx={96} cy={28} r="3" fill={C.emerald} />
      <text x={106} y={31} fill={C.muted} fontSize="9">
        Identity verified
      </text>

      {/* Credential hashed — plaintext never rests here. */}
      <rect x={84} y={46} width={232} height={26} rx="7" fill={C.well} stroke={C.line} strokeWidth="1" />
      <text x={96} y={62} fill={C.subtle} fontSize="8.5">
        ••••••••
      </text>
      <path d="M146 59 h14" stroke={C.subtle} strokeWidth="1" />
      <path d="M156 55.5 l5 3.5 l-5 3.5" fill={C.subtle} />
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect
            key={i}
            x={170 + i * 19}
            y={54}
            width={14}
            height={10}
            rx="2.5"
            fill={C.goldDeep}
            opacity="0.45"
          />
        ))}
        {/* A sweep across the hash, standing in for the digest being computed. */}
        <rect
          x={166}
          y={52}
          width={18}
          height={14}
          rx="3"
          fill={C.goldSoft}
          opacity="0.85"
          className="demo-anim demo-sweep"
        />
      </g>
      <text x={302} y={62} fill={C.subtle} fontSize="7.5" textAnchor="end">
        hashed
      </text>

      {/* Private storage */}
      <rect x={84} y={78} width={232} height={26} rx="7" fill={C.well} stroke={C.line} strokeWidth="1" />
      <rect x={94} y={85} width={12} height={12} rx="2" stroke={C.gold} strokeWidth="1.3" />
      <path d="M97 85 v-3 a3 3 0 0 1 6 0 v3" stroke={C.gold} strokeWidth="1.3" fill="none" />
      <text x={114} y={95} fill={C.muted} fontSize="9">
        Documents in private storage
      </text>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 4. Transparent subscription tracking
// ---------------------------------------------------------------------------

/** One dashboard, showing where a subscription stands and how long is left. */
export function TrackingDemo({ className }: { className?: string }) {
  const steps = ["Payment", "Approved", "Active"];

  return (
    <Stage
      className={className}
      label="A subscription advancing through payment, approval and active status, with the time remaining counting down beside it"
    >
      <defs>
        <linearGradient id="demo4-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.emerald} />
          <stop offset="100%" stopColor={C.goldDeep} />
        </linearGradient>
      </defs>

      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <rect
            x={8 + i * 92}
            y={14}
            width={84}
            height={28}
            rx="8"
            fill={C.well}
            stroke={C.line}
            strokeWidth="1"
          />
          <text
            x={50 + i * 92}
            y={32}
            fill={C.muted}
            fontSize="9"
            textAnchor="middle"
          >
            {step}
          </text>
          {i < 2 ? (
            <path
              d={`M${96 + i * 92} 28 h6`}
              stroke={C.line}
              strokeWidth="1.2"
            />
          ) : null}
        </React.Fragment>
      ))}

      {/* The highlight steps along as the subscription does. */}
      <g className="demo-anim demo-step">
        <rect
          x={8}
          y={14}
          width={84}
          height={28}
          rx="8"
          fill="none"
          stroke={C.gold}
          strokeWidth="1.8"
        />
      </g>

      <text x={8} y={62} fill={C.subtle} fontSize="8" letterSpacing="0.8">
        TIME REMAINING
      </text>
      <rect x={8} y={70} width={304} height={10} rx="5" fill={C.well} stroke={C.line} strokeWidth="1" />
      <rect
        x={8}
        y={70}
        width={304}
        height={10}
        rx="5"
        fill="url(#demo4-fill)"
        className="demo-anim demo-drain"
      />

      <text x={8} y={100} fill={C.subtle} fontSize="8.5">
        Start date
      </text>
      <text x={312} y={100} fill={C.subtle} fontSize="8.5" textAnchor="end">
        Maturity date
      </text>
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 5. Digital investment records
// ---------------------------------------------------------------------------

/** Every event gets its own reference and joins the history. */
export function RecordsDemo({ className }: { className?: string }) {
  const rows = ["Subscription", "Payment", "Rollover"];

  return (
    <Stage
      className={className}
      label="A chain of records — a subscription, a payment and a rollover — each carrying its own masked reference"
    >
      {/* The thread running through the history. */}
      <path d="M20 22 V 104" stroke={C.line} strokeWidth="1.2" strokeDasharray="3 4" />

      {rows.map((row, i) => (
        <g key={row} className="demo-anim demo-appear" style={{ animationDelay: `${i * 0.6}s` }}>
          <circle cx={20} cy={28 + i * 32} r="5" fill={C.well} stroke={C.goldDeep} strokeWidth="1.4" />
          <circle cx={20} cy={28 + i * 32} r="2" fill={C.gold} />

          <rect
            x={38}
            y={16 + i * 32}
            width={278}
            height={24}
            rx="7"
            fill={C.well}
            stroke={C.line}
            strokeWidth="1"
          />
          <text x={50} y={31 + i * 32} fill={C.muted} fontSize="9">
            {row}
          </text>
          {/* References are masked: the shape is the point, not a real one. */}
          <rect
            x={196}
            y={22 + i * 32}
            width={108}
            height={13}
            rx="6.5"
            fill="#2a1f0d"
            stroke={C.goldDeep}
            strokeWidth="0.9"
          />
          <text x={250} y={31.5 + i * 32} fill={C.goldSoft} fontSize="8" textAnchor="middle">
            REF ••••-••••
          </text>
        </g>
      ))}
    </Stage>
  );
}

// ---------------------------------------------------------------------------
// 6. Dedicated support
// ---------------------------------------------------------------------------

/** A ticket raised from the dashboard, and a reply coming back. */
export function SupportDemo({ className }: { className?: string }) {
  return (
    <Stage
      className={className}
      label="A support ticket raised from the dashboard receiving a reply, with WhatsApp and email as the other channels"
    >
      {/* Outgoing ticket */}
      <rect x={8} y={14} width={168} height={30} rx="9" fill={C.raised} stroke={C.line} strokeWidth="1" />
      <path d="M24 24 h12 v10 h-12 z" stroke={C.gold} strokeWidth="1.2" fill="none" />
      <path d="M24 26 l6 4 l6 -4" stroke={C.gold} strokeWidth="1.2" fill="none" />
      <text x={46} y={33} fill={C.muted} fontSize="9">
        Ticket raised
      </text>

      {/* Reply, still being written */}
      <rect x={112} y={52} width={200} height={32} rx="9" fill={C.well} stroke={C.emeraldDeep} strokeWidth="1.1" />
      <text x={126} y={65} fill={C.emeraldSoft} fontSize="8" letterSpacing="0.7">
        SUPPORT
      </text>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={128 + i * 10}
          cy={74}
          r="2.6"
          fill={C.emerald}
          className="demo-anim demo-bounce"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
      <rect x={162} y={71} width={136} height="6" rx="3" fill="#1f2b45" />

      {/* The other ways through */}
      <rect x={8} y={92} width={74} height={20} rx="10" fill={C.well} stroke={C.line} strokeWidth="1" />
      <circle cx={22} cy={102} r="4" stroke={C.emerald} strokeWidth="1.2" fill="none" />
      <text x={34} y={105} fill={C.muted} fontSize="8.5">
        WhatsApp
      </text>

      <rect x={90} y={92} width={56} height={20} rx="10" fill={C.well} stroke={C.line} strokeWidth="1" />
      <rect x={100} y={98} width={11} height="8" rx="1.5" stroke={C.gold} strokeWidth="1.1" />
      <path d="M100 99 l5.5 4 l5.5 -4" stroke={C.gold} strokeWidth="1.1" fill="none" />
      <text x={117} y={105} fill={C.muted} fontSize="8.5">
        Email
      </text>
    </Stage>
  );
}
