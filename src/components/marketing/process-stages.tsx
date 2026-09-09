import * as React from "react";
import {
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  Layers,
  Repeat2,
  Timer,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/visuals/decor";
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

interface Stage {
  icon: LucideIcon;
  title: string;
  lead: string;
  points: string[];
  panel: React.ReactNode;
}

/**
 * The eight stages, each drawn out.
 *
 * Every claim here is one the platform actually makes good on — the gates
 * between stages, the accepted documents, the payment and withdrawal status
 * chains — so the drawing beside the words shows the same thing the words say.
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
      lead: `Cycles open once a week, and an approved subscription simply waits for the next one.`,
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
  weekday,
  time,
  durationDays,
}: {
  weekday?: Weekday;
  time?: string;
  durationDays?: number;
}) {
  const dayName = (weekday != null ? WEEKDAY_NAMES[weekday] : undefined) ?? "Friday";
  const stages = buildStages({
    dayName,
    time: time ?? "00:00",
    durationDays: durationDays ?? 30,
  });

  return (
    <section id="stages" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <header className="max-w-2xl" data-reveal="">
            <SectionEyebrow>Stage by stage</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              What actually happens at each step
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              The same eight stages again, this time with the screen you will be looking at, the
              decision being made, and who makes it.
            </p>
          </header>
        </Reveal>

        <ol role="list" className="mt-14 space-y-16 lg:mt-20 lg:space-y-28">
          {stages.map((stage, index) => (
            <li key={stage.title}>
              <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
                <div className={cn(index % 2 === 1 && "lg:order-2")} data-reveal="">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-600 bg-ink-850 text-accent-300">
                      <stage.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-subtle">
                      Stage {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

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
                        <span className="text-[13.5px] leading-relaxed text-fg-muted">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={cn(
                    "surface p-3 sm:p-4",
                    index % 2 === 1 && "lg:order-1",
                  )}
                  data-reveal=""
                  style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
                >
                  {stage.panel}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
