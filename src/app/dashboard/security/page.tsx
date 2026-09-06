import type { Metadata } from "next";
import { Laptop, ShieldCheck } from "lucide-react";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import {
  ChangePasswordForm,
  RevokeSessionsButton,
  WithdrawalWalletForm,
} from "@/components/dashboard/account-forms";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatBusinessDateTime } from "@/lib/time";
import { truncateMiddle } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await requireUser("/dashboard/security");

  const [profile, settings, sessions, walletChanges, loginEvents] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    getSettings(),
    prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
      take: 10,
    }),
    prisma.walletChangeLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.loginEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <DashboardPage>
      <PageTitle
        title="Security"
        description="Your password, withdrawal destination, active sessions and recent sign-in activity."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Section title="Password" className="mt-0">
            <Card className="p-5 sm:p-6">
              <ChangePasswordForm />
              <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
                Changing your password signs out every other device automatically.
              </p>
            </Card>
          </Section>

          <Section title="Withdrawal wallet" className="mt-0">
            <Card className="p-5 sm:p-6">
              {profile?.withdrawalWalletAddress ? (
                <div className="mb-5 rounded-lg border border-ink-700 bg-ink-880/50 p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                    Current default
                  </p>
                  <p className="mt-1.5 font-mono text-[12px] text-fg">
                    {profile.withdrawalWalletNetwork} ·{" "}
                    {truncateMiddle(profile.withdrawalWalletAddress, 12, 8)}
                  </p>
                </div>
              ) : (
                <InfoNote className="mb-5">
                  You have not saved a withdrawal wallet yet. You can also enter one at the moment
                  you request a withdrawal.
                </InfoNote>
              )}

              <WithdrawalWalletForm
                networks={settings["payment.allowedNetworks"]}
                savedAddress={profile?.withdrawalWalletAddress ?? null}
                savedNetwork={profile?.withdrawalWalletNetwork ?? null}
              />
            </Card>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Active sessions" className="mt-0">
            <Card className="p-5">
              <ul className="space-y-3">
                {sessions.map((session) => (
                  <li key={session.id} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-fg-muted">
                      <Laptop className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] text-fg">
                        {session.userAgent?.slice(0, 60) ?? "Unknown device"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                        {session.ipAddress ?? "unknown IP"} · last active{" "}
                        {formatBusinessDateTime(session.lastActiveAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-ink-700/60 pt-4">
                <RevokeSessionsButton />
              </div>
            </Card>
          </Section>

          <Section title="Recent sign-in activity" className="mt-0">
            <Card className="p-5">
              <ul className="space-y-2.5">
                {loginEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 border-b border-ink-700/50 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p
                        className={
                          event.success
                            ? "text-[12.5px] text-fg"
                            : "text-[12.5px] text-status-rejected"
                        }
                      >
                        {event.success ? "Successful sign-in" : "Failed sign-in attempt"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                        {event.ipAddress ?? "unknown IP"}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11.5px] text-fg-subtle">
                      {formatBusinessDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          {walletChanges.length > 0 ? (
            <Section title="Withdrawal wallet history" className="mt-0">
              <Card className="p-5">
                <ul className="space-y-3">
                  {walletChanges.map((change) => (
                    <li key={change.id} className="border-l border-ink-700 pl-3.5">
                      <p className="font-mono text-[11.5px] text-fg">
                        {change.newNetwork} · {truncateMiddle(change.newAddress, 10, 6)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                        {formatBusinessDateTime(change.createdAt)}
                        {change.ipAddress ? ` · ${change.ipAddress}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}

          <InfoNote tone="warning">
            <span className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Monoceros will never ask for your password, a verification code, or a wallet
                recovery phrase. If someone does, it is not us.
              </span>
            </span>
          </InfoNote>
        </div>
      </div>
    </DashboardPage>
  );
}
