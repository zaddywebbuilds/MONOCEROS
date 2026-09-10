import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Raising a ticket, acted out.
 *
 * One loop covers the whole thing: the compose form fills in, Submit is pressed,
 * the ticket flies out as an email, and it lands in the log with a reference and
 * a status. It is a drawing of the flow, not a recording of one — the reference
 * is masked and no real ticket, address or person appears.
 *
 * Every beat is a slice of a single shared timeline rather than a chain of
 * delays, so the steps cannot drift out of order however long it runs. Motion is
 * paused until the section is in view, and each keyframe ends on its finished
 * state so reduced motion leaves a completed picture.
 */
export function SupportSequence({ className }: { className?: string }) {
  const id = "sup";

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

  return (
    <svg
      viewBox="0 0 560 340"
      fill="none"
      role="img"
      aria-label="A support ticket being written and submitted, sent on as an email, and appearing in the ticket log with its own reference"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="0.75" y="0.75" width="558.5" height="338.5" rx="18" />
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
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.18" />
          <stop offset="60%" stopColor={C.gold} stopOpacity="0.03" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.goldSoft} />
          <stop offset="100%" stopColor={C.goldDeep} />
        </linearGradient>
        <linearGradient id={`${id}-btn`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6c987" />
          <stop offset="100%" stopColor="#c9963f" />
        </linearGradient>
        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id={`${id}-goldGlow`} x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={C.gold} floodOpacity="0.5" />
        </filter>
        <filter id={`${id}-greenGlow`} x="-70%" y="-70%" width="240%" height="240%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={C.emerald} floodOpacity="0.5" />
        </filter>
      </defs>

      <rect x="0.75" y="0.75" width="558.5" height="338.5" rx="18" fill={`url(#${id}-ground)`} />
      <rect x="0.75" y="0.75" width="558.5" height="338.5" rx="18" fill={`url(#${id}-light)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="5" height="340" fill={`url(#${id}-edge)`} />
      </g>
      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="338.5"
        rx="18"
        stroke={C.line}
        strokeWidth="1.5"
      />
      <path d="M22 1.5 H538" stroke={`url(#${id}-sheen)`} strokeWidth="1.5" />

      <circle cx="32" cy="31" r="3.5" fill={C.gold} />
      <text x="44" y="35" fill={C.goldSoft} fontSize="10.5" fontWeight="600" letterSpacing="1.4">
        SUPPORT
      </text>
      <text x="30" y="66" fill={C.fg} fontSize="17.5" fontWeight="600">
        Raise a ticket
      </text>

      {/* Compose */}
      <g filter={`url(#${id}-lift)`}>
        <rect
          x="30"
          y="88"
          width="268"
          height="176"
          rx="12"
          fill={`url(#${id}-card)`}
          stroke={C.line}
          strokeWidth="1.3"
        />
      </g>

      <text x="48" y="112" fill={C.subtle} fontSize="10" letterSpacing="0.6">
        SUBJECT
      </text>
      <rect
        x="48"
        y="120"
        width="232"
        height="28"
        rx="7"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.1"
      />
      <rect
        x="60"
        y="131"
        width="150"
        height="6"
        rx="3"
        fill="#3a4a6b"
        className="support-anim support-type"
      />

      <text x="48" y="170" fill={C.subtle} fontSize="10" letterSpacing="0.6">
        MESSAGE
      </text>
      <rect
        x="48"
        y="178"
        width="232"
        height="52"
        rx="7"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.1"
      />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x="60"
          y={190 + i * 13}
          width={[196, 168, 124][i]}
          height="6"
          rx="3"
          fill="#2c3c5c"
          className="support-anim support-type"
          style={{ animationDelay: `${0.25 + i * 0.22}s` }}
        />
      ))}
      <rect
        x="186"
        y="216"
        width="1.6"
        height="10"
        fill={C.goldSoft}
        className="support-anim support-caret"
      />

      {/* Submit */}
      <g className="support-anim support-press">
        <g filter={`url(#${id}-goldGlow)`}>
          <rect x="188" y="240" width="92" height="30" rx="8" fill={`url(#${id}-btn)`} />
        </g>
        <text x="234" y="259" fill="#04060c" fontSize="12" fontWeight="600" textAnchor="middle">
          Submit
        </text>
      </g>

      {/* The ticket leaving as mail */}
      <g className="support-anim support-send">
        <rect
          x="250"
          y="238"
          width="34"
          height="24"
          rx="4"
          fill="#0b1220"
          stroke={C.goldSoft}
          strokeWidth="1.4"
        />
        <path d="M250 240 l17 12 l17 -12" stroke={C.goldSoft} strokeWidth="1.4" fill="none" />
      </g>

      {/* Where it arrives */}
      <text x="330" y="112" fill={C.subtle} fontSize="10" letterSpacing="0.6">
        YOUR TICKETS
      </text>

      <g className="support-anim support-land">
        <g filter={`url(#${id}-lift)`}>
          <rect
            x="330"
            y="120"
            width="200"
            height="58"
            rx="10"
            fill={`url(#${id}-card)`}
            stroke={C.goldDeep}
            strokeWidth="1.3"
          />
        </g>
        <text x="346" y="142" fill={C.fg} fontSize="12" fontWeight="600">
          REF ••••-••••
        </text>
        <g className="support-anim support-status">
          <rect
            x="346"
            y="150"
            width="60"
            height="18"
            rx="9"
            fill="#4d3614"
            stroke={C.goldDeep}
            strokeWidth="1"
          />
          <text x="376" y="163" fill={C.goldSoft} fontSize="9.5" textAnchor="middle">
            Open
          </text>
        </g>
        <text x="514" y="163" fill={C.subtle} fontSize="10" textAnchor="end">
          just now
        </text>
      </g>

      {/* The email that goes out alongside it */}
      <g className="support-anim support-land" style={{ animationDelay: "0.35s" }}>
        <rect
          x="330"
          y="190"
          width="200"
          height="52"
          rx="10"
          fill={`url(#${id}-well)`}
          stroke={C.line}
          strokeWidth="1.2"
        />
        <rect x="348" y="206" width="18" height="14" rx="2.5" stroke={C.emeraldSoft} strokeWidth="1.3" />
        <path d="M348 207 l9 6 l9 -6" stroke={C.emeraldSoft} strokeWidth="1.3" fill="none" />
        <text x="378" y="211" fill={C.fg} fontSize="11.5">
          Confirmation emailed
        </text>
        <text x="378" y="227" fill={C.subtle} fontSize="10">
          A copy of what you sent
        </text>
        <g filter={`url(#${id}-greenGlow)`}>
          <path
            d="M508 210 l4 4 l8 -8"
            stroke={C.emerald}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>

      <path d="M30 286 H530" stroke={C.line} strokeWidth="1" />
      <text x="30" y="310" fill={C.muted} fontSize="11.5">
        Every reply is kept on the ticket, so the whole exchange stays in one place.
      </text>
    </svg>
  );
}
