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
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
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

/** Payment details are only shown once an admin has configured both fields. */
export function paymentConfigured(settings: SettingsMap): boolean {
  return Boolean(settings["payment.network"]) && Boolean(settings["payment.walletAddress"]);
}

export {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
  type SettingKey,
  type SettingValue,
  type SettingsMap,
};
