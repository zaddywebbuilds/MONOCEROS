"use client";

import * as React from "react";
import { ArrowRight, CalendarDays, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

/**
 * What a given amount actually buys.
 *
 * This is deliberately not a free-form projection. `createInvestment` sets an
 * investment's principal to the package's own capital and its maturity to the
 * package's own recorded maturity amount — there is no path to subscribe with an
 * arbitrary figure. So quoting a return on "$1,750" would describe a product
 * that does not exist, and someone would fund it before discovering that.
 *
 * Instead the amount is allocated across the real packages, and every figure
 * shown is one the platform will actually honour. Because packages with more
 * capital carry the higher return, filling from the largest down is also the
 * best use of the money.
 *
 * Nothing here forecasts anything: a package's maturity amount is a fixed term
 * agreed at subscription, not a prediction of market performance.
 */

export interface CalculatorPackage {
  name: string;
  slug: string;
  capital: number;
  returnPct: number;
  maturity: number;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface Pick {
  pkg: CalculatorPackage;
  count: number;
}

/** Fills from the largest package down, which here is also the best return. */
function allocate(amount: number, packages: CalculatorPackage[]) {
  const sorted = [...packages].sort((a, b) => b.capital - a.capital);
  let left = amount;
  const picks: Pick[] = [];

  for (const pkg of sorted) {
    if (pkg.capital <= 0) continue;
    const count = Math.floor(left / pkg.capital);
    if (count > 0) {
      picks.push({ pkg, count });
      left -= count * pkg.capital;
    }
  }

  const capital = picks.reduce((sum, p) => sum + p.count * p.pkg.capital, 0);
  const maturity = picks.reduce((sum, p) => sum + p.count * p.pkg.maturity, 0);

  return { picks, capital, maturity, profit: maturity - capital, unallocated: left };
}

export function ReturnCalculator({
  packages,
  cycleLabel,
  maturityLabel,
  durationDays,
  ctaHref,
}: {
  packages: CalculatorPackage[];
  /** The real next cycle opening, formatted on the server. */
  cycleLabel: string;
  /** That opening plus the term, formatted on the server. */
  maturityLabel: string;
  durationDays: number;
  ctaHref: string;
}) {
  const smallest = React.useMemo(
    () => Math.min(...packages.map((p) => p.capital)),
    [packages],
  );
  const largest = React.useMemo(() => Math.max(...packages.map((p) => p.capital)), [packages]);

  // Deliberately the smallest package: a calculator that opens pre-filled with
  // the largest commitment is nudging, not informing.
  const [amount, setAmount] = React.useState(() => smallest);

  const result = React.useMemo(() => allocate(amount, packages), [amount, packages]);
  const step = Math.max(50, Math.round(smallest / 10));
  const max = largest * 2;

  const tooSmall = amount < smallest;

  return (
    <div className="surface relative overflow-hidden p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* Input */}
        <div>
          <label
            htmlFor="calc-amount"
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Amount you want to commit
          </label>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-fg-subtle">$</span>
            <input
              id="calc-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={step}
              value={amount}
              onChange={(event) => {
                const next = Number(event.target.value);
                setAmount(Number.isFinite(next) && next >= 0 ? next : 0);
              }}
              className="w-full min-w-0 border-0 bg-transparent p-0 text-4xl font-semibold tabular-nums tracking-tight text-fg outline-none focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <input
            type="range"
            aria-label="Amount you want to commit"
            min={0}
            max={max}
            step={step}
            value={Math.min(amount, max)}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent-500"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {packages
              .slice()
              .sort((a, b) => a.capital - b.capital)
              .map((pkg) => (
                <button
                  key={pkg.slug}
                  type="button"
                  onClick={() => setAmount(pkg.capital)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    amount === pkg.capital
                      ? "border-accent-600 bg-accent-900/50 text-accent-200"
                      : "border-ink-600 bg-ink-850 text-fg-muted hover:border-accent-700/70 hover:text-fg",
                  )}
                >
                  {pkg.name} · {usd.format(pkg.capital)}
                </button>
              ))}
          </div>

          {/* What that amount actually buys */}
          <div className="mt-7 border-t border-ink-700/60 pt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
              That buys
            </p>

            {tooSmall ? (
              <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
                The smallest package is {usd.format(smallest)}. Below that there is nothing to
                subscribe to.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.picks.map(({ pkg, count }) => (
                  <li
                    key={pkg.slug}
                    className="flex items-center justify-between gap-3 text-[13.5px]"
                  >
                    <span className="text-fg">
                      {count > 1 ? `${count} × ` : ""}
                      {pkg.name}
                      <span className="text-fg-subtle"> · {pkg.returnPct}%</span>
                    </span>
                    <span className="tabular-nums text-fg-muted">
                      {usd.format(count * pkg.capital)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {result.unallocated > 0 && !tooSmall ? (
              <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-fg-subtle">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {usd.format(result.unallocated)} left over — short of another package, so it is not
                included below.
              </p>
            ) : null}
          </div>
        </div>

        {/* Outcome */}
        <div className="rounded-xl border border-ink-700/70 bg-ink-950/40 p-5 sm:p-6">
          <dl className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-fg-muted">Capital in</dt>
              <dd className="text-lg font-semibold tabular-nums text-fg">
                {usdExact.format(result.capital)}
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-4 border-t border-ink-700/60 pt-4">
              <dt className="text-[13px] text-fg-muted">At maturity</dt>
              <dd className="text-2xl font-semibold tabular-nums text-emerald-400">
                {usdExact.format(result.maturity)}
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-fg-muted">Above your capital</dt>
              <dd className="text-lg font-semibold tabular-nums text-accent-300">
                {usdExact.format(result.profit)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2.5 border-t border-ink-700/60 pt-5">
            <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-fg-muted">
              <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-accent-400" aria-hidden />
              <span>
                Subscribe and pay now and it joins the cycle opening{" "}
                <span className="text-fg">{cycleLabel}</span>, maturing{" "}
                <span className="text-fg">{maturityLabel}</span> after {durationDays} days.
              </span>
            </p>
          </div>

          <ButtonLink href={ctaHref} className="mt-6" block>
            View the packages
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>

      <p className="mt-7 border-t border-ink-700/60 pt-5 text-[12px] leading-relaxed text-fg-subtle">
        These are the package terms themselves, not a forecast: the amount at maturity is fixed on
        your investment when you subscribe and does not move with the market. Every subscription is
        one package at its stated capital — there is no way to invest an arbitrary figure, which is
        why an amount is split across packages here. Capital is at risk.
      </p>
    </div>
  );
}
