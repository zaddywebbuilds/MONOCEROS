import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { SETTING_META } from "../src/lib/settings-registry";

const UPDATES: Record<string, string> = {
  "company.address":
    "Silom Complex Building, 191 Silom Road, Silom, Bangrak, Bangkok, Thailand",
  "support.phone": "+66820785928",
  "social.telegram": "https://t.me/+K5fLlMMi02EyY2Rk",
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
    console.log(`✓ ${key} = ${value}`);
  }
  console.log("\nDone. Settings updated.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
