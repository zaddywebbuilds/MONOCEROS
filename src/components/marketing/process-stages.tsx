import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
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
import {
  ChoosePackagePanel,
  CreateAccountPanel,
  CyclePanel,
  MaturityPanel,
  PaymentVerifiedPanel,
  PayWithUsdtPanel,
  TermPanel,
  VerifyIdentityPanel,
} from "@/components/visuals/stage-visuals";
import { WEEKDAY_NAMES, type Weekday } from "@/lib/time";
import type { SessionUser } from "@/lib/auth/session";

interface Stage {
  icon: LucideIcon;
  title: string;
  /** The one line the homepage shows under the picture. */
  lead: string;
  /** The detail the full page adds. */
  points: string[];
  panel: React.ReactNode;
}

/**
 * The eight stages of a subscription, each with its picture.
 *
 * Every claim here is one the platform actually makes good on — the gates
 * between stages, the accepted documents, the payment and withdrawal status
 * chains — so the drawing and the words beside it describe the same thing.
 * The cycle day, opening time and term length come from settings rather than
 * being written into the copy.
 */
function buildStages({
  dayName,
  time,
  durationDays,
}: {
  dayName: string;
  time: string;
  durationDays: number;
}): Stage[] {
  return [
    {
      icon: UserPlus,
      title: "Create your account",
      lead: "Registration asks only for what is needed to identify you and reach you.",
      points: [
        "First name, surname, date of birth, mobile number and email address.",
        "A confirmation link is emailed to you as soon as you register.",
        "Until that email is confirmed you cannot subscribe to a package.",
      ],
      panel: <CreateAccountPanel />,
    },
    {
      icon: BadgeCheck,
      title: "Complete identity verification",
      lead: "Your NIN and one supported document, reviewed by a person rather than a score.",
      points: [
        "NIN slip, national ID, international passport, driver's licence or voter's card.",
        "Documents are written to private storage — never a public folder, never a CDN.",
        "If a submission is declined you are told why, and you can submit again.",
      ],
      panel: <VerifyIdentityPanel />,
    },
    {
      icon: Layers,
      title: "Choose your package",
      lead: "Packages open up once your identity has been approved.",
      points: [
        "Pick the tier that matches the capital you want to commit.",
        `Capital, return and the ${durationDays}-day term are recorded on your investment as you subscribe.`,
        "That record is what governs your investment from then on.",
      ],
      panel: <ChoosePackagePanel durationDays={durationDays} />,
    },
    {
      icon: Wallet,
      title: "Pay with USDT",
      lead: "Send the exact amount to the company wallet, then tell us the transaction.",
      points: [
        "Choose your network first — the address shown changes with it.",
        "An address belongs to one network only; sending on another loses the funds.",
        "Submit your transaction hash so the transfer can be matched to your subscription.",
      ],
      panel: <PayWithUsdtPanel />,
    },
    {
      icon: CircleCheck,
      title: "Payment verification",
      lead: "The finance team checks your transfer against the company wallet by hand.",
      points: [
        "Your payment moves from submitted, to under review, to approved.",
        "A payment that cannot be matched is rejected with a reason attached.",
        "You are notified either way, as soon as the decision is made.",
      ],
      panel: <PaymentVerifiedPanel />,
    },
    {
      icon: CalendarDays,
      title: `Join the next ${dayName} cycle`,
      lead: "Cycles open once a week, and an approved subscription waits for the next one.",
      points: [
        `Approved before ${dayName} ${time} WAT — joins the cycle about to open.`,
        `Approved at or after it — waits for the following ${dayName}.`,
        "Activation is automatic. There is nothing further for you to do.",
      ],
      panel: <CyclePanel dayName={dayName} time={time} />,
    },
    {
      icon: Timer,
      title: `Track the ${durationDays}-day term`,
      lead: "The clock starts when the cycle opens, not when you paid.",
      points: [
        `${durationDays} days, counted from the cycle opening timestamp.`,
        "Your dashboard shows the start date, the time remaining and the maturity amount.",
        "The investment reads as queued, then active, then matured.",
      ],
      panel: <TermPanel durationDays={durationDays} />,
    },
    {
      icon: Repeat2,
      title: "Withdraw or roll over",
      lead: "At maturity the decision is yours, and nothing moves until you make it.",
      points: [
        "Withdraw: your request goes to review, then approval, then payment.",
        `Roll over: the full matured amount enters the next ${dayName} cycle.`,
        "Both are requested from your dashboard in a couple of clicks.",
      ],
      panel: <MaturityPanel dayName={dayName} />,
    },
  ];
}

export function ProcessStages({
  user = null,
  weekday,
  time,
  durationDays,
  videoUrl,
  /** `compact` is the homepage: pictures and one line each. `full` adds the detail. */
  variant = "compact",
  cycleHref = "/how-it-works#cycles",
}: {
  user?: SessionUser | null;
  weekday?: Weekday;
  time?: string;
  durationDays?: number;
  videoUrl?: string;
  variant?: "compact" | "full";
  cycleHref?: string;
}) {
  const dayName = (weekday != null ? WEEKDAY_NAMES[weekday] : undefined) ?? "Friday";
  const term = durationDays ?? 30;
  const stages = buildStages({ dayName, time: time ?? "00:00", durationDays: term });
  const full = variant === "full";

  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <header className="max-w-2xl" data-reveal="">
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              {full ? "What happens at each step" : "A simple process, from sign-up to maturity"}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              {full
                ? "The eight stages of a subscription, the screen you will be looking at, the decision being made, and who makes it."
                : "Create your account, complete verification, choose a package, make your payment, and track your investment through to maturity."}
            </p>
          </header>
        </Reveal>

        {full ? (
          <ol role="list" className="mt-14 space-y-16 lg:mt-20 lg:space-y-28">
            {stages.map((stage, index) => (
              <li key={stage.title}>
                <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
                  <div className={cn(index % 2 === 1 && "lg:order-2")} data-reveal="">
                    <StageLabel icon={stage.icon} index={index} />
                    <h3 className="mt-5 text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">
                      {stage.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{stage.lead}</p>
                    <ul className="mt-6 space-y-3">
                      {stage.points.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent-500"
                          />
                          <span className="text-[13.5px] leading-relaxed text-fg-muted">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={cn("surface p-3 sm:p-4", index % 2 === 1 && "lg:order-1")}
                    data-reveal=""
                    style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
                  >
                    {stage.panel}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        ) : (
          <Reveal>
            <ol
              role="list"
              className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 lg:mt-16 lg:grid-cols-2 lg:gap-y-16"
            >
              {stages.map((stage, index) => (
                <li
                  key={stage.title}
                  data-reveal=""
                  style={{ "--reveal-delay": `${index * 60}ms` } as React.CSSProperties}
                >
                  <div className="surface p-3 sm:p-4">{stage.panel}</div>
                  <div className="mt-5">
                    <StageLabel icon={stage.icon} index={index} />
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-fg sm:text-xl">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{stage.lead}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        )}

        <Reveal>
          <p className="mt-14 text-center" data-reveal="">
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

function StageLabel({ icon: Icon, index }: { icon: LucideIcon; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-600 bg-ink-850 text-accent-300">
        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-subtle">
        Stage {String(index + 1).padStart(2, "0")}
      </span>
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

/** Renders the configured explainer video. Nothing shows until an administrator sets one. */
export function ExplainerVideo({ url }: { url: string }) {
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

/** Placeholder for the admin preview, so the setting is discoverable there. */
export function ExplainerVideoPlaceholder() {
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
