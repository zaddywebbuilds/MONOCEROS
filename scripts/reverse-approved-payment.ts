import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { transition } from "../src/server/services/investments";
import { recordTransaction } from "../src/server/services/ledger";
import { writeAudit } from "../src/lib/audit";

/**
 * Undo a payment approval that should never have been given.
 *
 * The admin panel cannot do this. Rejection is only offered while a payment is
 * still awaiting review, on the assumption that an approval means money was
 * seen. When an approval turns out to be wrong — a transaction hash that
 * belongs to somebody else's transfer, or to a different chain, or to a date
 * long before the investor claims to have paid — the investment is already
 * queued and there is no route back.
 *
 * Leaving it is the worse option. A queued investment activates on the next
 * cycle, emails the investor to say their money is working, and matures into a
 * balance they can ask to withdraw. None of that is reversible once it has been
 * seen by the person it concerns.
 *
 * Named references only, dry run unless --apply, and it refuses anything that
 * has already activated. An investment that is ACTIVE or beyond has been
 * announced to the investor and possibly paid out against; unwinding that is a
 * conversation, not a script.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/reverse-approved-payment.ts MON-INV-2026-000010 --reason "..."
 *   ... --apply
 */

const REVERSIBLE = ["QUEUED", "PAYMENT_SUBMITTED", "PAYMENT_UNDER_REVIEW", "PAYMENT_PENDING"] as const;

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");

  let reason = "Payment could not be verified on the blockchain.";
  const refs: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--reason") {
      if (args[i + 1]) reason = args[i + 1];
      i += 1; // consume the value so it is never mistaken for a reference
    } else if (!arg.startsWith("--")) {
      refs.push(arg);
    }
  }

  if (refs.length === 0) {
    console.error("Name the investment reference(s), e.g. MON-INV-2026-000010");
    process.exit(1);
  }

  for (const ref of refs) {
    const investment = await prisma.investment.findUnique({
      where: { reference: ref },
      include: { payments: true, user: { select: { id: true, email: true } } },
    });

    if (!investment) {
      console.log(`✗ ${ref} — not found`);
      continue;
    }
    if (!REVERSIBLE.includes(investment.status as (typeof REVERSIBLE)[number])) {
      console.log(`✗ ${ref} — status is ${investment.status}; too late for a script. Handle it with the owner.`);
      continue;
    }

    const payments = investment.payments.filter((p) => p.status !== "REJECTED");

    console.log(`\n${ref}  ${investment.user.email}`);
    console.log(`  investment  ${investment.status} -> CANCELLED   $${investment.principalAmount} (matures to $${investment.maturityAmount})`);
    for (const p of payments) {
      console.log(`  payment     ${p.reference} ${p.status} -> REJECTED   ${p.network} $${p.expectedAmount}`);
      console.log(`  hash        ${p.transactionHash ?? "(none)"}`);
    }

    if (!apply) {
      console.log("  (dry run, nothing changed)");
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const p of payments) {
        await tx.payment.update({
          where: { id: p.id },
          data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date() },
        });
      }

      await transition(investment, "CANCELLED", tx, { reason, data: { closedAt: new Date() } });

      await recordTransaction(
        {
          userId: investment.userId,
          investmentId: investment.id,
          type: "DEPOSIT_REJECTED",
          status: "CANCELLED",
          amount: investment.principalAmount,
          description: `Approval of ${ref} reversed: payment could not be verified`,
          metadata: { reason },
        },
        tx,
      );
    });

    await writeAudit({
      actor: null,
      action: "payment.approval_reversed",
      entityType: "Investment",
      entityId: investment.id,
      oldValue: {
        investmentStatus: investment.status,
        payments: payments.map((p) => ({ reference: p.reference, status: p.status, hash: p.transactionHash })),
      },
      newValue: { investmentStatus: "CANCELLED", payments: "REJECTED" },
      reason,
    });

    console.log("  reversed.");
  }

  if (!apply) console.log("\nRe-run with --apply to carry this out.");
}

main()
  .catch((err) => {
    console.error("Failed:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
