import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * How a submitted document is actually held.
 *
 * The shield-and-padlock it replaces said "secure" without showing anything;
 * this shows the mechanism the platform really implements — private storage
 * rather than a public folder, links that expire in minutes rather than
 * permanent URLs, and an access log with an entry per view.
 *
 * Nothing here is a real record. The document references are masked, the log
 * entries carry roles rather than names, and no investor's data appears. It is a
 * drawing of the process, in the same lit card language as the rest of the site.
 */
export function SecurityPanel({ className }: { className?: string }) {
  const id = "sec";

  const C = {
    line: "#1f2c48",
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

  const log = [
    { role: "Compliance", action: "opened", ago: "2 min" },
    { role: "Compliance", action: "approved", ago: "1 min" },
  ];

  return (
    <svg
      viewBox="0 0 560 400"
      fill="none"
      role="img"
      aria-label="A submitted identity document held in private storage, reached through a link that expires, with every access written to a log"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="0.75" y="0.75" width="558.5" height="398.5" rx="18" />
        </clipPath>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#0e1727" />
          <stop offset="100%" stopColor="#05080f" />
        </linearGradient>
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#18233e" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id={`${id}-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070c16" />
          <stop offset="100%" stopColor="#0d1424" />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx="14%" cy="0%" r="88%">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.2" />
          <stop offset="55%" stopColor={C.gold} stopOpacity="0.04" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.goldSoft} />
          <stop offset="100%" stopColor={C.goldDeep} />
        </linearGradient>
        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id={`${id}-goldGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={C.gold} floodOpacity="0.45" />
        </filter>
        <filter id={`${id}-greenGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={C.emerald} floodOpacity="0.45" />
        </filter>
      </defs>

      <rect x="0.75" y="0.75" width="558.5" height="398.5" rx="18" fill={`url(#${id}-ground)`} />
      <rect x="0.75" y="0.75" width="558.5" height="398.5" rx="18" fill={`url(#${id}-light)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="5" height="400" fill={`url(#${id}-edge)`} />
      </g>
      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="398.5"
        rx="18"
        stroke={C.line}
        strokeWidth="1.5"
      />
      <path d="M22 1.5 H538" stroke={`url(#${id}-sheen)`} strokeWidth="1.5" />

      <circle cx="32" cy="31" r="3.5" fill={C.gold} />
      <text x="44" y="35" fill={C.goldSoft} fontSize="10.5" fontWeight="600" letterSpacing="1.4">
        DOCUMENT SECURITY
      </text>
      <text x="30" y="66" fill={C.fg} fontSize="17.5" fontWeight="600">
        Private storage
      </text>

      {/* The stored object */}
      <g filter={`url(#${id}-lift)`}>
        <rect
          x="30"
          y="90"
          width="240"
          height="118"
          rx="12"
          fill={`url(#${id}-card)`}
          stroke={C.line}
          strokeWidth="1.3"
        />
      </g>
      <rect
        x="48"
        y="108"
        width="46"
        height="56"
        rx="7"
        fill={`url(#${id}-well)`}
        stroke="#26344f"
      />
      <circle cx="71" cy="128" r="8.5" fill="#2c3c5c" />
      <path d="M57 155 a14 11 0 0 1 28 0" fill="#2c3c5c" />
      <rect x="108" y="112" width="96" height="8" rx="4" fill="#26344f" />
      <rect x="108" y="128" width="70" height="8" rx="4" fill="#1f2b45" />
      <rect x="108" y="144" width="110" height="8" rx="4" fill="#1f2b45" />
      <text x="48" y="188" fill={C.subtle} fontSize="11">
        Identity document · REF ••••-••••
      </text>

      {/* Encrypted, and not on any public path */}
      <g filter={`url(#${id}-goldGlow)`}>
        <rect
          x="298"
          y="90"
          width="232"
          height="54"
          rx="12"
          fill={`url(#${id}-card)`}
          stroke={C.goldDeep}
          strokeWidth="1.3"
        />
      </g>
      <rect x="318" y="106" width="16" height="14" rx="2.5" stroke={C.gold} strokeWidth="1.5" />
      <path d="M322 106 v-4 a4 4 0 0 1 8 0 v4" stroke={C.gold} strokeWidth="1.5" fill="none" />
      <text x="346" y="112" fill={C.fg} fontSize="12.5" fontWeight="600">
        Encrypted at rest
      </text>
      <text x="346" y="130" fill={C.subtle} fontSize="11">
        Never a public folder, never a CDN
      </text>

      {/* A link that dies */}
      <rect
        x="298"
        y="156"
        width="232"
        height="52"
        rx="12"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <text x="316" y="178" fill={C.subtle} fontSize="10.5" letterSpacing="0.5">
        ACCESS LINK
      </text>
      <text
        x="316"
        y="196"
        fill={C.muted}
        fontSize="12"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        ••••••••••••••••
      </text>
      <text x="512" y="190" fill={C.goldSoft} fontSize="12" fontWeight="600" textAnchor="end">
        expires 4:58
      </text>

      {/* Every open is written down */}
      <text x="30" y="242" fill={C.subtle} fontSize="10.5" letterSpacing="0.5">
        ACCESS LOG
      </text>
      {log.map((entry, i) => (
        <React.Fragment key={entry.action}>
          <rect
            x="30"
            y={252 + i * 40}
            width="500"
            height="32"
            rx="9"
            fill={`url(#${id}-well)`}
            stroke={C.line}
            strokeWidth="1.1"
          />
          <circle cx="50" cy={268 + i * 40} r="4" fill={i === 1 ? C.emerald : C.gold} />
          <text x="66" y={272 + i * 40} fill={C.muted} fontSize="12">
            {`${entry.role} ${entry.action} · REF ••••-••••`}
          </text>
          <text x="512" y={272 + i * 40} fill={C.subtle} fontSize="11" textAnchor="end">
            {`${entry.ago} ago`}
          </text>
        </React.Fragment>
      ))}

      <path d="M30 344 H530" stroke={C.line} strokeWidth="1" />
      <g filter={`url(#${id}-greenGlow)`}>
        <path
          d="M36 366 l6 6 l11 -12"
          stroke={C.emerald}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <text x="62" y="370" fill={C.emeraldSoft} fontSize="12">
        Reviewed by a person, and every access is recorded
      </text>
    </svg>
  );
}
