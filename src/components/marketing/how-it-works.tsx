import * as React from "react";
import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  LayoutGrid,
  PlayCircle,
  Timer,
  UserPlus,
  Wallet,
} from "lucide-react";

import { SectionEyebrow } from "@/components/visuals/decor";
import { WorkflowVisual } from "@/components/visuals/illustrations";

export const WORKFLOW_STEPS = [
  {
    icon: UserPlus,
    title: "Create an Account",
    description:
      "Register with your name, date of birth, Nigerian mobile number and email address, then confirm your email.",
  },
  {
    icon: BadgeCheck,
    title: "Complete Identity Verification",
    description:
      "Submit your NIN and a supported identity document. Compliance reviews every submission manually.",
  },
  {
    icon: LayoutGrid,
    title: "Choose Your Investment Package",
    description:
      "Pick the package that matches your capital. Its terms are recorded on your investment at that moment.",
  },
  {
    icon: Wallet,
    title: "Make Your USDT Payment",
    description:
      "Send the exact amount to the company wallet on the displayed network, then submit your transaction hash.",
  },
  {
    icon: ClipboardCheck,
    title: "Payment Verification",
    description:
      "The finance team verifies your transfer manually. You are notified as soon as a decision is made.",
  },
  {
    icon: CalendarClock,
    title: "Wait for the Next Friday Cycle",
    description:
      "Approved subscriptions are queued and activate automatically when the next weekly cycle opens.",
  },
  {
    icon: Timer,
    title: "Track Your 30-Day Term",
    description:
      "Your dashboard tracks the remaining time automatically, from your start date through to maturity.",
  },
  {
    icon: CircleDollarSign,
    title: "Withdraw or Rollover at Maturity",
    description:
      "At maturity, request a withdrawal to your wallet or roll the full matured amount into the next cycle.",
  },
];

export function HowItWorks({ videoUrl }: { videoUrl?: string }) {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>Process</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            How Monoceros works
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
            Eight clearly defined steps, from registration to maturity. At every stage your
            dashboard tells you the current status and the single next action.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <ol className="grid gap-4 sm:grid-cols-2">
            {WORKFLOW_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="surface group relative p-5 transition-colors duration-300 hover:border-accent-800/70"
              >
                <div className="flex items-start gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300 transition-colors group-hover:border-accent-700">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                      Step {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-[14.5px] font-semibold text-fg">{step.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-5 lg:sticky lg:top-24">
            <WorkflowVisual />
            <ExplainerVideo url={videoUrl} />
          </div>
        </div>
      </div>
    </section>
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
