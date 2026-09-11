/**
 * Read out the deposit wallet addresses investors are currently shown.
 *
 * READ-ONLY. This script never writes a setting. Wallet addresses are only
 * ever changed from a value the owner supplies at the time — never inferred,
 * never restored from a previous reading of this script.
 *
 * A crypto deposit sent to a mistyped address is gone permanently, and the
 * mistake is invisible: the payment screen looks perfectly normal whether the
 * address is right or wrong. The only moment it can be caught is before the
 * first investor pays.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/verify-wallets.ts
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  DEPOSIT_NETWORKS,
  DEPOSIT_NETWORK_LABEL,
  depositWalletKey,
  type DepositNetwork,
} from "../src/lib/settings-registry";
import { checkEvm, checkTron, type AddressCheck } from "./wallet-checks";

const CHECKER: Partial<Record<DepositNetwork, (a: string) => AddressCheck>> = {
  TRC20: checkTron,
  BEP20: checkEvm,
  ERC20: checkEvm,
  POLYGON: checkEvm,
};

/** Grouped so a human can compare against a wallet app without losing their place. */
function chunk(address: string): string {
  return (address.match(/.{1,4}/g) ?? []).join(" ");
}

async function main() {
  const keys = DEPOSIT_NETWORKS.map(depositWalletKey);
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  console.log("\nDeposit wallets currently shown to investors");
  console.log("(read-only — this script changes nothing)\n");

  const live: DepositNetwork[] = [];

  for (const network of DEPOSIT_NETWORKS) {
    const row = byKey.get(depositWalletKey(network));
    const address = typeof row?.value === "string" ? row.value.trim() : "";
    const label = DEPOSIT_NETWORK_LABEL[network];

    if (!address) {
      console.log(`  ${label}\n    not offered — no address set\n`);
      continue;
    }

    live.push(network);
    const result = CHECKER[network]?.(address) ?? { ok: true, detail: "no automatic check" };

    console.log(`  ${label}`);
    console.log(`    ${address}`);
    console.log(`    ${chunk(address)}`);
    console.log(`    ${address.length} characters  ·  ${result.ok ? "OK" : "PROBLEM"} — ${result.detail}`);
    if (row?.updatedAt) console.log(`    last changed ${row.updatedAt.toISOString()}`);
    console.log();
  }

  if (live.length === 0) {
    console.log("  No deposit network is available. Investors cannot subscribe.\n");
  } else {
    console.log(`  Networks offered: ${live.join(", ")}\n`);
  }

  console.log("  Checksums cannot tell you the address belongs to YOU.");
  console.log("  Open your own wallet app and compare the first six and last six");
  console.log("  characters of each address above against the receiving address there.\n");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
