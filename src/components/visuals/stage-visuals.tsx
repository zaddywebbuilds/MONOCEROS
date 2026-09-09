import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Stage artwork for the process section.
 *
 * One card per stage of a subscription, drawn as SVG so it stays sharp at any
 * size, weighs nothing, and can be corrected when the product changes.
 *
 * They are built like product cards — an accent edge, a category line, a bold
 * title, and verified facts ticked off at the foot — and lit like artwork, with
 * a warm light top left, surfaces raised on soft shadows and accents that give
 * off their own glow.
 *
 * Everything they show is true. Following the rule set in `illustrations.tsx`,
 * they depict the mechanism and never fabricate a dashboard, a balance, a
 * return or anybody's activity. There is deliberately no "live" badge, no
 * elapsed-time stamp and no count of other investors: manufactured urgency has
 * no place on a page where somebody is about to send real money. Where a card
 * shows figures or a date they are the real ones, passed in from the database
 * and the cycle schedule.
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

export interface PanelPackage {
  name: string;
  capital: string;
  returnPct: string;
  maturity: string;
  badge?: string | null;
}

/** A fact the card ticks off. Only ever something the platform actually does. */
type Check = string;

/**
 * The shared card. Gradients, filters and clip paths are referenced by id, and
 * ids are global to the document — eight cards sharing one id would all take
 * the first card's definition — so each prefixes its own.
 */
function Panel({
  id,
  label,
  accent = "gold",
  kicker,
  title,
  right,
  checks = [],
  className,
  children,
}: {
  id: string;
  label: string;
  accent?: "gold" | "emerald";
  kicker: string;
  title: string;
  right?: string;
  checks?: Check[];
  className?: string;
  children: React.ReactNode;
}) {
  const edge = accent === "emerald" ? C.emerald : C.gold;
  const edgeSoft = accent === "emerald" ? C.emeraldSoft : C.goldSoft;

  return (
    <svg
      viewBox="0 0 560 360"
      fill="none"
      role="img"
      aria-label={label}
      fontFamily={FONT}
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="0.75" y="0.75" width="558.5" height="358.5" rx="18" />
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
          <stop offset="0%" stopColor={edge} stopOpacity="0.2" />
          <stop offset="55%" stopColor={edge} stopOpacity="0.04" />
          <stop offset="100%" stopColor={edge} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={edgeSoft} />
          <stop offset="100%" stopColor={accent === "emerald" ? C.emeraldDeep : C.goldDeep} />
        </linearGradient>

        <linearGradient id={`${id}-goldFill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6c987" />
          <stop offset="100%" stopColor="#c9963f" />
        </linearGradient>

        <linearGradient id={`${id}-goldTint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d3614" />
          <stop offset="100%" stopColor="#241a09" />
        </linearGradient>

        <linearGradient id={`${id}-greenTint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b5042" />
          <stop offset="100%" stopColor="#052620" />
        </linearGradient>

        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9963f" />
          <stop offset="100%" stopColor="#12c99b" />
        </linearGradient>

        <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000000" floodOpacity="0.6" />
        </filter>
        <filter id={`${id}-goldGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#d9ae5c" floodOpacity="0.5" />
        </filter>
        <filter id={`${id}-greenGlow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#12c99b" floodOpacity="0.5" />
        </filter>
      </defs>

      <rect x="0.75" y="0.75" width="558.5" height="358.5" rx="18" fill={`url(#${id}-ground)`} />
      <rect x="0.75" y="0.75" width="558.5" height="358.5" rx="18" fill={`url(#${id}-light)`} />

      {/* The accent edge that gives the card its category at a glance. */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="5" height="360" fill={`url(#${id}-edge)`} />
      </g>

      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="358.5"
        rx="18"
        stroke={C.line}
        strokeWidth="1.5"
      />
      <path d="M22 1.5 H538" stroke={`url(#${id}-sheen)`} strokeWidth="1.5" />

      <circle cx="32" cy="31" r="3.5" fill={edge} />
      <text
        x="44"
        y="35"
        fill={edgeSoft}
        fontSize="10.5"
        fontWeight="600"
        letterSpacing="1.4"
      >
        {kicker.toUpperCase()}
      </text>

      <text x="30" y="66" fill={C.fg} fontSize="17.5" fontWeight="600">
        {title}
      </text>
      {right ? (
        <text x="530" y="66" fill={edgeSoft} fontSize="12.5" textAnchor="end" fontWeight="500">
          {right}
        </text>
      ) : null}

      {children}

      {checks.length ? (
        <>
          <path d="M30 302 H530" stroke={C.line} strokeWidth="1" />
          {checks.map((check, i) => (
            <React.Fragment key={check}>
              <Tick x={41} y={322 + i * 22} s={0.9} />
              <text x={56} y={326 + i * 22} fill={C.emeraldSoft} fontSize="12">
                {check}
              </text>
            </React.Fragment>
          ))}
        </>
      ) : null}
    </svg>
  );
}

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
      kicker="Step 01 · Your details"
      title="Registration"
      label="A registration form showing the name, date of birth, mobile number and email fields, followed by an email confirmation step"
      checks={[
        "A confirmation link is emailed the moment you register",
        "Confirming it is required before you can subscribe",
      ]}
    >
      <Field id={id} x={30} y={90} w={240} label="First name" />
      <Field id={id} x={290} y={90} w={240} label="Surname" />
      <Field id={id} x={30} y={140} w={240} label="Date of birth" />
      <Field id={id} x={290} y={140} w={240} label="Mobile number" />
      <Field id={id} x={30} y={190} w={500} label="Email address" />

      <g filter={`url(#${id}-goldGlow)`}>
        <rect x="30" y="242" width="190" height="44" rx="10" fill={`url(#${id}-goldFill)`} />
      </g>
      <text x="125" y="269" fill="#04060c" fontSize="13.5" fontWeight="600" textAnchor="middle">
        Create account
      </text>

      <rect
        x="240"
        y="242"
        width="290"
        height="44"
        rx="10"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <rect x="258" y="256" width="20" height="15" rx="3" stroke={C.muted} strokeWidth="1.3" />
      <path d="M258 258 l10 7 l10 -7" stroke={C.muted} strokeWidth="1.3" fill="none" />
      <text x="290" y="269" fill={C.muted} fontSize="12.5">
        Confirm your email
      </text>
      <g filter={`url(#${id}-greenGlow)`}>
        <Tick x={510} y={264} />
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
      kicker="Step 02 · Compliance"
      title="Identity verification"
      label="An identity verification screen: a NIN field, an identity document, and the five accepted document types"
      checks={[
        "Reviewed by a person, not an automated score",
        "Stored privately — never a public folder, never a CDN",
      ]}
    >
      <Field id={id} x={30} y={90} w={500} label="NIN" value="••• ••• ••• ••" mono />

      <g transform="rotate(-2.6 148 200)">
        <Card id={id} x={30} y={146} w={236} h={110} />
        <rect
          x="46"
          y="162"
          width="54"
          height="64"
          rx="8"
          fill={`url(#${id}-well)`}
          stroke={C.lineSoft}
        />
        <circle cx="73" cy="186" r="10" fill="#2c3c5c" />
        <path d="M57 218 a16 13 0 0 1 32 0" fill="#2c3c5c" />
        <rect x="114" y="168" width="106" height="9" rx="4.5" fill="#2c3c5c" />
        <rect x="114" y="186" width="80" height="9" rx="4.5" fill="#1f2b45" />
        <rect x="114" y="204" width="122" height="9" rx="4.5" fill="#1f2b45" />
        <text x="46" y="244" fill={C.subtle} fontSize="11.5">
          Identity document
        </text>
      </g>

      {ID_DOCUMENTS.map((doc, i) => (
        <Pill
          key={doc}
          id={id}
          x={290}
          y={146 + i * 29}
          w={240}
          h={24}
          size={11.5}
          label={doc}
          tone={i === 0 ? "gold" : "neutral"}
          glow={i === 0}
        />
      ))}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 03 — Choose package
// ---------------------------------------------------------------------------

export function ChoosePackagePanel({
  className,
  durationDays = 30,
  packages = [],
}: {
  className?: string;
  durationDays?: number;
  /** The real active packages. Falls back to unlabelled tiers if none are set up. */
  packages?: PanelPackage[];
}) {
  const id = "s3";
  const shown = packages.slice(0, 3);
  const featured = Math.max(
    shown.findIndex((p) => p.badge),
    0,
  );

  return (
    <Panel
      id={id}
      className={className}
      kicker="Step 03 · Packages"
      title="Investment packages"
      right={
        packages.length > 3
          ? `${packages.length} packages · ${durationDays}-day term`
          : `${durationDays}-day term`
      }
      label="The available investment packages, showing the capital, return and maturity value of each"
      checks={["Terms are recorded on your investment the moment you subscribe"]}
    >
      {packages.length > shown.length ? (
        <text x={528} y={296} fill={C.goldSoft} fontSize="11.5" textAnchor="end">
          {`+${packages.length - shown.length} more`}
        </text>
      ) : null}

      {(shown.length ? shown : [null, null, null]).map((pkg, i) => {
        const x = 30 + i * 172;
        const selected = i === featured;
        const y = selected ? 88 : 98;
        const h = selected ? 196 : 176;

        return (
          <React.Fragment key={pkg?.name ?? i}>
            <Card
              id={id}
              x={x}
              y={y}
              w={156}
              h={h}
              stroke={selected ? C.goldDeep : C.line}
              glow={selected ? "gold" : undefined}
            />

            {pkg ? (
              <text x={x + 16} y={y + 28} fill={C.fg} fontSize="13" fontWeight="600">
                {pkg.name}
              </text>
            ) : (
              <rect x={x + 16} y={y + 18} width="68" height="10" rx="5" fill="#2c3c5c" />
            )}

            <text x={x + 16} y={y + 58} fill={C.subtle} fontSize="10.5" letterSpacing="0.6">
              CAPITAL
            </text>
            {pkg ? (
              <text x={x + 16} y={y + 82} fill={C.fg} fontSize="19" fontWeight="600">
                {pkg.capital}
              </text>
            ) : (
              <rect x={x + 16} y={y + 68} width="96" height="12" rx="6" fill="#2c3c5c" />
            )}

            <text x={x + 16} y={y + 112} fill={C.subtle} fontSize="10.5" letterSpacing="0.6">
              RETURN
            </text>
            {pkg ? (
              <text x={x + 16} y={y + 132} fill={C.goldSoft} fontSize="14.5" fontWeight="600">
                {pkg.returnPct}
              </text>
            ) : (
              <rect x={x + 16} y={y + 120} width="60" height="10" rx="5" fill="#2c3c5c" />
            )}

            <text x={x + 16} y={y + 158} fill={C.subtle} fontSize="10.5" letterSpacing="0.6">
              AT MATURITY
            </text>
            {pkg ? (
              <text x={x + 16} y={y + 178} fill={C.emeraldSoft} fontSize="14.5" fontWeight="600">
                {pkg.maturity}
              </text>
            ) : (
              <rect x={x + 16} y={y + 166} width="78" height="10" rx="5" fill="#2c3c5c" />
            )}

            {selected && pkg?.badge ? (
              <Pill
                id={id}
                x={x + 92}
                y={y + 14}
                w={50}
                h={20}
                size={9}
                label={pkg.badge}
                tone="gold"
              />
            ) : null}
          </React.Fragment>
        );
      })}
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
      kicker="Step 04 · Payment"
      title="Pay with USDT"
      right="USDT"
      label="A USDT payment screen: a choice of network, the company wallet address, and a field for the transaction hash"
      checks={[
        "TRC-20 and BEP-20 are both supported",
        "The address shown changes with the network you pick",
      ]}
    >
      <Pill id={id} x={30} y={90} w={176} h={34} label="TRC-20 (Tron)" tone="gold" glow />
      <Pill id={id} x={218} y={90} w={224} h={34} label="BEP-20 (BNB Smart Chain)" />

      <text x="30" y="156" fill={C.subtle} fontSize="11.5" letterSpacing="0.5">
        COMPANY WALLET ADDRESS
      </text>
      {/* Masked deliberately: a live receiving address must never appear in artwork. */}
      <rect
        x="30"
        y="164"
        width="500"
        height="48"
        rx="10"
        fill={`url(#${id}-well)`}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <path d="M40 165.2 H520" stroke="#000000" strokeOpacity="0.5" strokeWidth="1.4" />
      <text x="48" y="194" fill={C.muted} fontSize="14" fontFamily={MONO} letterSpacing="1.5">
        T•••••••••••••••••••••••••••
      </text>
      <rect x="484" y="179" width="14" height="17" rx="3" stroke={C.gold} strokeWidth="1.3" />
      <rect
        x="490"
        y="184"
        width="14"
        height="17"
        rx="3"
        fill="#0b1220"
        stroke={C.gold}
        strokeWidth="1.3"
      />

      <text x="30" y="238" fill={C.subtle} fontSize="11.5" letterSpacing="0.5">
        TRANSACTION HASH
      </text>
      <Field id={id} x={30} y={246} w={500} h={44} label="Paste the hash of your transfer" />
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
      accent="emerald"
      kicker="Step 05 · Verification"
      title="Payment review"
      label="The payment status chain: submitted, then under review, then approved, with rejection shown as the alternative outcome"
      checks={["You are notified either way, as soon as it is decided"]}
    >
      <ArrowHead id={`${id}-head`} colour={C.line} />

      {stages.map((stage, i) => {
        const x = 30 + i * 174;
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
              y={100}
              w={152}
              h={62}
              stroke={stroke}
              fill={fill}
              glow={stage.tone === "emerald" ? "emerald" : undefined}
            />
            <text x={x + 76} y={i === 2 ? 129 : 136} fill={text} fontSize="13" textAnchor="middle">
              {stage.label}
            </text>
            {i === 2 ? <Tick x={x + 76} y={143} /> : null}
            {i < 2 ? <Arrow marker={`${id}-head`} d={`M${x + 160} 131 L ${x + 166} 131`} /> : null}
          </React.Fragment>
        );
      })}

      {/* The honest alternative: review can also decline, and you are told why. */}
      <Arrow marker={`${id}-head`} d="M280 170 L 280 208 L 366 208" />
      <Pill id={id} x={374} y={194} w={156} label="Rejected, with a reason" tone="ghost" size={11} />

      <circle cx="44" cy="256" r="13" fill={`url(#${id}-card)`} stroke={C.line} />
      <circle cx="44" cy="252" r="4.5" fill="#2c3c5c" />
      <path d="M36 264 a8 7 0 0 1 16 0" fill="#2c3c5c" />
      <text x="68" y="260" fill={C.muted} fontSize="12.5">
        Checked against the company wallet by the finance team
      </text>
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
  nextCycle,
}: {
  className?: string;
  dayName?: string;
  time?: string;
  /** The genuine next cycle, from the schedule. No invented countdowns. */
  nextCycle?: { label: string; away: string };
}) {
  const id = "s6";
  const letters = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];
  const gap = 6;
  const cellW = (500 - gap * 13) / 14;
  const cx = (i: number) => 30 + i * (cellW + gap) + cellW / 2;

  return (
    <Panel
      id={id}
      className={className}
      kicker={`Step 06 · Every ${dayName}`}
      title="Investment cycle"
      right={`Opens ${time} WAT`}
      label={`Two weeks of the calendar with both ${dayName}s lit, and the real date of the next cycle`}
      checks={["Activation is automatic — nothing further for you to do"]}
    >
      {/* The real next cycle, from getNextCycleStart(). */}
      <Card id={id} x={30} y={90} w={500} h={54} stroke={C.goldDeep} glow="gold" />
      <circle cx="52" cy="117" r="4.5" fill={C.gold} />
      <text x="68" y="112" fill={C.subtle} fontSize="10.5" letterSpacing="0.6">
        NEXT CYCLE
      </text>
      <text x="68" y="130" fill={C.fg} fontSize="14" fontWeight="600">
        {nextCycle?.label ?? `The coming ${dayName}`}
      </text>
      {nextCycle?.away ? (
        <text x="512" y="123" fill={C.goldSoft} fontSize="13" textAnchor="end" fontWeight="600">
          {nextCycle.away}
        </text>
      ) : null}

      {letters.map((letter, i) => {
        const isCycleDay = i === 4 || i === 11;
        const x = 30 + i * (cellW + gap);
        return (
          <React.Fragment key={i}>
            <text
              x={cx(i)}
              y="178"
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
                  y="186"
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
                y="186"
                width={cellW}
                height="46"
                rx="8"
                fill={`url(#${id}-well)`}
                stroke={C.line}
                strokeWidth="1"
              />
            )}
            {isCycleDay ? <circle cx={cx(i)} cy="209" r="4" fill={C.gold} /> : null}
          </React.Fragment>
        );
      })}

      <circle cx="36" cy="256" r="3.5" fill={C.gold} />
      <text x="50" y="260" fill={C.muted} fontSize="12">
        Approved before the cutoff joins the cycle about to open
      </text>
      <circle cx="36" cy="280" r="3.5" fill={C.subtle} />
      <text x="50" y="284" fill={C.muted} fontSize="12">
        {`Approved at or after it waits for the following ${dayName}`}
      </text>
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
  const cellW = (500 - gap * (cols - 1)) / cols;
  const cellH = 32;
  const railY = 96 + rows * (cellH + gap) + 16;

  return (
    <Panel
      id={id}
      className={className}
      accent="emerald"
      kicker="Step 07 · Active term"
      title="Investment term"
      right={`${durationDays} days`}
      label={`A ${durationDays}-day term drawn as one square per day, warming from the cycle opening through to maturity`}
      checks={["The clock starts when the cycle opens, not when you paid"]}
    >
      {Array.from({ length: days }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const t = days > 1 ? i / (days - 1) : 1;
        const last = i === days - 1;
        return (
          <g key={i} filter={last ? `url(#${id}-greenGlow)` : undefined}>
            <rect
              x={30 + col * (cellW + gap)}
              y={96 + row * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="7"
              fill={`url(#${id}-well)`}
              stroke={C.line}
              strokeWidth="1.1"
            />
            <rect
              x={30 + col * (cellW + gap)}
              y={96 + row * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx="7"
              fill={`url(#${id}-bar)`}
              opacity={0.12 + t * 0.55}
            />
          </g>
        );
      })}

      <rect x="30" y={railY} width="500" height="6" rx="3" fill="#111a2c" />
      <g filter={`url(#${id}-goldGlow)`}>
        <rect x="30" y={railY} width="500" height="6" rx="3" fill={`url(#${id}-bar)`} />
      </g>
      <circle cx="33" cy={railY + 3} r="5" fill={C.gold} />
      <circle cx="527" cy={railY + 3} r="5" fill={C.emerald} />

      <text x="30" y={railY + 30} fill={C.goldSoft} fontSize="12">
        Cycle opens
      </text>
      <text x="530" y={railY + 30} fill={C.emeraldSoft} fontSize="12" textAnchor="end">
        Maturity
      </text>
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
      accent="emerald"
      kicker="Step 08 · Your choice"
      title="At maturity"
      label={`At maturity the choice splits two ways: withdraw, which moves through review, approval and payment, or roll over into the next ${dayName} cycle`}
      checks={["Nothing moves until you choose"]}
    >
      <ArrowHead id={`${id}-head`} colour={C.line} />

      <Card
        id={id}
        x={30}
        y={162}
        w={140}
        h={60}
        stroke={C.emeraldDeep}
        fill={`url(#${id}-greenTint)`}
        glow="emerald"
      />
      <circle cx="54" cy="192" r="4" fill={C.emerald} />
      <text x="68" y="197" fill={C.emeraldSoft} fontSize="13">
        Matured
      </text>

      <Arrow marker={`${id}-head`} d="M170 192 L 200 192 L 200 134 L 232 134" />
      <Arrow marker={`${id}-head`} d="M170 192 L 200 192 L 200 246 L 232 246" />

      <Card id={id} x={240} y={92} w={290} h={84} />
      <text x="260" y="120" fill={C.fg} fontSize="13.5" fontWeight="600">
        Withdraw
      </text>
      {withdrawal.map((step, i) => (
        <Pill
          key={step}
          id={id}
          x={260 + i * 88}
          y={134}
          w={78}
          h={24}
          size={10.5}
          label={step}
          tone={i === 2 ? "emerald" : "neutral"}
          glow={i === 2}
        />
      ))}

      <Card id={id} x={240} y={204} w={290} h={84} stroke={C.goldDeep} glow="gold" />
      <text x="260" y="232" fill={C.fg} fontSize="13.5" fontWeight="600">
        Rollover
      </text>
      <path
        d="M266 260 a12 12 0 1 1 8 12"
        stroke={C.gold}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M262 254 l4 6 l7 -3"
        stroke={C.gold}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <text x="300" y="266" fill={C.goldSoft} fontSize="12">
        {`Into the next ${dayName} cycle`}
      </text>
    </Panel>
  );
}
