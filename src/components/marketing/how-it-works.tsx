import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Layers,
  PlayCircle,
  Repeat2,
  Timer,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { GlowOrbs, SectionEyebrow } from "@/components/visuals/decor";
import { Reveal } from "@/components/visuals/reveal";
import { WEEKDAY_NAMES, type Weekday } from "@/lib/time";
import type { SessionUser } from "@/lib/auth/session";

export interface WorkflowStep {
  icon: LucideIcon;
  title: string;
  /** One short sentence. This is all the homepage shows. */
  description: string;
  /** Extra stage detail, added only on the full How It Works page. */
  detail: string;
  /** Small label on the card. Reserved for the three stages that define the model. */
  badge?: string;
  /** Emerald is a status colour on this site, so it only marks verified/live stages. */
  tone?: "accent" | "status";
}

/**
 * The eight stages of a subscription.
 *
 * The weekly cycle day and the term length are administrator settings, so they
 * are interpolated rather than written into the copy.
 */
export function workflowSteps({
  dayName = "Friday",
  durationDays = 30,
}: { dayName?: string; durationDays?: number } = {}): WorkflowStep[] {
  return [
    {
      icon: UserPlus,
      title: "Create account",
      description: "Register with your basic personal and contact information.",
      detail:
        "Your name, date of birth, Nigerian mobile number and email address. Confirm your email to activate the account.",
    },
    {
      icon: BadgeCheck,
      title: "Verify identity",
      description: "Complete your NIN and identity verification before investing.",
      detail:
        "Compliance reviews every submission by hand. If anything is declined you are told why, and you can submit again.",
    },
    {
      icon: Layers,
      title: "Choose package",
      description: "Select the investment package that suits your preferred capital level.",
      detail:
        "The package terms — capital, return and term length — are recorded on your investment at the moment you subscribe.",
    },
    {
      icon: Wallet,
      title: "Pay with USDT",
      description: "Send the required amount to the displayed company USDT wallet.",
      detail:
        "Pay on the network shown at checkout, then submit your transaction hash so the transfer can be matched to your subscription.",
      badge: "USDT",
    },
    {
      icon: CircleCheck,
      title: "Payment verified",
      description: "Your payment is reviewed and confirmed by the Monoceros team.",
      detail:
        "Finance checks the transfer against the company wallet manually. You are notified as soon as a decision is made.",
      tone: "status",
    },
    {
      icon: CalendarDays,
      title: `Join ${dayName} cycle`,
      description: `Approved subscriptions enter the next available ${dayName} investment cycle.`,
      detail:
        "Your subscription is queued and activates automatically when the cycle opens. Nothing further is needed from you.",
      badge: `Every ${dayName}`,
    },
    {
      icon: Timer,
      title: `Track ${durationDays} days`,
      description: "Follow your active investment and maturity countdown from your dashboard.",
      detail: `The ${durationDays}-day term runs from the cycle opening timestamp. Your dashboard shows the start date, the time remaining and the maturity amount.`,
      badge: `${durationDays} Days`,
      tone: "status",
    },
    {
      icon: Repeat2,
      title: "Withdraw or rollover",
      description: "At maturity, request withdrawal or continue your funds into another cycle.",
      detail:
        "Withdraw the matured amount to your own wallet, or roll it into the next cycle without moving the funds off the platform.",
    },
  ];
}

/** Kept for callers that only need the default Friday / 30-day wording. */
export const WORKFLOW_STEPS = workflowSteps();

/**
 * How each position in a row of four connects to its neighbours.
 *
 * The grid is 1-up on mobile (a vertical timeline), 2-up from `md` and 4-up from
 * `lg`, so a line is only drawn where it actually joins two adjacent nodes. Both
 * spacers stay in the layout from `md` regardless — only the colour is toggled —
 * because they are what centres each node over its own column.
 *
 * `lead` fills from a card's left edge to its node, `trail` from the node to the
 * card's right edge, and `bridge` crosses the gutter into the next card.
 */
const RAIL = [
  { lead: "", trail: "bg-ink-600/80", bridge: "bg-ink-600/80", arrow: "hidden md:block" },
  {
    lead: "md:bg-ink-600/80",
    trail: "bg-ink-600/80 md:bg-transparent lg:bg-ink-600/80",
    bridge: "lg:bg-ink-600/80",
    arrow: "hidden lg:block",
  },
  {
    lead: "lg:bg-ink-600/80",
    trail: "bg-ink-600/80",
    bridge: "bg-ink-600/80",
    arrow: "hidden md:block",
  },
  // Last in both multi-column rows, but on mobile it still drops to the next step.
  { lead: "md:bg-ink-600/80", trail: "bg-ink-600/80 md:bg-transparent", bridge: "", arrow: "hidden" },
] as const;

/** Half a column of a four-column grid with a 1.5rem gutter — locates nodes 04 and 05. */
const NODE_INSET = "calc(12.5% - 0.5625rem)";
/** Half a node, so the wrap path starts and ends on the rail rather than beside it. */
const NODE_RADIUS = "1.375rem";

export function HowItWorks({
  videoUrl,
  user = null,
  weekday,
  durationDays,
  variant = "compact",
  cycleHref = "/how-it-works#cycles",
}: {
  videoUrl?: string;
  user?: SessionUser | null;
  weekday?: Weekday;
  durationDays?: number;
  /** `detailed` adds a second line of stage detail to every card. */
  variant?: "compact" | "detailed";
  cycleHref?: string;
}) {
  const dayName = (weekday != null ? WEEKDAY_NAMES[weekday] : undefined) ?? "Friday";
  const term = durationDays ?? 30;
  const steps = workflowSteps({ dayName, durationDays: term });
  const detailed = variant === "detailed";

  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <header className="max-w-2xl" data-reveal="">
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              A simple process, from sign-up to maturity
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              Create your account, complete verification, choose a package, make your payment, and
              track your investment through to maturity.
            </p>
          </header>

          <div className="mt-12 lg:mt-16">
            <StepGrid steps={steps.slice(0, 4)} offset={0} detailed={detailed} />
            <WrapConnector />
            <StepGrid steps={steps.slice(4)} offset={4} detailed={detailed} />
          </div>

          <p
            className="mt-10 text-center"
            data-reveal=""
            style={{ "--reveal-delay": "560ms" } as React.CSSProperties}
          >
            <Link
              href={cycleHref}
              className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-300 transition-colors hover:text-accent-200"
            >
              Learn about the {dayName} cycle
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </p>
        </Reveal>

        {videoUrl ? (
          <div className="mx-auto mt-12 max-w-3xl">
            <ExplainerVideo url={videoUrl} />
          </div>
        ) : null}

        <Reveal className="mt-12 lg:mt-16">
          <ProcessCta user={user} />
        </Reveal>
      </div>
    </section>
  );
}

/** One row of four steps. Two of these, stacked, make the desktop journey. */
function StepGrid({
  steps,
  offset,
  detailed,
}: {
  steps: WorkflowStep[];
  offset: number;
  detailed: boolean;
}) {
  return (
    <ol
      role="list"
      start={offset + 1}
      className={cn(
        "grid grid-cols-1 gap-x-6 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4 lg:gap-y-0",
        offset > 0 && "md:mt-10 lg:mt-0",
      )}
    >
      {steps.map((step, index) => (
        <StepItem
          key={step.title}
          step={step}
          index={index}
          number={offset + index + 1}
          isFirstRow={offset === 0}
          isLast={offset + index === 7}
          detailed={detailed}
        />
      ))}
    </ol>
  );
}

function StepItem({
  step,
  index,
  number,
  isFirstRow,
  isLast,
  detailed,
}: {
  step: WorkflowStep;
  index: number;
  number: number;
  isFirstRow: boolean;
  isLast: boolean;
  detailed: boolean;
}) {
  const rail = RAIL[index];
  const status = step.tone === "status";
  // The final step ends the journey, so it carries no outgoing line at all — the
  // spacers stay, colourless, to keep its node centred like every other.
  const trail = isLast ? "" : rail.trail;
  const bridge = isLast ? "" : rail.bridge;
  const arrow = isLast ? "hidden" : rail.arrow;

  return (
    <li
      className={cn(
        // A column from md, so the cards in a row can stretch to a common height.
        "group flex gap-4 md:flex-col md:gap-0",
        // From md the node sits above its card. On the first desktop row it flips
        // below, so the rail ends up beside the wrap path in the gutter.
        isFirstRow && "lg:flex-col-reverse lg:gap-5",
      )}
      style={{ "--reveal-delay": `${number * 70}ms` } as React.CSSProperties}
    >
      <div
        className={cn(
          "relative flex shrink-0 flex-col items-center md:mb-5 md:flex-row",
          isFirstRow && "lg:mb-0",
        )}
      >
        <span
          aria-hidden
          data-reveal-rail=""
          className={cn("hidden h-px flex-1 md:block", rail.lead)}
        />

        <span
          data-reveal=""
          className={cn(
            "relative z-10 grid size-11 shrink-0 place-items-center rounded-xl border bg-ink-850 transition-colors duration-300",
            status
              ? "border-emerald-700/50 text-emerald-400 group-hover:border-emerald-600/70"
              : "border-ink-600 text-accent-300 group-hover:border-accent-700 group-hover:text-accent-200",
          )}
        >
          <step.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>

        <span
          aria-hidden
          data-reveal-rail=""
          className={cn("w-px flex-1 md:h-px md:w-auto", trail)}
        />

        {/* Sits in the gutter between two cards, outside the flex row so it
            cannot pull the node off centre. */}
        <span
          aria-hidden
          data-reveal-rail=""
          className={cn(
            "absolute right-0 top-1/2 hidden h-px w-6 -translate-y-1/2 translate-x-full md:block",
            bridge,
          )}
        >
          <ChevronRight
            className={cn("absolute right-0 top-1/2 size-3 -translate-y-1/2 text-ink-500", arrow)}
            aria-hidden
          />
        </span>
      </div>

      <div
        data-reveal=""
        className={cn(
          "surface flex-1 p-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent-800/70 sm:p-5",
          !isLast && "mb-6 md:mb-0",
        )}
      >
        {/* Fixed height so a badge never pushes this card's title out of line
            with the cards either side of it. */}
        <div className="flex min-h-[22px] items-center justify-between gap-2">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
            Step {String(number).padStart(2, "0")}
          </p>
          {step.badge ? (
            <span
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                status
                  ? "border-emerald-700/40 bg-emerald-900/30 text-emerald-300"
                  : "border-accent-700/40 bg-accent-900/40 text-accent-200",
              )}
            >
              {step.badge}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 text-[14.5px] font-semibold text-fg">{step.title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{step.description}</p>

        {detailed ? (
          <p className="mt-3 border-t border-ink-700/60 pt-3 text-[12px] leading-relaxed text-fg-subtle">
            {step.detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Carries the line from the end of the first desktop row into the start of the
 * second, so the two rows read as one journey. Two bordered boxes: the first
 * turns down out of step 04, the second runs back across and drops into step 05.
 * Desktop only — the narrower layouts connect their steps directly.
 */
function WrapConnector() {
  return (
    <div
      aria-hidden
      data-reveal-path=""
      className="relative hidden h-16 lg:block"
      style={{ "--reveal-delay": "340ms" } as React.CSSProperties}
    >
      <span
        className="absolute right-0 rounded-tr-2xl border-r border-t border-ink-600/80"
        style={{
          top: `calc(${NODE_RADIUS} * -1)`,
          height: `calc(50% + ${NODE_RADIUS})`,
          width: NODE_INSET,
        }}
      />
      <span
        className="absolute right-0 top-1/2 rounded-tl-2xl border-l border-t border-ink-600/80"
        style={{ left: NODE_INSET, bottom: `calc(${NODE_RADIUS} * -1)` }}
      />
      <ChevronDown
        className="absolute bottom-2 size-3.5 -translate-x-1/2 bg-ink-950 py-0.5 text-ink-500"
        style={{ left: NODE_INSET }}
      />
    </div>
  );
}

function ProcessCta({ user }: { user: SessionUser | null }) {
  const signedIn = Boolean(user);

  return (
    <div className="surface relative overflow-hidden p-6 sm:p-8" data-reveal="">
      <GlowOrbs variant="panel" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
            {signedIn ? "Pick up where you left off" : "Ready to get started?"}
          </h3>
          <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-fg-muted">
            {signedIn
              ? "Your dashboard tracks verification, payments and every active investment in one place."
              : "Create your account and complete verification to access the available investment packages."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href={signedIn ? "/dashboard" : "/register"}>
            {signedIn ? "Go to dashboard" : "Create account"}
          </ButtonLink>
          <ButtonLink href={signedIn ? "/dashboard/packages" : "/packages"} variant="secondary">
            View packages
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** Renders the configured explainer video, or a labelled placeholder. */
export function ExplainerVideo({ url }: { url?: string }) {
  if (url) {
    return (
      <div className="surface overflow-hidden">
        <div className="relative aspect-video w-full">
          <iframe
            src={url}
            title="How Monoceros works"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="surface flex aspect-video w-full flex-col items-center justify-center gap-3 border-dashed p-6 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-ink-600 bg-ink-850 text-fg-muted">
        <PlayCircle className="size-5" aria-hidden />
      </span>
      <p className="text-[13.5px] font-medium text-fg">Explainer video</p>
      <p className="max-w-xs text-[12px] leading-relaxed text-fg-subtle">
        An administrator can add a walkthrough video URL under Website Content in the admin
        dashboard, and it will appear here.
      </p>
    </div>
  );
}
