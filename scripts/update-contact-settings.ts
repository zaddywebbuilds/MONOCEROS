import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { SETTING_META } from "../src/lib/settings-registry";

/**
 * One-off provisioning of company contact details and deposit wallets.
 *
 * Wallet addresses are transcribed from the owner's wallet screenshots and
 * cross-checked against the forwarded text of the same addresses.
 */
const UPDATES: Record<string, string> = {
  "company.address":
    "Silom Complex Building, 191 Silom Road, Silom, Bangrak, Bangkok, Thailand",
  "support.phone": "+66820785928",
  "social.telegram": "https://t.me/+K5fLlMMi02EyY2Rk",
  "payment.wallet.BEP20": "0xC99B839fB6f7d922728AeDDb17ED958Ea13898C8",
  "payment.wallet.TRC20": "TBDNNRNN8mtqLpU5pXYN2ua6nmH8JZzJhq",
};

async function main() {
  for (const [key, value] of Object.entries(UPDATES)) {
    const meta = SETTING_META[key as keyof typeof SETTING_META];
    await prisma.siteSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        group: meta.group,
        label: meta.label,
        description: meta.description ?? null,
        updatedById: null,
      },
      update: { value },
    });
    console.log(`OK  ${key}`);
    console.log(`    ${value}`);
  }

  // Read back from the database so the printed values are what was stored,
  // not what was intended.
  console.log("\n--- verification (read back from database) ---");
  const stored = await prisma.siteSetting.findMany({
    where: { key: { in: Object.keys(UPDATES) } },
    select: { key: true, value: true },
    orderBy: { key: "asc" },
  });
  for (const row of stored) {
    const value = String(row.value);
    const match = UPDATES[row.key] === value ? "MATCH" : "MISMATCH";
    console.log(`${match}  ${row.key}  len=${value.length}`);
    console.log(`       ${value}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
