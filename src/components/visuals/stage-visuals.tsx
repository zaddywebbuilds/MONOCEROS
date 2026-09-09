import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Stage panels for the How It Works page.
 *
 * One drawing per stage of a subscription. Each is authored as SVG rather than
 * sourced as an image so it stays sharp, weighs nothing and can be corrected
 * when the product changes. Following the house rule in `illustrations.tsx`,
 * they depict the *mechanism* — the fields you fill, the statuses a payment
 * moves through, where a cycle opens in the week — and never fabricate a
 * dashboard, a balance, a return or anybody's activity.
 *
 * What is drawn is taken from the platform itself: the registration fields, the
 * five accepted identity documents, the deposit network labels, and the real
 * payment and withdrawal status chains.
 */

const C = {
  bg: "#080d18",
  surface: "#0b111e",
  raised: "#0e1525",
  line: "#1f2c48",
  lineSoft: "#17223a",
  gold: "#d9ae5c",
  goldDeep: "#c9963f",
  goldSoft: "#e6c987",
  emerald: "#12c99b",
  emeraldSoft: "#2fd4a7",
  fg: "#e9eef6",
  muted: "#94a4bd",
  subtle: "#64748b",
};

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** Every panel shares one canvas so the eight sit together as a set. */
function Panel({
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
      viewBox="0 0 560 300"
      fill="none"
      role="img"
      aria-label={label}
      fontFamily={FONT}
      className={cn("h-auto w-full", className)}
    >
      <rect
        x="0.75"
        y="0.75"
        width="558.5"
        height="298.5"
        rx="18"
        fill={C.bg}
        stroke={C.line}
        strokeWidth="1.5"
      />
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

/** A form field: outlined box with its label sitting inside, as on the real forms. */
function Field({
  x,
  y,
  w,
  label,
  value,
  mono,
  h = 40,
}: {
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
        fill={C.surface}
        stroke={C.line}
        strokeWidth="1.2"
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
  x,
  y,
  w,
  label,
  tone = "neutral",
  h = 28,
  size = 12,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  tone?: "neutral" | "gold" | "emerald" | "ghost";
  h?: number;
  size?: number;
}) {
  const stroke =
    tone === "gold" ? C.goldDeep : tone === "emerald" ? "#0a8368" : C.line;
  const fill =
    tone === "gold" ? "#2a1f0d" : tone === "emerald" ? "#06302a" : tone === "ghost" ? "none" : C.surface;
  const text = tone === "gold" ? C.goldSoft : tone === "emerald" ? C.emeraldSoft : C.muted;

  return (
    <>
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
    </>
  );
}

function Caption({ y, children }: { y: number; children: string }) {
  return (
    <text x="32" y={y} fill={C.subtle} fontSize="12">
      {children}
    </text>
  );
}

/** Small tick, drawn rather than pulled from an icon set so it scales with the panel. */
function Tick({ x, y, colour = C.emerald, s = 1 }: { x: number; y: number; colour?: string; s?: number }) {
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

/**
 * Arrowheads are `<marker>` elements referenced by id, and ids are global to the
 * document — eight panels sharing one id would all take the first panel's
 * colour. Each panel therefore names its own.
 */
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

function ArrowDefs({ id, colour = C.gold }: { id: string; colour?: string }) {
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
  return (
    <Panel
      className={className}
      label="A registration form showing the name, date of birth, mobile number and email fields, followed by an email confirmation step"
    >
      <Title>Registration</Title>

      <Field x={32} y={62} w={240} label="First name" />
      <Field x={288} y={62} w={240} label="Surname" />
      <Field x={32} y={114} w={240} label="Date of birth" />
      <Field x={288} y={114} w={240} label="Mobile number" />
      <Field x={32} y={166} w={496} label="Email address" />

      <rect x="32" y="222" width="186" height="44" rx="10" fill={C.gold} />
      <text x="125" y="249" fill="#04060c" fontSize="13.5" fontWeight="600" textAnchor="middle">
        Create account
      </text>

      <rect
        x="238"
        y="222"
        width="290"
        height="44"
        rx="10"
        fill={C.surface}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <rect x="256" y="236" width="20" height="15" rx="3" stroke={C.muted} strokeWidth="1.3" />
      <path d="M256 238 l10 7 l10 -7" stroke={C.muted} strokeWidth="1.3" fill="none" />
      <text x="288" y="249" fill={C.muted} fontSize="12.5">
        Confirm your email
      </text>
      <Tick x={508} y={244} />
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
  return (
    <Panel
      className={className}
      label="An identity verification screen: a NIN field, an identity document, the five accepted document types, and a manual compliance review"
    >
      <Title>Identity verification</Title>

      <Field x={32} y={62} w={496} label="NIN" value="••• ••• ••• ••" mono />

      {/* The submitted document, drawn as a card rather than a real one. */}
      <rect
        x="32"
        y="118"
        width="232"
        height="106"
        rx="12"
        fill={C.surface}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <rect x="48" y="134" width="52" height="60" rx="8" fill={C.raised} stroke={C.lineSoft} />
      <circle cx="74" cy="156" r="10" fill={C.lineSoft} />
      <path d="M58 186 a16 13 0 0 1 32 0" fill={C.lineSoft} />
      <rect x="114" y="140" width="104" height="9" rx="4.5" fill={C.lineSoft} />
      <rect x="114" y="158" width="78" height="9" rx="4.5" fill={C.lineSoft} />
      <rect x="114" y="176" width="120" height="9" rx="4.5" fill={C.lineSoft} />
      <text x="48" y="212" fill={C.subtle} fontSize="11.5">
        Identity document
      </text>

      {ID_DOCUMENTS.map((doc, i) => (
        <React.Fragment key={doc}>
          <rect
            x="288"
            y={118 + i * 30}
            width="240"
            height="24"
            rx="12"
            fill={i === 0 ? "#2a1f0d" : C.surface}
            stroke={i === 0 ? C.goldDeep : C.line}
            strokeWidth="1.1"
          />
          <text
            x="304"
            y={134 + i * 30}
            fill={i === 0 ? C.goldSoft : C.muted}
            fontSize="11.5"
          >
            {doc}
          </text>
        </React.Fragment>
      ))}

      <Pill x={32} y={238} w={232} label="Reviewed by a person" tone="gold" size={11.5} />
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
  const tiers = [0.42, 0.68, 1];

  return (
    <Panel
      className={className}
      label="Three investment packages of increasing capital, one selected, with the term recorded on the investment"
    >
      <Title>Investment packages</Title>

      {tiers.map((ratio, i) => {
        const x = 32 + i * 174;
        const selected = i === 1;
        return (
          <React.Fragment key={i}>
            <rect
              x={x}
              y="62"
              width="148"
              height="180"
              rx="12"
              fill={selected ? C.raised : C.surface}
              stroke={selected ? C.goldDeep : C.line}
              strokeWidth={selected ? 1.6 : 1.2}
            />
            <rect x={x + 16} y="80" width="64" height="10" rx="5" fill={C.lineSoft} />
            {selected ? (
              <>
                <circle cx={x + 126} cy="85" r="9" fill="#2a1f0d" stroke={C.goldDeep} />
                <Tick x={x + 126} y={85} colour={C.goldSoft} s={0.8} />
              </>
            ) : null}

            <text x={x + 16} y="122" fill={C.subtle} fontSize="11">
              Capital
            </text>
            <rect x={x + 16} y="130" width="116" height="8" rx="4" fill={C.lineSoft} />
            <rect
              x={x + 16}
              y="130"
              width={116 * ratio}
              height="8"
              rx="4"
              fill={selected ? C.gold : C.line}
            />

            <text x={x + 16} y="164" fill={C.subtle} fontSize="11">
              Return
            </text>
            <rect x={x + 16} y="172" width="116" height="8" rx="4" fill={C.lineSoft} />
            <rect
              x={x + 16}
              y="172"
              width={116 * (0.5 + ratio * 0.45)}
              height="8"
              rx="4"
              fill={selected ? C.goldDeep : C.line}
            />

            <text x={x + 16} y="212" fill={C.muted} fontSize="12">
              {durationDays}-day term
            </text>
          </React.Fragment>
        );
      })}

      <Caption y={268}>Its terms are recorded on your investment the moment you subscribe.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 04 — Pay with USDT
// ---------------------------------------------------------------------------

export function PayWithUsdtPanel({ className }: { className?: string }) {
  return (
    <Panel
      className={className}
      label="A USDT payment screen: a choice of network, the company wallet address, and a field for the transaction hash"
    >
      <Title right="USDT">Payment</Title>

      <Pill x={32} y={62} w={168} label="TRC-20 (Tron)" tone="gold" h={32} />
      <Pill x={212} y={62} w={214} label="BEP-20 (BNB Smart Chain)" h={32} />

      <text x="32" y="126" fill={C.subtle} fontSize="11.5">
        Company wallet address
      </text>
      <rect
        x="32"
        y="134"
        width="496"
        height="46"
        rx="10"
        fill={C.surface}
        stroke={C.line}
        strokeWidth="1.2"
      />
      {/* Masked deliberately: a live receiving address must never appear in artwork. */}
      <text x="50" y="163" fill={C.muted} fontSize="14" fontFamily={MONO} letterSpacing="1.5">
        T•••••••••••••••••••••••••••
      </text>
      <rect x="482" y="148" width="14" height="17" rx="3" stroke={C.gold} strokeWidth="1.3" />
      <rect x="488" y="153" width="14" height="17" rx="3" fill={C.bg} stroke={C.gold} strokeWidth="1.3" />

      <text x="32" y="204" fill={C.subtle} fontSize="11.5">
        Transaction hash
      </text>
      <Field x={32} y={212} w={496} label="Paste the hash of your transfer" h={44} />

      <Caption y={280}>Send the exact amount on the network shown, then submit the hash.</Caption>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 05 — Payment verified
// ---------------------------------------------------------------------------

export function PaymentVerifiedPanel({ className }: { className?: string }) {
  const stages = [
    { label: "Submitted", tone: "neutral" as const },
    { label: "Under review", tone: "gold" as const },
    { label: "Approved", tone: "emerald" as const },
  ];

  return (
    <Panel
      className={className}
      label="The payment status chain: submitted, then under review, then approved, with rejection shown as the alternative outcome"
    >
      <ArrowDefs id="arrow-review" colour={C.line} />
      <Title>Payment review</Title>

      {stages.map((stage, i) => {
        const x = 32 + i * 178;
        const stroke =
          stage.tone === "gold" ? C.goldDeep : stage.tone === "emerald" ? "#0a8368" : C.line;
        const text =
          stage.tone === "gold" ? C.goldSoft : stage.tone === "emerald" ? C.emeraldSoft : C.muted;
        return (
          <React.Fragment key={stage.label}>
            <rect
              x={x}
              y="76"
              width="140"
              height="60"
              rx="12"
              fill={stage.tone === "neutral" ? C.surface : C.raised}
              stroke={stroke}
              strokeWidth="1.3"
            />
            <text x={x + 70} y={i === 2 ? 104 : 111} fill={text} fontSize="13" textAnchor="middle">
              {stage.label}
            </text>
            {i === 2 ? <Tick x={x + 70} y={118} /> : null}
            {i < 2 ? (
              <Arrow marker="arrow-review" d={`M${x + 148} 106 L ${x + 170} 106`} />
            ) : null}
          </React.Fragment>
        );
      })}

      {/* The honest alternative: review can also decline, and you are told why. */}
      <Arrow marker="arrow-review" d="M280 144 L 280 180 L 380 180" />
      <Pill x={388} y={166} w={140} label="Rejected, with a reason" tone="ghost" size={11} />

      <circle cx="46" cy="228" r="13" fill={C.surface} stroke={C.line} />
      <circle cx="46" cy="224" r="4.5" fill={C.lineSoft} />
      <path d="M38 236 a8 7 0 0 1 16 0" fill={C.lineSoft} />
      <text x="70" y="232" fill={C.muted} fontSize="12.5">
        Checked against the company wallet by the finance team
      </text>

      <Caption y={272}>You are notified as soon as a decision is made.</Caption>
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
  const letters = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];
  const gap = 6;
  const cellW = (496 - gap * 13) / 14;
  const cx = (i: number) => 32 + i * (cellW + gap) + cellW / 2;

  return (
    <Panel
      className={className}
      label={`Two weeks of the calendar with both ${dayName}s marked: a subscription approved before the cutoff joins the ${dayName} about to open, one approved after it waits for the following ${dayName}`}
    >
      <ArrowDefs id="arrow-cycle" colour={C.gold} />
      <Title right={`Opens ${time} WAT`}>Weekly investment cycle</Title>

      <Pill x={32} y={60} w={162} label="Approved before" tone="gold" size={11.5} />
      <Arrow marker="arrow-cycle" d={`M${cx(4)} 90 L ${cx(4)} 118`} colour={C.gold} />

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
            <rect
              x={x}
              y="136"
              width={cellW}
              height="46"
              rx="8"
              fill={isCycleDay ? "#2a1f0d" : C.surface}
              stroke={isCycleDay ? C.goldDeep : C.line}
              strokeWidth={isCycleDay ? 1.5 : 1}
            />
            {isCycleDay ? <circle cx={cx(i)} cy="159" r="4" fill={C.gold} /> : null}
          </React.Fragment>
        );
      })}

      <Arrow marker="arrow-cycle" d={`M${cx(11)} 212 L ${cx(11)} 188`} colour={C.gold} />
      <Pill x={330} y={216} w={198} label="Approved at or after" size={11.5} />

      <Caption y={268}>{`A cycle opens every ${dayName} at ${time} West Africa Time.`}</Caption>
      <Caption y={286}>{`Miss it and your subscription waits for the following ${dayName}.`}</Caption>
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
  const days = Math.min(Math.max(durationDays, 1), 40);
  const cols = 10;
  const rows = Math.ceil(days / cols);
  const gap = 8;
  const cellW = (496 - gap * (cols - 1)) / cols;
  const cellH = 30;

  return (
    <Panel
      className={className}
      label={`A ${durationDays}-day term drawn as one square per day, running from the cycle opening to maturity`}
    >
      <Title right={`${durationDays} days`}>Investment term</Title>

      {Array.from({ length: days }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const t = days > 1 ? i / (days - 1) : 1;
        return (
          <rect
            key={i}
            x={32 + col * (cellW + gap)}
            y={64 + row * (cellH + gap)}
            width={cellW}
            height={cellH}
            rx="7"
            fill={t > 0.94 ? "#06302a" : C.surface}
            stroke={t > 0.94 ? "#0a8368" : C.line}
            strokeWidth="1.1"
            opacity={0.5 + t * 0.5}
          />
        );
      })}

      <rect
        x="32"
        y={64 + rows * (cellH + gap) + 12}
        width="496"
        height="6"
        rx="3"
        fill={C.lineSoft}
      />
      <rect
        x="32"
        y={64 + rows * (cellH + gap) + 12}
        width="496"
        height="6"
        rx="3"
        fill="url(#term-rail)"
      />
      <defs>
        <linearGradient id="term-rail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.goldDeep} />
          <stop offset="100%" stopColor={C.emerald} />
        </linearGradient>
      </defs>

      <circle cx="35" cy={64 + rows * (cellH + gap) + 15} r="5" fill={C.gold} />
      <circle cx="525" cy={64 + rows * (cellH + gap) + 15} r="5" fill={C.emerald} />

      <text x="32" y={64 + rows * (cellH + gap) + 42} fill={C.goldSoft} fontSize="12">
        Cycle opens
      </text>
      <text
        x="528"
        y={64 + rows * (cellH + gap) + 42}
        fill={C.emeraldSoft}
        fontSize="12"
        textAnchor="end"
      >
        Maturity
      </text>

      <Caption y={286}>Your dashboard counts this down for you, day by day.</Caption>
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
  const withdrawal = ["Under review", "Approved", "Paid"];

  return (
    <Panel
      className={className}
      label={`At maturity the choice splits two ways: withdraw, which moves through review, approval and payment, or roll over into the next ${dayName} cycle`}
    >
      <ArrowDefs id="arrow-maturity" colour={C.line} />
      <Title>At maturity</Title>

      <rect
        x="32"
        y="122"
        width="132"
        height="58"
        rx="12"
        fill={C.raised}
        stroke="#0a8368"
        strokeWidth="1.3"
      />
      <circle cx="56" cy="151" r="4" fill={C.emerald} />
      <text x="70" y="156" fill={C.emeraldSoft} fontSize="13">
        Matured
      </text>

      <Arrow marker="arrow-maturity" d="M164 151 L 196 151 L 196 106 L 228 106" />
      <Arrow marker="arrow-maturity" d="M164 151 L 196 151 L 196 208 L 228 208" />

      {/* Withdraw */}
      <rect
        x="236"
        y="64"
        width="292"
        height="84"
        rx="12"
        fill={C.surface}
        stroke={C.line}
        strokeWidth="1.2"
      />
      <text x="256" y="92" fill={C.fg} fontSize="13.5" fontWeight="600">
        Withdraw
      </text>
      {withdrawal.map((step, i) => (
        <React.Fragment key={step}>
          <rect
            x={256 + i * 88}
            y="106"
            width="78"
            height="24"
            rx="12"
            fill={i === 2 ? "#06302a" : C.raised}
            stroke={i === 2 ? "#0a8368" : C.line}
            strokeWidth="1.1"
          />
          <text
            x={295 + i * 88}
            y="122"
            fill={i === 2 ? C.emeraldSoft : C.muted}
            fontSize="10.5"
            textAnchor="middle"
          >
            {step}
          </text>
        </React.Fragment>
      ))}

      {/* Rollover */}
      <rect
        x="236"
        y="166"
        width="292"
        height="84"
        rx="12"
        fill={C.surface}
        stroke={C.goldDeep}
        strokeWidth="1.3"
      />
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
      <path d="M258 216 l4 6 l7 -3" stroke={C.gold} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <text x="296" y="228" fill={C.goldSoft} fontSize="12">
        {`Into the next ${dayName} cycle`}
      </text>

      <Caption y={282}>The choice is yours, and nothing happens until you make it.</Caption>
    </Panel>
  );
}
