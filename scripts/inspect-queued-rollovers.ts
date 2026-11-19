import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { money, applyReturn } from "../src/lib/money";

async function main() {
  const rollovers = await prisma.rollover.findMany({
    include: {
      newInvestment: true,
      sourceInvestment: true,
      user: { include: { profile: true } },
    },
    where: {
      newInvestment: { status: "QUEUED" },
    },
  });

  console.log(`QUEUED rollover investments found: ${rollovers.length}\n`);

  for (const r of rollovers) {
    const inv = r.newInvestment;
    const src = r.sourceInvestment;
    const name = r.user.profile
      ? `${r.user.profile.firstName} ${r.user.profile.surname}`
      : r.user.username;

    const srcPrincipal = money(src.principalAmount);
    const srcMaturity = money(src.maturityAmount);
    const profit = srcMaturity.minus(srcPrincipal);
    const isFullRollover = money(r.rolledAmount).equals(srcMaturity);
    const rolloverKind = isFullRollover ? "FULL" : "PRINCIPAL_ONLY";

    console.log(`Rollover ref     : ${r.reference}`);
    console.log(`Investor         : ${name} (${r.user.email})`);
    console.log(`Source invest    : ${src.reference}  (${src.packageNameSnapshot})`);
    console.log(`New investment   : ${inv.reference}  status=${inv.status}`);
    console.log(`Source maturity  : $${srcMaturity.toFixed(2)}`);
    console.log(`Source principal : $${srcPrincipal.toFixed(2)}`);
    console.log(`Profit           : $${profit.toFixed(2)}`);
    console.log(`Rolled amount    : $${money(r.rolledAmount).toFixed(2)}`);
    console.log(`Rollover type    : ${rolloverKind}`);
    console.log(`New inv principal: $${money(inv.principalAmount).toFixed(2)}`);
    console.log(`New inv maturity : $${money(inv.maturityAmount).toFixed(2)}`);
    if (!isFullRollover) {
      const fullMaturity = applyReturn(srcMaturity, money(r.appliedPercentage));
      console.log(`  → FULL fix: principal=$${srcMaturity.toFixed(2)}, maturity=$${fullMaturity.toFixed(2)}`);
    }
    console.log("");
  }

  // Also check for related profit withdrawals
  if (rollovers.length > 0) {
    const sourceIds = rollovers.map(r => r.sourceInvestmentId);
    const profitWithdrawals = await prisma.withdrawal.findMany({
      where: {
        investmentId: { in: sourceIds },
        status: { in: ["PENDING", "UNDER_REVIEW"] },
      },
      select: { id: true, reference: true, investmentId: true, amount: true, status: true },
    });
    console.log("Profit withdrawals linked to these rollovers:");
    if (profitWithdrawals.length === 0) {
      console.log("  None found.");
    } else {
      for (const w of profitWithdrawals) {
        const src = rollovers.find(r => r.sourceInvestmentId === w.investmentId);
        console.log(`  ${w.reference}  amount=$${money(w.amount).toFixed(2)}  status=${w.status}  (source: ${src?.sourceInvestment.reference})`);
      }
    }
  }
}

main()
  .catch((e) => { console.error("ERR:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
