import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const refs = process.argv.slice(2);
  const payments = await prisma.payment.findMany({
    where: refs.length ? { investment: { reference: { in: refs } } } : {},
    select: {
      reference: true,
      source: true,
      verification: true,
      status: true,
      investment: { select: { reference: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const p of payments) {
    console.log(`${p.reference}  inv:${p.investment.reference}  status:${p.status}  src:${p.source}  verify:${p.verification}`);
  }
}

main().finally(() => prisma.$disconnect());
