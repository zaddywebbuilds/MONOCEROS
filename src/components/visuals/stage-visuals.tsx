import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Stage artwork for the process section.
 *
 * One picture per stage of a subscription, drawn as SVG rather than sourced as
 * an image so it stays sharp at any size, weighs nothing and can be corrected
 * when the product changes.
 *
 * They are lit and layered like artwork — a warm light from the top left, cards
 * raised off the ground on soft shadows, glass surfaces graded from light to
 * dark — but everything they depict is true. Following the rule already set in
 * `illustrations.tsx`, they show the *mechanism* and never a fabricated
 * dashboard, balance, return or anybody's activity. What is drawn comes from the
 * platform itself: the registration fields, the five accepted identity
 * documents, the deposit network labels, and the real payment and withdrawal
 * status chains.
 */

const C = {
  line: "#1f2c48",
  lineSoft: "#17223a",
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
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Every panel shares one canvas and one lighting rig, so the eight read as a
 * set. Gradients and filters are referenced by id, and ids are global to the
 * document — eight panels sharing one id would all take the first panel's
 * definition — so each panel prefixes its own.
 */
function Panel({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 560 300"
      fill="none"
      role="img"
      aria-label={label}
      fontFamily={FONT}
      className={cn("h-auto w-full", className)}
    >
      <defs>
        {/* The ground the whole scene sits on. */}
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#0d1524" />
          <stop offset="100%" stopColor="#05080f" />
        </linearGradient>

        {/* A raised surface, lit from above. */}
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#16203a" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>

        {/* A recessed surface — inputs and wells sit below the plane. */}
        <linearGradient id={`${id}-well`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080d18" />
          <stop offset="100%" stopColor="#0d1424" />
        </linearGradient>

        {/* The warm light source, top left. */}
        <radialGradient id={`${id}-light`} cx="16%" cy="2%" r="86%">
          <stop offset="0%" stopColor="#d9ae5c" stopOpacity="0.17" />
          <stop offset="55%" stopColor="#d9ae5c" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#d9ae5c" stopOpacity="0" />
        </radialGradient>

        {/* The highlight it leaves along a top edge. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`${id}-goldFill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6c987" />
          <stop offset="100%" stopColor="#c9963f" />
        </linearGradient>

        <linearGradient id={`${id}-goldTint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3413" />
          <stop offset="100%" stopColor="#241a09" />
        </linearGradient>

        <linearGradient id={`${id}-greenTint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a4a3d" />
          <stop offset="100%" stopColor="#052620" />
        </linearGradient>

        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9963f" />
          <stop offset="100%" stopColor="#12c99b" />
        </linearGradient>

        {/* Cards lift off the ground. */}
        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        {/* Accents give off their own light. */}
        <filter id={`${id}-goldGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#d9ae5c" floodOpacity="0.5" />
        </filter>

        <filter id={`${id}-greenGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#12c99b" floodOpacity="0.5" />
        </filter>
      </defs>

      <rect x="0.75" y="0.75" width="558.5" height="298.5" rx="18" fill={`url(#${id}-ground)`} />
      <rect x="0.75" y="0.75" width="558.5" height="298.5" rx="18" fill={`url(#${id}-light)`} />
      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="298.5"
        rx="18"
        stroke={C.line}
        strokeWidth="1.5"
      />
      {/* The light catching the top edge of the panel. */}
      <path d="M22 1.5 H538" stroke={`url(#${id}-sheen)`} strokeWidth="1.5" />

      {children}
    </svg>
  );
}

function Title({ children, right }: { children: string; right?: string }) {
  return (
    <>
      <text x="32" y="40" fill={C.fg} fontSize="16" fontWeight="600">
        {children}
      </text>
      {right ? (
        <text x="528" y="40" fill={C.gold} fontSize="12.5" textAnchor="end" fontWeight="500">
          {right}
        </text>
      ) : null}
    </>
  );
}

/** A form field: a recessed well with its label resting inside, as on the real forms. */
function Field({
  id,
  x,
  y,
  w,
  label,
  value,
  mono,
  h = 40,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  label: string;
  value?: string;
  mono?: boolean;
  h?: number;
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="10"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      {/* The inner shadow along the top edge that makes a well look sunken. */}
      <path
        d={`M${x + 10} ${y + 1.2} H${x + w - 10}`}
        stroke="#000000"
        strokeOpacity="0.5"
        strokeWidth="1.4"
      />
      <text x={x + 15} y={y + h / 2 + 4.5} fill={C.subtle} fontSize="12.5">
        {label}
      </text>
      {value ? (
        <text
          x={x + w - 15}
          y={y + h / 2 + 4.5}
          fill={C.muted}
          fontSize={mono ? 13 : 12.5}
          fontFamily={mono ? MONO : FONT}
          textAnchor="end"
        >
          {value}
        </text>
      ) : null}
    </>
  );
}

function Pill({
  id,
  x,
  y,
  w,
  label,
  tone = "neutral",
  h = 28,
  size = 12,
  glow,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  label: string;
  tone?: "neutral" | "gold" | "emerald" | "ghost";
  h?: number;
  size?: number;
  glow?: boolean;
}) {
  const stroke = tone === "gold" ? C.goldDeep : tone === "emerald" ? C.emeraldDeep : C.line;
  const fill =
    tone === "gold"
      ? `url(#${id}-goldTint)`
      : tone === "emerald"
        ? `url(#${id}-greenTint)`
        : tone === "ghost"
          ? "none"
          : `url(#${id}-card)`;
  const text = tone === "gold" ? C.goldSoft : tone === "emerald" ? C.emeraldSoft : C.muted;
  const filter =
    glow && tone === "gold"
      ? `url(#${id}-goldGlow)`
      : glow && tone === "emerald"
        ? `url(#${id}-greenGlow)`
        : undefined;

  return (
    <g filter={filter}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeDasharray={tone === "ghost" ? "4 4" : undefined}
      />
      <text x={x + w / 2} y={y + h / 2 + 4} fill={text} fontSize={size} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/** A raised surface with the light catching its top edge. */
function Card({
  id,
  x,
  y,
  w,
  h,
  rx = 12,
  stroke = C.line,
  fill,
  glow,
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  stroke?: string;
  fill?: string;
  glow?: "gold" | "emerald";
}) {
  return (
    <g
      filter={
        glow === "gold"
          ? `url(#${id}-goldGlow)`
          : glow === "emerald"
            ? `url(#${id}-greenGlow)`
            : `url(#${id}-lift)`
      }
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={fill ?? `url(#${id}-card)`}
        stroke={stroke}
        strokeWidth="1.3"
      />
      <path
        d={`M${x + rx} ${y + 1.3} H${x + w - rx}`}
        stroke={`url(#${id}-sheen)`}
        strokeWidth="1.3"
      />
    </g>
  );
}

function Caption({ y, children }: { y: number; children: string }) {
  return (
    <text x="32" y={y} fill={C.subtle} fontSize="12">
      {children}
    </text>
  );
}

function Tick({
  x,
  y,
  colour = C.emerald,
  s = 1,
}: {
  x: number;
  y: number;
  colour?: string;
  s?: number;
}) {
  return (
    <path
      d={`M${x - 5 * s} ${y} l ${3.5 * s} ${3.5 * s} l ${6.5 * s} ${-7 * s}`}
      stroke={colour}
      strokeWidth={2 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

function Arrow({ d, marker, colour = C.line }: { d: string; marker: string; colour?: string }) {
  return (
    <path
      d={d}
      stroke={colour}
      strokeWidth="1.4"
      fill="none"
      markerEnd={`url(#${marker})`}
      strokeLinecap="round"
    />
  );
}

function ArrowHead({ id, colour = C.gold }: { id: string; colour?: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0 1 L9 5 L0 9 z" fill={colour} />
      </marker>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// 01 — Create account
// ---------------------------------------------------------------------------

export function CreateAccountPanel({ className }: { className?: string }) {
  const id = "s1";
  return (
    <Panel
      id={id}
      className={className}
      label="A registration form showing the name, date of birth, mobile number and email fields, followed by an email confirmation step"
    >
      <Title>Registration</Title>

      <Card id={id} x={20} y={54} w={520} h={224} rx={14} />

      <Field id={id} x={40} y={74} w={230} label="First name" />
      <Field id={id} x={290} y={74} w={230} label="Surname" />
      <Field id={id} x={40} y={124} w={230} label="Date of birth" />
      <Field id={id} x={290} y={124} w={230} label="Mobile number" />
      <Field id={id} x={40} y={174} w={480} label="Email address" />

      <g filter={`url(#${id}-goldGlow)`}>
        <rect x="40" y="226" width="180" height="42" rx="10" fill={`url(#${id}-goldFill)`} />
      </g>
      <text x="130" y="252" fill="#04060c" fontSize="13.5" fontWeight="600" textAnchor="middle">
        Create account
      </text>

      <rect
        x="240"
        y="226"
        width="280"
        height="42"
        rx="10"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <rect x="258" y="239" width="20" height="15" rx="3" stroke={C.muted} strokeWidth="1.3" />
      <path d="M258 241 l10 7 l10 -7" stroke={C.muted} strokeWidth="1.3" fill="none" />
      <text x="290" y="252" fill={C.muted} fontSize="12.5">
        Confirm your email
      </text>
      <g filter={`url(#${id}-greenGlow)`}>
        <Tick x={500} y={247} />
      </g>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 02 — Verify identity
// ---------------------------------------------------------------------------

const ID_DOCUMENTS = [
  "NIN slip",
  "National ID",
  "International passport",
  "Driver's licence",
  "Voter's card",
];

export function VerifyIdentityPanel({ className }: { className?: string }) {
  const id = "s2";
  return (
    <Panel
      id={id}
      className={className}
      label="An identity verification screen: a NIN field, an identity document, the five accepted document types, and a manual compliance review"
    >
      <Title>Identity verification</Title>

      <Field id={id} x={32} y={62} w={496} label="NIN" value="••• ••• ••• ••" mono />

      {/* The submitted document, tilted as though laid on the desk. */}
      <g transform="rotate(-2.6 148 172)">
        <Card id={id} x={32} y={118} w={232} h={108} />
        <rect
          x="48"
          y="134"
          width="52"
          height="62"
          rx="8"
          fill={`url(#${id}-well)`}
          stroke={C.lineSoft}
        />
        <circle cx="74" cy="157" r="10" fill="#26344f" />
        <path d="M58 188 a16 13 0 0 1 32 0" fill="#26344f" />
        <rect x="114" y="140" width="104" height="9" rx="4.5" fill="#26344f" />
        <rect x="114" y="158" width="78" height="9" rx="4.5" fill="#1d283f" />
        <rect x="114" y="176" width="120" height="9" rx="4.5" fill="#1d283f" />
        <text x="48" y="214" fill={C.subtle} fontSize="11.5">
          Identity document
        </text>
      </g>

      {ID_DOCUMENTS.map((doc, i) => (
        <Pill
          key={doc}
          id={id}
          x={288}
          y={118 + i * 30}
          w={240}
          h={24}
          size={11.5}
          label={doc}
          tone={i === 0 ? "gold" : "neutral"}
          glow={i === 0}
        />
      ))}

      <Pill id={id} x={32} y={240} w={232} label="Reviewed by a person" tone="gold" size={11.5} />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 03 — Choose package
// ---------------------------------------------------------------------------

export function ChoosePackagePanel({
  className,
  durationDays = 30,
}: {
  className?: string;
  durationDays?: number;
}) {
  const id = "s3";
  const tiers = [0.42, 0.68, 1];

  return (
    <Panel
      id={id}
      className={className}
      label="Three investment packages of increasing capital, one selected and raised, with the term recorded on the investment"
    >
      <Title>Investment packages</Title>

      {tiers.map((ratio, i) => {
        const x = 32 + i * 174;
        const selected = i === 1;
        // The chosen tier lifts off the row, the way a picked card would.
        const y = selected ? 56 : 68;
        const h = selected ? 190 : 168;

        return (
          <React.Fragment key={i}>
            <Card
              id={id}
              x={x}
              y={y}
              w={148}
              h={h}
              stroke={selected ? C.goldDeep : C.line}
              glow={selected ? "gold" : undefined}
            />
            <rect x={x + 16} y={y + 20} width="64" height="10" rx="5" fill="#26344f" />
            {selected ? (
              <>
                <circle
                  cx={x + 126}
                  cy={y + 25}
                  r="9"
                  fill={`url(#${id}-goldTint)`}
                  stroke={C.goldDeep}
                />
                <Tick x={x + 126} y={y + 25} colour={C.goldSoft} s={0.8} />
              </>
            ) : null}

            <text x={x + 16} y={y + 62} fill={C.subtle} fontSize="11">
              Capital
            </text>
            <rect x={x + 16} y={y + 70} width="116" height="8" rx="4" fill="#111a2c" />
            <rect
              x={x + 16}
              y={y + 70}
              width={116 * ratio}
              height="8"
              rx="4"
              fill={selected ? `url(#${id}-goldFill)` : "#2b3a5c"}
            />

            <text x={x + 16} y={y + 104} fill={C.subtle} fontSize="11">
              Return
            </text>
            <rect x={x + 16} y={y + 112} width="116" height="8" rx="4" fill="#111a2c" />
            <rect
              x={x + 16}
              y={y + 112}
              width={116 * (0.5 + ratio * 0.45)}
              height="8"
              rx="4"
              fill={selected ? `url(#${id}-goldFill)` : "#2b3a5c"}
            />

            <text x={x + 16} y={y + 150} fill={selected ? C.goldSoft : C.muted} fontSize="12">
              {durationDays}-day term
            </text>
          </React.Fragment>
        );
      })}

      <Caption y={272}>Its terms are recorded on your investment the moment you subscribe.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 04 — Pay with USDT
// ---------------------------------------------------------------------------

export function PayWithUsdtPanel({ className }: { className?: string }) {
  const id = "s4";
  return (
    <Panel
      id={id}
      className={className}
      label="A USDT payment screen: a choice of network, the company wallet address, and a field for the transaction hash"
    >
      <Title right="USDT">Payment</Title>

      <Pill
        id={id}
        x={32}
        y={62}
        w={168}
        h={32}
        label="TRC-20 (Tron)"
        tone="gold"
        glow
      />
      <Pill id={id} x={212} y={62} w={214} h={32} label="BEP-20 (BNB Smart Chain)" />

      <text x="32" y="128" fill={C.subtle} fontSize="11.5">
        Company wallet address
      </text>
      {/* Masked deliberately: a live receiving address must never appear in artwork. */}
      <rect
        x="32"
        y="136"
        width="496"
        height="46"
        rx="10"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <path d="M42 137.2 H518" stroke="#000000" strokeOpacity="0.5" strokeWidth="1.4" />
      <text x="50" y="165" fill={C.muted} fontSize="14" fontFamily={MONO} letterSpacing="1.5">
        T•••••••••••••••••••••••••••
      </text>
      <rect x="482" y="150" width="14" height="17" rx="3" stroke={C.gold} strokeWidth="1.3" />
      <rect
        x="488"
        y="155"
        width="14"
        height="17"
        rx="3"
        fill="#0b1220"
        stroke={C.gold}
        strokeWidth="1.3"
      />

      <text x="32" y="206" fill={C.subtle} fontSize="11.5">
        Transaction hash
      </text>
      <Field id={id} x={32} y={214} w={496} h={44} label="Paste the hash of your transfer" />

      <Caption y={282}>Send the exact amount on the network shown, then submit the hash.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 05 — Payment verified
// ---------------------------------------------------------------------------

export function PaymentVerifiedPanel({ className }: { className?: string }) {
  const id = "s5";
  const stages = [
    { label: "Submitted", tone: "neutral" as const },
    { label: "Under review", tone: "gold" as const },
    { label: "Approved", tone: "emerald" as const },
  ];

  return (
    <Panel
      id={id}
      className={className}
      label="The payment status chain: submitted, then under review, then approved, with rejection shown as the alternative outcome"
    >
      <ArrowHead id={`${id}-head`} colour={C.line} />
      <Title>Payment review</Title>

      {stages.map((stage, i) => {
        const x = 32 + i * 178;
        const stroke =
          stage.tone === "gold" ? C.goldDeep : stage.tone === "emerald" ? C.emeraldDeep : C.line;
        const text =
          stage.tone === "gold" ? C.goldSoft : stage.tone === "emerald" ? C.emeraldSoft : C.muted;
        const fill =
          stage.tone === "gold"
            ? `url(#${id}-goldTint)`
            : stage.tone === "emerald"
              ? `url(#${id}-greenTint)`
              : undefined;

        return (
          <React.Fragment key={stage.label}>
            <Card
              id={id}
              x={x}
              y={76}
              w={140}
              h={60}
              stroke={stroke}
              fill={fill}
              glow={stage.tone === "emerald" ? "emerald" : undefined}
            />
            <text x={x + 70} y={i === 2 ? 104 : 111} fill={text} fontSize="13" textAnchor="middle">
              {stage.label}
            </text>
            {i === 2 ? <Tick x={x + 70} y={118} /> : null}
            {i < 2 ? <Arrow marker={`${id}-head`} d={`M${x + 148} 106 L ${x + 170} 106`} /> : null}
          </React.Fragment>
        );
      })}

      {/* The honest alternative: review can also decline, and you are told why. */}
      <Arrow marker={`${id}-head`} d="M280 144 L 280 182 L 368 182" />
      <Pill id={id} x={376} y={168} w={152} label="Rejected, with a reason" tone="ghost" size={11} />

      <circle cx="46" cy="230" r="13" fill={`url(#${id}-card)`} stroke={C.line} />
      <circle cx="46" cy="226" r="4.5" fill="#26344f" />
      <path d="M38 238 a8 7 0 0 1 16 0" fill="#26344f" />
      <text x="70" y="234" fill={C.muted} fontSize="12.5">
        Checked against the company wallet by the finance team
      </text>

      <Caption y={274}>You are notified as soon as a decision is made.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 06 — The weekly cycle
// ---------------------------------------------------------------------------

export function CyclePanel({
  className,
  dayName = "Friday",
  time = "00:00",
}: {
  className?: string;
  dayName?: string;
  time?: string;
}) {
  const id = "s6";
  const letters = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];
  const gap = 6;
  const cellW = (496 - gap * 13) / 14;
  const cx = (i: number) => 32 + i * (cellW + gap) + cellW / 2;

  return (
    <Panel
      id={id}
      className={className}
      label={`Two weeks of the calendar with both ${dayName}s lit: a subscription approved before the cutoff joins the ${dayName} about to open, one approved after it waits for the following ${dayName}`}
    >
      <ArrowHead id={`${id}-head`} colour={C.gold} />
      <Title right={`Opens ${time} WAT`}>Weekly investment cycle</Title>

      <Pill id={id} x={32} y={58} w={162} label="Approved before" tone="gold" size={11.5} glow />
      <Arrow marker={`${id}-head`} d={`M${cx(4)} 90 L ${cx(4)} 118`} colour={C.gold} />

      {letters.map((letter, i) => {
        const isCycleDay = i === 4 || i === 11;
        const x = 32 + i * (cellW + gap);
        return (
          <React.Fragment key={i}>
            <text
              x={cx(i)}
              y="128"
              fill={isCycleDay ? C.goldSoft : C.subtle}
              fontSize="11"
              textAnchor="middle"
              fontWeight={isCycleDay ? 600 : 400}
            >
              {letter}
            </text>
            {isCycleDay ? (
              <g filter={`url(#${id}-goldGlow)`}>
                <rect
                  x={x}
                  y="136"
                  width={cellW}
                  height="46"
                  rx="8"
                  fill={`url(#${id}-goldTint)`}
                  stroke={C.goldDeep}
                  strokeWidth="1.5"
                />
              </g>
            ) : (
              <rect
                x={x}
                y="136"
                width={cellW}
                height="46"
                rx="8"
                fill={`url(#${id}-well)`}
                stroke={C.line}
                strokeWidth="1"
              />
            )}
            {isCycleDay ? <circle cx={cx(i)} cy="159" r="4" fill={C.gold} /> : null}
          </React.Fragment>
        );
      })}

      <Arrow marker={`${id}-head`} d={`M${cx(11)} 212 L ${cx(11)} 188`} colour={C.gold} />
      <Pill id={id} x={330} y={214} w={198} label="Approved at or after" size={11.5} />

      <Caption y={266}>{`A cycle opens every ${dayName} at ${time} West Africa Time.`}</Caption>
      <Caption y={284}>{`Miss it and your subscription waits for the following ${dayName}.`}</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 07 — The term
// ---------------------------------------------------------------------------

export function TermPanel({
  className,
  durationDays = 30,
}: {
  className?: string;
  durationDays?: number;
}) {
  const id = "s7";
  const days = Math.min(Math.max(durationDays, 1), 40);
  const cols = 10;
  const rows = Math.ceil(days / cols);
  const gap = 8;
  const cellW = (496 - gap * (cols - 1)) / cols;
  const cellH = 30;
  const railY = 64 + rows * (cellH + gap) + 14;

  return (
    <Panel
      id={id}
      className={className}
      label={`A ${durationDays}-day term drawn as one square per day, warming from the cycle opening through to maturity`}
    >
      <Title right={`${durationDays} days`}>Investment term</Title>

      {Array.from({ length: days }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const t = days > 1 ? i / (days - 1) : 1;
        const last = i === days - 1;
        return (
          <g key={i} filter={last ? `url(#${id}-greenGlow)` : undefined}>
            <rect
              x={32 + col * (cellW + gap)}
              y={64 + row * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="7"
              fill={`url(#${id}-well)`}
              stroke={C.line}
              strokeWidth="1.1"
            />
            {/* The day squares warm from gold at the open to green at maturity. */}
            <rect
              x={32 + col * (cellW + gap)}
              y={64 + row * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="7"
              fill={`url(#${id}-bar)`}
              opacity={0.1 + t * 0.5}
            />
          </g>
        );
      })}

      <rect x="32" y={railY} width="496" height="6" rx="3" fill="#111a2c" />
      <g filter={`url(#${id}-goldGlow)`}>
        <rect x="32" y={railY} width="496" height="6" rx="3" fill={`url(#${id}-bar)`} />
      </g>
      <circle cx="35" cy={railY + 3} r="5" fill={C.gold} />
      <circle cx="525" cy={railY + 3} r="5" fill={C.emerald} />

      <text x="32" y={railY + 30} fill={C.goldSoft} fontSize="12">
        Cycle opens
      </text>
      <text x="528" y={railY + 30} fill={C.emeraldSoft} fontSize="12" textAnchor="end">
        Maturity
      </text>

      <Caption y={288}>Your dashboard counts this down for you, day by day.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 08 — Withdraw or rollover
// ---------------------------------------------------------------------------

export function MaturityPanel({
  className,
  dayName = "Friday",
}: {
  className?: string;
  dayName?: string;
}) {
  const id = "s8";
  const withdrawal = ["Under review", "Approved", "Paid"];

  return (
    <Panel
      id={id}
      className={className}
      label={`At maturity the choice splits two ways: withdraw, which moves through review, approval and payment, or roll over into the next ${dayName} cycle`}
    >
      <ArrowHead id={`${id}-head`} colour={C.line} />
      <Title>At maturity</Title>

      <Card
        id={id}
        x={32}
        y={122}
        w={132}
        h={58}
        stroke={C.emeraldDeep}
        fill={`url(#${id}-greenTint)`}
        glow="emerald"
      />
      <circle cx="56" cy="151" r="4" fill={C.emerald} />
      <text x="70" y="156" fill={C.emeraldSoft} fontSize="13">
        Matured
      </text>

      <Arrow marker={`${id}-head`} d="M164 151 L 196 151 L 196 106 L 228 106" />
      <Arrow marker={`${id}-head`} d="M164 151 L 196 151 L 196 208 L 228 208" />

      {/* Withdraw */}
      <Card id={id} x={236} y={64} w={292} h={84} />
      <text x="256" y="92" fill={C.fg} fontSize="13.5" fontWeight="600">
        Withdraw
      </text>
      {withdrawal.map((step, i) => (
        <Pill
          key={step}
          id={id}
          x={256 + i * 88}
          y={106}
          w={78}
          h={24}
          size={10.5}
          label={step}
          tone={i === 2 ? "emerald" : "neutral"}
          glow={i === 2}
        />
      ))}

      {/* Rollover */}
      <Card id={id} x={236} y={166} w={292} h={84} stroke={C.goldDeep} glow="gold" />
      <text x="256" y="194" fill={C.fg} fontSize="13.5" fontWeight="600">
        Rollover
      </text>
      <path
        d="M262 222 a12 12 0 1 1 8 12"
        stroke={C.gold}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M258 216 l4 6 l7 -3"
        stroke={C.gold}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <text x="296" y="228" fill={C.goldSoft} fontSize="12">
        {`Into the next ${dayName} cycle`}
      </text>

      <Caption y={284}>The choice is yours, and nothing happens until you make it.</Caption>
    </Panel>
  );
}
