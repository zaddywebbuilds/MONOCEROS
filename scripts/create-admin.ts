import "dotenv/config";

import readline from "node:readline";
import { stdin, stdout } from "node:process";

import { prisma } from "../src/lib/prisma";
import { hashPassword, evaluatePassword } from "../src/lib/auth/password";
import { nextReference } from "../src/lib/references";

/**
 * Administrator bootstrap.
 *
 * Two ways to run it:
 *
 *   1. Interactively (recommended, nothing is written to your shell history):
 *        npm run admin:create
 *
 *   2. From environment variables, for automated provisioning:
 *        ADMIN_ONE_EMAIL=... ADMIN_ONE_PASSWORD=... ADMIN_ONE_NAME="..." npm run admin:create
 *
 * Passwords are never logged, never stored in plain text and never hard-coded.
 */

interface AdminInput {
  email: string;
  password: string;
  name: string;
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Reads a line without echoing it to the terminal. */
function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    const asMutable = rl as unknown as { _writeToOutput?: (text: string) => void };
    const original = asMutable._writeToOutput;

    asMutable._writeToOutput = (text: string) => {
      if (text.includes(question)) original?.call(rl, text);
      else original?.call(rl, "");
    };

    rl.question(question, (answer) => {
      asMutable._writeToOutput = original;
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });
  });
}

function fromEnvironment(): AdminInput[] {
  const entries: AdminInput[] = [];

  for (const slot of ["ONE", "TWO"] as const) {
    const email = process.env[`ADMIN_${slot}_EMAIL`];
    const password = process.env[`ADMIN_${slot}_PASSWORD`];
    const name = process.env[`ADMIN_${slot}_NAME`];

    if (email && password) {
      entries.push({ email: email.toLowerCase(), password, name: name || email.split("@")[0]! });
    }
  }

  return entries;
}

async function collectInteractively(): Promise<AdminInput[]> {
  const admins: AdminInput[] = [];

  const existing = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  const howMany = existing >= 2 ? 1 : 2 - existing;

  console.info(
    `\nMonoceros expects two administrator accounts with equal permissions.\n` +
      `${existing} currently exist; this will create ${howMany}.\n`,
  );

  for (let index = 0; index < howMany; index += 1) {
    console.info(`--- Administrator ${existing + index + 1} ---`);

    const email = (await ask("Email address: ")).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`"${email}" is not a valid email address.`);
    }

    const name = await ask("Display name: ");
    if (name.length < 2) throw new Error("Display name must be at least 2 characters.");

    const password = await askSecret("Password (hidden): ");
    const confirm = await askSecret("Confirm password (hidden): ");

    if (password !== confirm) throw new Error("Passwords do not match.");

    const strength = evaluatePassword(password);
    if (!strength.valid) {
      const failed = strength.checks.filter((check) => !check.passed).map((c) => c.label);
      throw new Error(`Password is too weak. Missing: ${failed.join(", ")}.`);
    }

    admins.push({ email, password, name });
    console.info("");
  }

  return admins;
}

async function createAdmin(input: AdminInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    if (existing.role === "ADMIN" || existing.role === "SUPER_ADMIN") {
      console.info(`· ${input.email} is already an administrator — skipped.`);
      return;
    }
    throw new Error(
      `${input.email} already exists as a ${existing.role} account. Refusing to change its role automatically.`,
    );
  }

  const strength = evaluatePassword(input.password);
  if (!strength.valid) {
    throw new Error(
      `Password for ${input.email} does not meet the policy (8+ characters, upper, lower, number).`,
    );
  }

  const passwordHash = await hashPassword(input.password);
  const [firstName, ...rest] = input.name.split(" ");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        reference: await nextReference("user", tx),
        email: input.email,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        kycStatus: "APPROVED",
        profile: {
          create: {
            firstName: firstName || "Admin",
            surname: rest.join(" ") || "User",
            dateOfBirth: new Date("1990-01-01T00:00:00Z"),
            phone: "+2348000000000",
            country: "Nigeria",
          },
        },
      },
    });

    await tx.adminProfile.create({
      data: {
        userId: user.id,
        displayName: input.name,
        jobTitle: "Administrator",
        requiresTwoFactor: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorEmail: "provisioning-script",
        action: "admin.created",
        entityType: "User",
        entityId: user.id,
        newValue: { email: input.email, role: "ADMIN" },
        reason: "Created by scripts/create-admin.ts",
      },
    });
  });

  console.info(`✓ Administrator created: ${input.email}`);
}

async function main() {
  const fromEnv = fromEnvironment();
  const admins = fromEnv.length > 0 ? fromEnv : await collectInteractively();

  if (admins.length === 0) {
    console.info("Nothing to do.");
    return;
  }

  for (const admin of admins) {
    await createAdmin(admin);
  }

  const total = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  console.info(`\n${total} administrator account(s) now exist. Sign in at /admin/login.\n`);

  if (fromEnv.length > 0) {
    console.info(
      "You used environment variables. Remove ADMIN_*_PASSWORD from your .env now that the\n" +
        "accounts exist — the password is stored only as a hash and the variable is no longer needed.\n",
    );
  }
}

main()
  .catch((error) => {
    console.error(`\nCould not create administrators: ${(error as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
