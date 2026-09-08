import "server-only";

/**
 * Database-backed configuration access.
 *
 * The registry of keys, defaults and metadata lives in settings-registry.ts so
 * that seed scripts and tests share exactly the same definitions.
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEPOSIT_NETWORKS,
  DEPOSIT_NETWORK_LABEL,
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
  depositWalletKey,
  type DepositNetwork,
  type SettingKey,
  type SettingValue,
  type SettingsMap,
} from "@/lib/settings-registry";


function withDefaults(rows: { key: string; value: unknown }[]): SettingsMap {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = {} as Record<string, unknown>;
  for (const key of SETTING_KEYS) {
    result[key] = stored.has(key) ? stored.get(key) : SETTING_DEFAULTS[key];
  }
  return result as SettingsMap;
}

/** Loads every setting, falling back to the registry default. Per-request cached. */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const rows = await prisma.siteSetting.findMany();
  return withDefaults(rows);
});

/**
 * Settings for public marketing pages.
 *
 * The brochure site must stay up even if the database is briefly unreachable,
 * so this variant degrades to the registry defaults instead of throwing. It is
 * never used for anything that affects money or access control.
 */
export const getPublicSettings = cache(async (): Promise<SettingsMap> => {
  try {
    return await getSettings();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[settings] falling back to defaults:", error);
    return withDefaults([]);
  }
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const settings = await getSettings();
  return settings[key];
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  updatedById?: string,
): Promise<void> {
  const meta = SETTING_META[key];
  await prisma.siteSetting.upsert({
    where: { key },
    create: {
      key,
      value: value as never,
      group: meta.group,
      label: meta.label,
      description: meta.description ?? null,
      updatedById: updatedById ?? null,
    },
    update: { value: value as never, updatedById: updatedById ?? null },
  });
}

export interface DepositWallet {
  network: DepositNetwork;
  label: string;
  address: string;
}

/**
 * The networks investors may actually pay on: those with an address saved.
 *
 * Returned in registry order so the first entry is a stable default.
 */
export function configuredWallets(settings: SettingsMap): DepositWallet[] {
  return DEPOSIT_NETWORKS.map((network) => ({
    network,
    label: DEPOSIT_NETWORK_LABEL[network],
    address: String(settings[depositWalletKey(network)] ?? "").trim(),
  })).filter((wallet) => wallet.address.length > 0);
}

/** Looks up a single network's address, or null when it is not offered. */
export function walletFor(settings: SettingsMap, network: string): DepositWallet | null {
  return configuredWallets(settings).find((wallet) => wallet.network === network) ?? null;
}

/** Payment details are only shown once at least one wallet address is set. */
export function paymentConfigured(settings: SettingsMap): boolean {
  return configuredWallets(settings).length > 0;
}

export {
  DEPOSIT_NETWORKS,
  DEPOSIT_NETWORK_LABEL,
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
  depositWalletKey,
  type DepositNetwork,
  type SettingKey,
  type SettingValue,
  type SettingsMap,
};
