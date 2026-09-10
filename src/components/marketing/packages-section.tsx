import * as React from "react";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { SectionEyebrow } from "@/components/visuals/decor";
import { formatUSD } from "@/lib/money";
import type { PublicPackage } from "@/server/queries/public";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Package CTA routing.
 *
 * Logged out            -> registration
 * Email unverified      -> email confirmation
 * KYC not approved      -> identity verification
 * Verified investor     -> the subscription confirmation page
 */
export function packageCtaHref(pkg: PublicPackage, user: SessionUser | null): string {
  if (!user) return `/register?package=${pkg.slug}`;
  if (!user.emailVerified) return "/verify-email";
  if (user.kycStatus !== "APPROVED") return "/dashboard/verification";
  return `/dashboard/packages/${pkg.slug}`;
}

const TIER_NUMERAL = ["I", "II", "III", "IV", "V"];

export function PackageCard({
  pkg,
  href,
  featured,
  /** Position in the ladder, so the tiers visibly ascend rather than repeat. */
  tier = 0,
  /** The largest capital on offer, used to size the bars against each other. */
  scale,
}: {
  pkg: PublicPackage;
  href: string;
  featured?: boolean;
  tier?: number;
  scale?: number;
}) {
  const capital = Number(pkg.minimumCapital);
  const maturity = Number(pkg.maturityAmount);
  const profit = maturity - capital;

  // Bars are drawn against the largest package, so a glance across the row
  // compares real amounts rather than five separate tables.
  const ceiling = Math.max(scale ?? maturity, maturity, 1);
  const capitalWidth = (capital / ceiling) * 100;
  const profitWidth = (profit / ceiling) * 100;

  return (
    <article
      className={cn(
        "surface group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1",
        featured
          ? "border-accent-700/60 shadow-[0_30px_60px_-30px_rgba(201,150,63,0.45)]"
          : "hover:border-accent-800/60",
      )}
    >
      {/* The accent edge deepens as the tiers climb. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent-300 to-accent-700"
        style={{ opacity: 0.25 + tier * 0.18 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-md border border-accent-700/50 bg-accent-900/40 text-[10px] font-semibold text-accent-300"
          >
            {TIER_NUMERAL[tier] ?? tier + 1}
          </span>
          <h3 className="text-[15px] font-semibold tracking-tight text-fg">{pkg.name}</h3>
        </div>
        {pkg.badge ? (
          <Badge variant={featured ? "accent" : "outline"}>{pkg.badge}</Badge>
        ) : null}
      </div>

      {/* Lead with what the investor receives, not with the price. */}
      <div className="mt-5">
        <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
          Above capital at maturity
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-emerald-400">
            +{formatUSD(profit)}
          </p>
          <span className="rounded-full border border-accent-700/40 bg-accent-900/40 px-2 py-0.5 text-[11px] font-semibold text-accent-200">
            {pkg.returnPercentage}%
          </span>
        </div>
      </div>

      {/* Capital and profit drawn to scale, comparable across the row. */}
      <div className="mt-5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-800">
          <span
            className="h-full rounded-l-full bg-ink-500 transition-all duration-500"
            style={{ width: `${capitalWidth}%` }}
          />
          <span
            className="h-full bg-gradient-to-r from-accent-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${profitWidth}%` }}
          />
        </div>
        <dl className="mt-3 flex items-center justify-between text-[12.5px]">
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-ink-500" />
            <dt className="text-fg-subtle">You commit</dt>
            <dd className="font-semibold tabular-nums text-fg">{formatUSD(capital)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Matures at</dt>
            <dd className="font-semibold tabular-nums text-fg">{formatUSD(maturity)}</dd>
            <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          </div>
        </dl>
      </div>

      <p className="mt-5 border-t border-ink-700/60 pt-5 text-[12.5px] leading-relaxed text-fg-muted">
        {pkg.description}
      </p>

      {/* One line, not three: the table above already states the figures. */}
      <ul className="mt-4 space-y-2">
        {[`${pkg.durationDays}-day term, fixed at subscription`, "Withdraw or roll over at maturity"].map(
          (item) => (
            <li key={item} className="flex items-start gap-2 text-[12.5px] text-fg-muted">
              <Check className="mt-0.5 size-3.5 shrink-0 text-accent-400" aria-hidden />
              {item}
            </li>
          ),
        )}
      </ul>

      <div className="mt-6 flex-1" />

      <ButtonLink
        href={href}
        variant={featured ? "primary" : "secondary"}
        block
        className="group/cta mt-2"
      >
        Get Started
        <ArrowRight className="transition-transform duration-200 group-hover/cta:translate-x-0.5" />
      </ButtonLink>
    </article>
  );
}

export function PackagesSection({
  packages,
  user,
  heading = "Investment Packages",
  showHeading = true,
}: {
  packages: PublicPackage[];
  user: SessionUser | null;
  heading?: string;
  showHeading?: boolean;
}) {
  return (
    <section id="packages" className="relative py-10 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading ? (
          <div className="max-w-2xl">
            <SectionEyebrow>Subscriptions</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              Each package defines its capital, return percentage, maturity value and term length up
              front. Those figures are recorded on your investment when you subscribe and never
              change afterwards, even if a package is later edited.
            </p>
          </div>
        ) : null}

        {packages.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="Packages are not available right now"
            description="Investment packages could not be loaded. Please refresh, or contact support if this continues."
            actionLabel="Contact support"
            actionHref="/contact"
          />
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                href={packageCtaHref(pkg, user)}
                featured={Boolean(pkg.badge) || (!packages.some((p) => p.badge) && index === 2)}
                tier={index}
                scale={Math.max(...packages.map((p) => Number(p.maturityAmount)))}
              />
            ))}
          </div>
        )}

        <p className="mt-8 max-w-3xl text-[12.5px] leading-relaxed text-fg-subtle">
          Maturity values are determined by the package you subscribe to. They are not a projection
          of external trading performance, and they do not change with the results of the external
          automated system. Investing carries risk, including loss of capital.
        </p>
      </div>
    </section>
  );
}
