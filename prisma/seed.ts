import "dotenv/config";

import { Prisma } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
} from "../src/lib/settings-registry";
import { SEED_FAQS, SEED_PACKAGES } from "./seed-data";

/**
 * Production seed.
 *
 * Idempotent and safe to run repeatedly. It creates only what a live platform
 * needs to start: settings, packages and FAQ entries. It creates no users, no
 * investments and no transactions — see seed-demo.ts for development data.
 */

function assertPackageArithmetic() {
  for (const pkg of SEED_PACKAGES) {
    const principal = new Prisma.Decimal(pkg.minimumCapital);
    const rate = new Prisma.Decimal(pkg.returnPercentage).div(100);
    const expected = principal
      .add(principal.mul(rate))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    if (!expected.equals(new Prisma.Decimal(pkg.maturityAmount))) {
      throw new Error(
        `Package "${pkg.name}" is inconsistent: ${pkg.minimumCapital} at ${pkg.returnPercentage}% is ${expected.toFixed(2)}, not ${pkg.maturityAmount}.`,
      );
    }
  }
}

async function seedSettings() {
  let created = 0;

  for (const key of SETTING_KEYS) {
    const meta = SETTING_META[key];
    const existing = await prisma.siteSetting.findUnique({ where: { key } });
    if (existing) continue;

    await prisma.siteSetting.create({
      data: {
        key,
        value: SETTING_DEFAULTS[key] as Prisma.InputJsonValue,
        group: meta.group,
        label: meta.label,
        description: meta.description ?? null,
      },
    });
    created += 1;
  }

  console.info(`settings: ${created} created, ${SETTING_KEYS.length - created} already present`);
}

async function seedPackages() {
  let created = 0;
  let updated = 0;

  for (const pkg of SEED_PACKAGES) {
    const existing = await prisma.package.findUnique({ where: { slug: pkg.slug } });

    const data = {
      name: pkg.name,
      minimumCapital: new Prisma.Decimal(pkg.minimumCapital),
      returnPercentage: new Prisma.Decimal(pkg.returnPercentage),
      maturityAmount: new Prisma.Decimal(pkg.maturityAmount),
      durationDays: pkg.durationDays,
      description: pkg.description,
      badge: pkg.badge,
      displayOrder: pkg.displayOrder,
      isActive: true,
    };

    if (existing) {
      // Only refresh presentation fields; never silently rewrite live pricing.
      await prisma.package.update({
        where: { slug: pkg.slug },
        data: { description: data.description, badge: data.badge, displayOrder: data.displayOrder },
      });
      updated += 1;
    } else {
      await prisma.package.create({ data: { slug: pkg.slug, ...data } });
      created += 1;
    }
  }

  console.info(`packages: ${created} created, ${updated} left with existing pricing`);
}

async function seedFaqs() {
  let created = 0;

  for (const faq of SEED_FAQS) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (existing) continue;

    await prisma.faq.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        displayOrder: faq.displayOrder,
        isActive: true,
      },
    });
    created += 1;
  }

  console.info(`faqs: ${created} created, ${SEED_FAQS.length - created} already present`);
}

async function main() {
  console.info("Seeding Monoceros…\n");

  assertPackageArithmetic();
  await seedSettings();
  await seedPackages();
  await seedFaqs();

  const admins = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });

  console.info("\nSeed complete.");
  if (admins === 0) {
    console.info(
      "No administrator accounts exist yet. Create the two administrators with:\n  npm run admin:create\n",
    );
  } else {
    console.info(`${admins} administrator account(s) already exist.\n`);
  }

  console.info(
    "Reminder: the payment network and company wallet address are intentionally blank.\n" +
      "Set them in Admin → Settings → Payments before investors can subscribe.\n",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
