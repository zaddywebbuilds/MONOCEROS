import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Scene illustrations.
 *
 * These are the platform's key imagery: hero, AI infrastructure, market
 * classes, workflow, security, investment cycle and brand. They are authored
 * as SVG rather than sourced as photographs so they stay razor sharp on every
 * display, respond to the layout, weigh almost nothing, and — importantly for
 * a financial product — depict concepts rather than fabricated trading
 * screens, order books or account balances.
 */

const shared = {
  ink: "#0b111e",
  inkDeep: "#060a12",
  line: "#1f2c48",
  accent: "#c9963f",
  accentSoft: "#d9ae5c",
  gold: "#d9ae5c",
  muted: "#7c8aa5",
};

function Frame({
  children,
  className,
  viewBox = "0 0 640 460",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  viewBox?: string;
  label: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      role="img"
      aria-label={label}
      className={cn("h-auto w-full", className)}
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero — automated market intelligence infrastructure
// ---------------------------------------------------------------------------

export function HeroVisual({ className }: { className?: string }) {
  const orbits = [
    { r: 78, dur: "0s", opacity: 0.5 },
    { r: 116, dur: "1.2s", opacity: 0.35 },
    { r: 158, dur: "2.4s", opacity: 0.22 },
  ];

  const chips = [
    { label: "BTC", x: 320, y: 82 },
    { label: "FX", x: 468, y: 168 },
    { label: "EQ", x: 430, y: 322 },
    { label: "ETH", x: 196, y: 320 },
    { label: "IDX", x: 162, y: 156 },
  ];

  return (
    <Frame
      className={className}
      label="Abstract representation of automated market intelligence infrastructure spanning several asset classes"
    >
      <defs>
        <radialGradient id="hero-core" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#d9ae5c" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#a87a2f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#463218" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1525" />
          <stop offset="100%" stopColor="#060a12" />
        </linearGradient>
        <linearGradient id="hero-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9963f" stopOpacity="0" />
          <stop offset="50%" stopColor="#d9ae5c" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#d9ae5c" stopOpacity="0" />
        </linearGradient>
        <filter id="hero-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect width="640" height="460" rx="26" fill="url(#hero-panel)" />
      <rect x="0.75" y="0.75" width="638.5" height="458.5" rx="25" stroke={shared.line} strokeWidth="1.5" />

      {/* grid */}
      <g stroke={shared.line} strokeWidth="0.7" opacity="0.5">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={40 + i * 56} y1="24" x2={40 + i * 56} y2="436" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="24" y1={40 + i * 56} x2="616" y2={40 + i * 56} />
        ))}
      </g>

      {/* core glow */}
      <circle cx="320" cy="230" r="150" fill="url(#hero-core)" filter="url(#hero-blur)" opacity="0.6" />

      {/* orbit rings */}
      {orbits.map((orbit) => (
        <circle
          key={orbit.r}
          cx="320"
          cy="230"
          r={orbit.r}
          stroke={shared.accentSoft}
          strokeWidth="1"
          opacity={orbit.opacity}
          strokeDasharray="4 10"
        />
      ))}

      {/* pulse rings */}
      {orbits.map((orbit, index) => (
        <circle
          key={`pulse-${orbit.r}`}
          cx="320"
          cy="230"
          r="60"
          stroke={shared.accent}
          strokeWidth="1.2"
          opacity="0"
          className="animate-pulse-ring"
          style={{ animationDelay: `${index * 1}s`, transformOrigin: "320px 230px" }}
        />
      ))}

      {/* core */}
      <circle cx="320" cy="230" r="42" fill={shared.inkDeep} stroke={shared.accent} strokeWidth="1.6" />
      <circle cx="320" cy="230" r="26" fill="none" stroke={shared.accentSoft} strokeWidth="1" opacity="0.6" />
      <path
        d="M306 236 L314 224 L322 232 L334 214"
        stroke={shared.accentSoft}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="334" cy="214" r="3" fill={shared.gold} />

      {/* asset chips connected to the core */}
      {chips.map((chip, index) => (
        <g key={chip.label}>
          <line
            x1="320"
            y1="230"
            x2={chip.x}
            y2={chip.y}
            stroke={shared.line}
            strokeWidth="1"
          />
          <line
            x1="320"
            y1="230"
            x2={chip.x}
            y2={chip.y}
            stroke={shared.accent}
            strokeWidth="1.1"
            strokeDasharray="5 26"
            className="animate-dash"
            style={{ animationDelay: `${index * 0.6}s` }}
            opacity="0.8"
          />
          <g>
            <rect
              x={chip.x - 27}
              y={chip.y - 15}
              width="54"
              height="30"
              rx="9"
              fill={shared.ink}
              stroke={index % 2 === 0 ? shared.accent : shared.gold}
              strokeWidth="1.1"
              opacity="0.95"
            />
            <text
              x={chip.x}
              y={chip.y + 4.5}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="600"
              fill={index % 2 === 0 ? shared.accentSoft : shared.gold}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {chip.label}
            </text>
          </g>
        </g>
      ))}

      {/* baseline market path */}
      <path
        d="M28 404 C 90 396, 122 416, 168 398 S 246 342, 300 366 S 384 412, 436 372 S 528 306, 612 336"
        stroke="url(#hero-sweep)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* corner readouts (labels only — no fabricated figures) */}
      <g fontFamily="Inter, system-ui, sans-serif">
        <rect x="28" y="28" width="150" height="46" rx="12" fill="#0b111e" stroke={shared.line} />
        <text x="44" y="48" fontSize="9.5" letterSpacing="1.6" fill={shared.muted}>
          EXTERNAL SYSTEM
        </text>
        <text x="44" y="63" fontSize="12" fontWeight="600" fill="#e9eef6">
          Automated execution
        </text>

        <rect x="462" y="386" width="150" height="46" rx="12" fill="#0b111e" stroke={shared.line} />
        <text x="478" y="406" fontSize="9.5" letterSpacing="1.6" fill={shared.muted}>
          THIS PLATFORM
        </text>
        <text x="478" y="421" fontSize="12" fontWeight="600" fill="#e9eef6">
          Subscription records
        </text>
      </g>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 2. AI trading infrastructure
// ---------------------------------------------------------------------------

export function AiInfrastructureVisual({ className }: { className?: string }) {
  const lanes = [
    { label: "Cryptocurrency", y: 92 },
    { label: "Foreign exchange", y: 156 },
    { label: "Equities", y: 220 },
    { label: "Commodities", y: 284 },
  ];

  return (
    <Frame
      className={className}
      viewBox="0 0 640 380"
      label="Automated intelligence analysing several asset classes and producing structured records"
    >
      <defs>
        <linearGradient id="ai-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1525" />
          <stop offset="100%" stopColor="#060a12" />
        </linearGradient>
        <linearGradient id="ai-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a87a2f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#463218" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="640" height="380" rx="24" fill="url(#ai-panel)" />
      <rect x="0.75" y="0.75" width="638.5" height="378.5" rx="23" stroke={shared.line} strokeWidth="1.5" />

      <g fontFamily="Inter, system-ui, sans-serif">
        {lanes.map((lane, index) => (
          <g key={lane.label}>
            <rect
              x="34"
              y={lane.y - 18}
              width="176"
              height="36"
              rx="10"
              fill="#0b111e"
              stroke={shared.line}
            />
            <circle cx="54" cy={lane.y} r="4" fill={index % 2 === 0 ? shared.accent : shared.gold} />
            <text x="70" y={lane.y + 4} fontSize="12" fill="#c3cede">
              {lane.label}
            </text>

            <path
              d={`M214 ${lane.y} C 254 ${lane.y}, 254 190, 292 190`}
              stroke={shared.line}
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d={`M214 ${lane.y} C 254 ${lane.y}, 254 190, 292 190`}
              stroke={shared.accent}
              strokeWidth="1.4"
              fill="none"
              strokeDasharray="4 22"
              className="animate-dash"
              style={{ animationDelay: `${index * 0.5}s` }}
              opacity="0.85"
            />
          </g>
        ))}

        {/* processing core */}
        <rect x="292" y="128" width="124" height="124" rx="24" fill="url(#ai-core)" stroke={shared.accent} strokeWidth="1.4" />
        <text x="354" y="176" textAnchor="middle" fontSize="10" letterSpacing="1.5" fill={shared.accentSoft}>
          EXTERNAL
        </text>
        <text x="354" y="194" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#e9eef6">
          Automated
        </text>
        <text x="354" y="212" textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#e9eef6">
          trading system
        </text>

        {/* nodes inside the core */}
        <g opacity="0.55">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              cx={310 + (i % 3) * 44}
              cy={144 + Math.floor(i / 3) * 92}
              r="2.4"
              fill={shared.accentSoft}
              className="animate-shimmer"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </g>

        {/* separation boundary */}
        <line x1="452" y1="40" x2="452" y2="340" stroke={shared.gold} strokeWidth="1" strokeDasharray="6 8" opacity="0.55" />
        <text x="452" y="32" textAnchor="middle" fontSize="9.5" letterSpacing="1.4" fill={shared.gold}>
          BOUNDARY
        </text>

        <path d="M416 190 L490 190" stroke={shared.line} strokeWidth="1.2" />
        <path d="M482 184 L490 190 L482 196" stroke={shared.muted} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* platform side */}
        <rect x="492" y="128" width="116" height="124" rx="20" fill="#0b111e" stroke={shared.line} />
        <text x="550" y="164" textAnchor="middle" fontSize="10" letterSpacing="1.5" fill={shared.muted}>
          MONOCEROS
        </text>
        {["Subscriptions", "Payments", "Cycles", "Maturity"].map((item, i) => (
          <g key={item}>
            <circle cx="512" cy={186 + i * 20} r="2.6" fill={shared.accent} opacity="0.8" />
            <text x="522" y={190 + i * 20} fontSize="11" fill="#c3cede">
              {item}
            </text>
          </g>
        ))}
      </g>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 3. Markets — crypto, forex, equities
// ---------------------------------------------------------------------------

export function MarketsVisual({ className }: { className?: string }) {
  return (
    <Frame
      className={className}
      viewBox="0 0 640 360"
      label="Three connected global market categories: digital assets, foreign exchange and equities"
    >
      <defs>
        <linearGradient id="mk-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1525" />
          <stop offset="100%" stopColor="#060a12" />
        </linearGradient>
        <radialGradient id="mk-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9963f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c9963f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="640" height="360" rx="24" fill="url(#mk-panel)" />
      <rect x="0.75" y="0.75" width="638.5" height="358.5" rx="23" stroke={shared.line} strokeWidth="1.5" />
      <circle cx="320" cy="180" r="180" fill="url(#mk-glow)" />

      {/* three intersecting domains */}
      <g opacity="0.9">
        <circle cx="238" cy="164" r="104" stroke={shared.accent} strokeWidth="1.3" opacity="0.7" />
        <circle cx="402" cy="164" r="104" stroke={shared.gold} strokeWidth="1.3" opacity="0.6" />
        <circle cx="320" cy="238" r="104" stroke="#4d94f0" strokeWidth="1.3" opacity="0.5" />
      </g>

      <g fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">
        <text x="196" y="118" fontSize="12.5" fontWeight="600" fill={shared.accentSoft}>
          Digital assets
        </text>
        <text x="446" y="118" fontSize="12.5" fontWeight="600" fill={shared.gold}>
          Foreign exchange
        </text>
        <text x="320" y="312" fontSize="12.5" fontWeight="600" fill="#4d94f0">
          Equities &amp; indices
        </text>

        <text x="320" y="176" fontSize="11" letterSpacing="1.5" fill={shared.muted}>
          SUPPORTED
        </text>
        <text x="320" y="196" fontSize="14" fontWeight="600" fill="#e9eef6">
          Global markets
        </text>
      </g>

      {/* orbiting tickers */}
      {[
        { label: "BTC", x: 176, y: 190 },
        { label: "ETH", x: 250, y: 106 },
        { label: "EUR", x: 448, y: 196 },
        { label: "GBP", x: 386, y: 104 },
        { label: "IDX", x: 268, y: 288 },
        { label: "SOL", x: 376, y: 292 },
      ].map((chip, index) => (
        <g key={chip.label}>
          <rect
            x={chip.x - 22}
            y={chip.y - 12}
            width="44"
            height="24"
            rx="7"
            fill="#0b111e"
            stroke={shared.line}
          />
          <text
            x={chip.x}
            y={chip.y + 4}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill="#c3cede"
            fontFamily="Inter, system-ui, sans-serif"
            className="animate-shimmer"
            style={{ animationDelay: `${index * 0.4}s` }}
          >
            {chip.label}
          </text>
        </g>
      ))}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 4. How it works — the workflow path
// ---------------------------------------------------------------------------

export function WorkflowVisual({ className }: { className?: string }) {
  const steps = [
    { x: 60, y: 250, label: "Account" },
    { x: 158, y: 190, label: "Verify" },
    { x: 256, y: 230, label: "Package" },
    { x: 354, y: 150, label: "Payment" },
    { x: 452, y: 196, label: "Cycle" },
    { x: 560, y: 112, label: "Maturity" },
  ];

  const path =
    "M60 250 C 108 250, 112 190, 158 190 S 214 230, 256 230 S 314 150, 354 150 S 414 196, 452 196 S 516 112, 560 112";

  return (
    <Frame
      className={className}
      viewBox="0 0 640 320"
      label="The investment workflow from account creation through verification, payment, the weekly cycle and maturity"
    >
      <defs>
        <linearGradient id="wf-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a87a2f" />
          <stop offset="70%" stopColor="#d9ae5c" />
          <stop offset="100%" stopColor="#d9ae5c" />
        </linearGradient>
      </defs>

      <rect width="640" height="320" rx="24" fill="#080d18" />
      <rect x="0.75" y="0.75" width="638.5" height="318.5" rx="23" stroke={shared.line} strokeWidth="1.5" />

      <g stroke={shared.line} strokeWidth="0.7" opacity="0.45">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1="20" y1={40 + i * 30} x2="620" y2={40 + i * 30} />
        ))}
      </g>

      <path d={path} stroke={shared.line} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d={path} stroke="url(#wf-line)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path
        d={path}
        stroke="#f2e0b4"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="10 500"
        className="animate-dash"
      />

      {steps.map((step, index) => (
        <g key={step.label} fontFamily="Inter, system-ui, sans-serif">
          <circle cx={step.x} cy={step.y} r="15" fill="#0b111e" stroke={shared.line} strokeWidth="1.4" />
          <circle
            cx={step.x}
            cy={step.y}
            r="6"
            fill={index === steps.length - 1 ? shared.gold : shared.accent}
          />
          <text x={step.x} y={step.y + 36} textAnchor="middle" fontSize="11" fill="#c3cede">
            {step.label}
          </text>
          <text x={step.x} y={step.y - 24} textAnchor="middle" fontSize="9.5" fill={shared.muted}>
            0{index + 1}
          </text>
        </g>
      ))}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 5. Security / identity verification
// ---------------------------------------------------------------------------

export function SecurityVisual({ className }: { className?: string }) {
  return (
    <Frame
      className={className}
      viewBox="0 0 480 360"
      label="Digital identity verification and secure private document storage"
    >
      <defs>
        <linearGradient id="sec-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a87a2f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#463218" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect width="480" height="360" rx="24" fill="#080d18" />
      <rect x="0.75" y="0.75" width="478.5" height="358.5" rx="23" stroke={shared.line} strokeWidth="1.5" />

      {/* concentric protection rings */}
      {[150, 116, 82].map((r, i) => (
        <circle
          key={r}
          cx="240"
          cy="176"
          r={r}
          stroke={i === 0 ? shared.line : shared.accent}
          strokeOpacity={i === 0 ? 1 : 0.28}
          strokeWidth="1"
          strokeDasharray={i === 1 ? "3 9" : undefined}
        />
      ))}

      {/* shield */}
      <path
        d="M240 92 L302 118 V178 C302 218 274 248 240 262 C206 248 178 218 178 178 V118 Z"
        fill="url(#sec-shield)"
        stroke={shared.accent}
        strokeWidth="1.6"
      />

      {/* fingerprint arcs */}
      <g stroke={shared.accentSoft} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M222 196 C222 176, 258 176, 258 196" />
        <path d="M214 204 C214 172, 266 172, 266 204" opacity="0.7" />
        <path d="M230 190 C230 182, 250 182, 250 194" />
        <path d="M240 186 v18" />
      </g>

      {/* lock */}
      <g>
        <rect x="228" y="146" width="24" height="20" rx="5" fill={shared.gold} opacity="0.9" />
        <path d="M233 146 v-6 a7 7 0 0 1 14 0 v6" stroke={shared.gold} strokeWidth="2" fill="none" />
      </g>

      {/* document cards */}
      <g fontFamily="Inter, system-ui, sans-serif">
        <rect x="44" y="196" width="104" height="72" rx="10" fill="#0b111e" stroke={shared.line} transform="rotate(-8 96 232)" />
        <rect x="52" y="212" width="46" height="6" rx="3" fill={shared.muted} opacity="0.5" transform="rotate(-8 96 232)" />
        <rect x="52" y="226" width="70" height="5" rx="2.5" fill={shared.muted} opacity="0.35" transform="rotate(-8 96 232)" />
        <rect x="52" y="238" width="58" height="5" rx="2.5" fill={shared.muted} opacity="0.35" transform="rotate(-8 96 232)" />

        <rect x="332" y="196" width="104" height="72" rx="10" fill="#0b111e" stroke={shared.line} transform="rotate(7 384 232)" />
        <circle cx="358" cy="222" r="10" fill={shared.line} transform="rotate(7 384 232)" />
        <rect x="376" y="216" width="46" height="5" rx="2.5" fill={shared.muted} opacity="0.4" transform="rotate(7 384 232)" />
        <rect x="376" y="228" width="34" height="5" rx="2.5" fill={shared.muted} opacity="0.3" transform="rotate(7 384 232)" />
        <rect x="348" y="246" width="72" height="5" rx="2.5" fill={shared.accent} opacity="0.5" transform="rotate(7 384 232)" />

        <text x="240" y="308" textAnchor="middle" fontSize="11.5" fill={shared.muted}>
          Documents encrypted at rest &middot; access is logged
        </text>
      </g>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 6. Investment cycle — Friday to maturity
// ---------------------------------------------------------------------------

export function CycleVisual({ className }: { className?: string }) {
  const radius = 118;
  const cx = 240;
  const cy = 200;

  // 30 tick marks around the dial, one per day of the term.
  const ticks = Array.from({ length: 30 }).map((_, i) => {
    const angle = (-90 + (i / 30) * 360) * (Math.PI / 180);
    const inner = radius - (i % 5 === 0 ? 14 : 8);
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * radius,
      y2: cy + Math.sin(angle) * radius,
      major: i % 5 === 0,
    };
  });

  return (
    <Frame
      className={className}
      viewBox="0 0 480 400"
      label="A weekly cycle opening on Friday, followed by a thirty day term ending at maturity"
    >
      <defs>
        <linearGradient id="cyc-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a87a2f" />
          <stop offset="60%" stopColor="#d9ae5c" />
          <stop offset="100%" stopColor="#d9ae5c" />
        </linearGradient>
      </defs>

      <rect width="480" height="400" rx="24" fill="#080d18" />
      <rect x="0.75" y="0.75" width="478.5" height="398.5" rx="23" stroke={shared.line} strokeWidth="1.5" />

      <circle cx={cx} cy={cy} r={radius + 26} stroke={shared.line} strokeWidth="1" opacity="0.6" />
      <circle cx={cx} cy={cy} r={radius} stroke={shared.line} strokeWidth="1.2" />

      {ticks.map((tick, index) => (
        <line
          key={index}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={tick.major ? shared.accentSoft : shared.line}
          strokeWidth={tick.major ? 1.6 : 1}
          opacity={tick.major ? 0.85 : 0.7}
        />
      ))}

      {/* progress arc — roughly three quarters of the term */}
      <path
        d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - radius * Math.cos(Math.PI / 5)} ${cy + radius * Math.sin(Math.PI / 5)}`}
        stroke="url(#cyc-arc)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      <g fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">
        <text x={cx} y={cy - 16} fontSize="10" letterSpacing="1.8" fill={shared.muted}>
          TERM LENGTH
        </text>
        <text x={cx} y={cy + 18} fontSize="34" fontWeight="600" fill="#e9eef6">
          30
        </text>
        <text x={cx} y={cy + 38} fontSize="11.5" fill={shared.muted}>
          calendar days
        </text>
      </g>

      {/* cycle open marker */}
      <g fontFamily="Inter, system-ui, sans-serif">
        <circle cx={cx} cy={cy - radius} r="8" fill="#0b111e" stroke={shared.accent} strokeWidth="2" />
        <circle cx={cx} cy={cy - radius} r="3" fill={shared.accent} />
        <rect x={cx - 62} y={cy - radius - 54} width="124" height="34" rx="10" fill="#0b111e" stroke={shared.line} />
        <text x={cx} y={cy - radius - 38} textAnchor="middle" fontSize="9.5" letterSpacing="1.4" fill={shared.muted}>
          CYCLE OPENS
        </text>
        <text x={cx} y={cy - radius - 26} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={shared.accentSoft}>
          Friday 00:00 WAT
        </text>
      </g>

      {/* maturity marker */}
      <g fontFamily="Inter, system-ui, sans-serif">
        <circle
          cx={cx - radius * Math.cos(Math.PI / 5)}
          cy={cy + radius * Math.sin(Math.PI / 5)}
          r="8"
          fill="#0b111e"
          stroke={shared.gold}
          strokeWidth="2"
        />
        <circle
          cx={cx - radius * Math.cos(Math.PI / 5)}
          cy={cy + radius * Math.sin(Math.PI / 5)}
          r="3"
          fill={shared.gold}
        />
        <rect x="28" y="330" width="180" height="40" rx="10" fill="#0b111e" stroke={shared.line} />
        <text x="44" y="348" fontSize="9.5" letterSpacing="1.4" fill={shared.muted}>
          AT MATURITY
        </text>
        <text x="44" y="362" fontSize="11.5" fontWeight="600" fill={shared.gold}>
          Withdraw or roll over
        </text>
      </g>

      <g fontFamily="Inter, system-ui, sans-serif">
        <rect x="272" y="330" width="180" height="40" rx="10" fill="#0b111e" stroke={shared.line} />
        <text x="288" y="348" fontSize="9.5" letterSpacing="1.4" fill={shared.muted}>
          BEFORE ACTIVATION
        </text>
        <text x="288" y="362" fontSize="11.5" fontWeight="600" fill={shared.accentSoft}>
          Queued for next cycle
        </text>
      </g>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 7. Brand — the Monoceros constellation
// ---------------------------------------------------------------------------

export function BrandVisual({ className }: { className?: string }) {
  const stars = [
    { x: 108, y: 262, r: 4.5, bright: true },
    { x: 178, y: 206, r: 3 },
    { x: 232, y: 236, r: 3.6 },
    { x: 296, y: 168, r: 3 },
    { x: 352, y: 196, r: 5.2, bright: true },
    { x: 418, y: 124, r: 3.4 },
    { x: 470, y: 158, r: 3 },
  ];
  const links: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [2, 4],
  ];

  return (
    <Frame
      className={className}
      viewBox="0 0 560 360"
      label="The Monoceros constellation rendered as a connected star figure"
    >
      <defs>
        <radialGradient id="brand-sky" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#0e1a2c" />
          <stop offset="100%" stopColor="#05080f" />
        </radialGradient>
        <linearGradient id="brand-link" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#a87a2f" />
          <stop offset="100%" stopColor="#d9ae5c" />
        </linearGradient>
      </defs>

      <rect width="560" height="360" rx="24" fill="url(#brand-sky)" />
      <rect x="0.75" y="0.75" width="558.5" height="358.5" rx="23" stroke={shared.line} strokeWidth="1.5" />

      {/* faint background stars */}
      {Array.from({ length: 46 }).map((_, i) => {
        const x = (i * 97) % 540 + 10;
        const y = (i * 143) % 330 + 15;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 7 === 0 ? 1.4 : 0.8}
            fill="#c3cede"
            opacity={i % 5 === 0 ? 0.5 : 0.22}
            className={i % 6 === 0 ? "animate-shimmer" : undefined}
            style={i % 6 === 0 ? { animationDelay: `${(i % 9) * 0.5}s` } : undefined}
          />
        );
      })}

      {links.map(([a, b]) => {
        const from = stars[a];
        const to = stars[b];
        if (!from || !to) return null;
        return (
          <line
            key={`${a}-${b}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#brand-link)"
            strokeWidth="1.2"
            opacity="0.65"
          />
        );
      })}

      {/* the horn */}
      <path
        d="M418 124 L470 158 M418 124 L444 92"
        stroke={shared.gold}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />

      {stars.map((star, index) => (
        <g key={index}>
          {star.bright ? (
            <circle cx={star.x} cy={star.y} r={star.r * 3.2} fill={shared.accent} opacity="0.12" />
          ) : null}
          <circle
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill={star.bright ? "#ffffff" : "#f2e0b4"}
            className="animate-shimmer"
            style={{ animationDelay: `${index * 0.45}s` }}
          />
        </g>
      ))}

      <g fontFamily="Inter, system-ui, sans-serif">
        <text x="40" y="52" fontSize="10" letterSpacing="2" fill={shared.muted}>
          MONOCEROS
        </text>
        <text x="40" y="76" fontSize="15" fontWeight="600" fill="#e9eef6">
          The unicorn constellation
        </text>
        <text x="40" y="98" fontSize="12" fill={shared.muted}>
          Structure brought to something hard to see.
        </text>
      </g>
    </Frame>
  );
}
