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

export function PackageCard({
  pkg,
  href,
  featured,
}: {
  pkg: PublicPackage;
  href: string;
  featured?: boolean;
}) {
  const profit = Number(pkg.maturityAmount) - Number(pkg.minimumCapital);

  return (
    <article
      className={cn(
        "surface group relative flex flex-col p-6 transition-all duration-300 hover:-translate-y-1",
        featured
          ? "border-accent-700/60 shadow-[0_30px_60px_-30px_rgba(18,201,155,0.35)]"
          : "hover:border-ink-500",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          featured
            ? "bg-gradient-to-r from-transparent via-accent-400 to-transparent"
            : "bg-gradient-to-r from-transparent via-ink-500 to-transparent",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-fg">{pkg.name}</h3>
          <p className="mt-1 text-[12.5px] text-fg-subtle">{pkg.durationDays}-day term</p>
        </div>
        {pkg.badge ? (
          <Badge variant={featured ? "accent" : "outline"}>{pkg.badge}</Badge>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Capital</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-fg">
          {formatUSD(pkg.minimumCapital)}
        </p>
      </div>

      <dl className="mt-5 space-y-3 border-t border-ink-700/60 pt-5">
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-fg-muted">Return</dt>
          <dd className="text-[13px] font-semibold text-accent-300">{pkg.returnPercentage}%</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-fg-muted">Maturity value</dt>
          <dd className="text-[13px] font-semibold text-fg">{formatUSD(pkg.maturityAmount)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-fg-muted">Duration</dt>
          <dd className="text-[13px] font-semibold text-fg">{pkg.durationDays} days</dd>
        </div>
      </dl>

      <p className="mt-5 text-[13px] leading-relaxed text-fg-muted">{pkg.description}</p>

      <ul className="mt-5 space-y-2">
        {[
          `Matures at ${formatUSD(pkg.maturityAmount)}`,
          `${formatUSD(profit)} above capital at maturity`,
          "Withdraw or roll over at maturity",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12.5px] text-fg-muted">
            <Check className="mt-0.5 size-3.5 shrink-0 text-accent-400" aria-hidden />
            {item}
          </li>
        ))}
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
                featured={index === 2}
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
