/**
 * Setting registry: defaults, types and metadata.
 *
 * Deliberately free of `server-only` and of any database import so that seed
 * scripts and tests can consume the same single source of truth the running
 * application uses.
 */

export const SETTING_DEFAULTS = {
  // --- General / company ---------------------------------------------------
  "company.name": "Monoceros",
  "company.legalName": "",
  "company.tagline": "Automated market intelligence. Structured investment management.",
  "company.description":
    "Monoceros provides investors with a streamlined platform for managing investment subscriptions powered by an externally operated automated trading infrastructure across global markets.",
  "company.address": "",
  "company.registrationNumber": "",
  "company.regulatoryNotice": "",
  "general.country": "Nigeria",
  "general.timezone": "Africa/Lagos",
  "general.currency": "USD",

  // --- Support -------------------------------------------------------------
  "support.email": "support@example.com",
  "support.whatsapp": "",
  "support.phone": "",
  "support.hours": "Monday to Friday, 9:00 – 18:00 WAT",

  // --- Social --------------------------------------------------------------
  "social.x": "",
  "social.facebook": "",
  "social.instagram": "",
  "social.linkedin": "",
  "social.telegram": "",

  // --- Homepage content ----------------------------------------------------
  "content.announcement": "",
  "content.heroHeadline": "Automated Market Intelligence.",
  "content.heroHeadlineAccent": "Structured Investment Management.",
  "content.heroSubheadline":
    "Monoceros provides investors with a streamlined platform for managing investment subscriptions powered by an externally operated automated trading infrastructure across global markets.",
  "content.explainerVideoUrl": "",

  // --- Payments ------------------------------------------------------------
  "payment.asset": "USDT",
  /**
   * One receiving address per deposit network. All are intentionally blank:
   * every address must be confirmed and entered by an admin. Investors may
   * only pay on a network whose address is set here.
   */
  "payment.wallet.TRC20": "",
  "payment.wallet.BEP20": "",
  "payment.wallet.ERC20": "",
  "payment.wallet.POLYGON": "",
  "payment.wallet.SOLANA": "",
  "payment.instructions":
    "Send the exact amount shown using the displayed network only. After sending, submit your transaction hash so the finance team can verify the transfer.",
  "payment.minConfirmations": 1,
  "payment.allowedNetworks": ["TRC20", "ERC20", "BEP20", "POLYGON", "SOLANA"] as string[],

  // --- Investment engine ---------------------------------------------------
  /** 0 = Sunday … 5 = Friday */
  "cycle.weekday": 5,
  "cycle.time": "00:00",
  "investment.durationDays": 30,
  /** 0 means no limit. */
  "investment.maxActivePerUser": 0,
  "rollover.mode": "SAME_PACKAGE_PERCENTAGE",
  "rollover.waitsForCycle": true,

  // --- Withdrawals ---------------------------------------------------------
  "withdrawal.methods": ["USDT_WALLET"] as string[],
  "withdrawal.requirePasswordConfirmation": true,
  "withdrawal.minAmount": 0,
  "withdrawal.instructions":
    "Withdrawals are reviewed and settled manually by the finance team. Confirm your destination wallet carefully — transfers cannot be reversed.",

  // --- KYC -----------------------------------------------------------------
  "kyc.ninRequired": true,
  "kyc.allowedIdTypes": [
    "NIN_SLIP",
    "NATIONAL_ID",
    "INTERNATIONAL_PASSPORT",
    "DRIVERS_LICENCE",
    "VOTERS_CARD",
  ] as string[],
  "kyc.minimumAge": 18,
  "kyc.country": "Nigeria",
  "kyc.maxUploadMb": 8,
  "kyc.notice":
    "Identity verification is required under anti-money-laundering rules and protects your account from impersonation. Your documents are stored privately and are only accessible to authorised compliance staff.",

  // --- Notifications -------------------------------------------------------
  "notify.emailEnabled": true,
  "notify.dashboardEnabled": true,

  // --- Maintenance ---------------------------------------------------------
  "maintenance.enabled": false,
  "maintenance.message":
    "Monoceros is undergoing scheduled maintenance. Please check back shortly.",
} as const;

/**
 * The defaults are declared `as const` so the key list is exact, but the
 * VALUE types must be widened — a stored setting is any string, not the
 * literal shipped as its default.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = Widen<(typeof SETTING_DEFAULTS)[K]>;
export type SettingsMap = { [K in SettingKey]: SettingValue<K> };

export const SETTING_META: Record<SettingKey, { group: string; label: string; description?: string }> = {
  "company.name": { group: "general", label: "Company name" },
  "company.legalName": { group: "general", label: "Registered legal name" },
  "company.tagline": { group: "general", label: "Tagline" },
  "company.description": { group: "general", label: "Company description" },
  "company.address": { group: "general", label: "Registered address" },
  "company.registrationNumber": {
    group: "legal",
    label: "Company registration number",
    description: "Leave blank until an official number is available. Never publish an unverified value.",
  },
  "company.regulatoryNotice": {
    group: "legal",
    label: "Regulatory notice",
    description: "Displayed on legal pages. Only enter statements you can evidence.",
  },
  "general.country": { group: "general", label: "Operating country" },
  "general.timezone": { group: "general", label: "Business timezone" },
  "general.currency": { group: "general", label: "Display currency" },
  "support.email": { group: "support", label: "Support email" },
  "support.whatsapp": { group: "support", label: "WhatsApp number", description: "International format, e.g. 2348012345678" },
  "support.phone": { group: "support", label: "Support phone" },
  "support.hours": { group: "support", label: "Support hours" },
  "social.x": { group: "social", label: "X (Twitter) URL" },
  "social.facebook": { group: "social", label: "Facebook URL" },
  "social.instagram": { group: "social", label: "Instagram URL" },
  "social.linkedin": { group: "social", label: "LinkedIn URL" },
  "social.telegram": { group: "social", label: "Telegram URL" },
  "content.announcement": { group: "content", label: "Homepage announcement bar" },
  "content.heroHeadline": { group: "content", label: "Hero headline (line 1)" },
  "content.heroHeadlineAccent": { group: "content", label: "Hero headline (line 2)" },
  "content.heroSubheadline": { group: "content", label: "Hero supporting copy" },
  "content.explainerVideoUrl": { group: "content", label: "Explainer video URL" },
  "payment.asset": { group: "payments", label: "Payment asset" },
  "payment.wallet.TRC20": {
    group: "payments",
    label: "TRC-20 (Tron) receiving address",
    description: "Leave blank to hide this network from investors. Starts with T, 34 characters.",
  },
  "payment.wallet.BEP20": {
    group: "payments",
    label: "BEP-20 (BNB Smart Chain) receiving address",
    description: "Leave blank to hide this network from investors. Starts with 0x, 42 characters.",
  },
  "payment.wallet.ERC20": {
    group: "payments",
    label: "ERC-20 (Ethereum) receiving address",
    description: "Leave blank to hide this network from investors. Starts with 0x, 42 characters.",
  },
  "payment.wallet.POLYGON": {
    group: "payments",
    label: "Polygon receiving address",
    description: "Leave blank to hide this network from investors. Starts with 0x, 42 characters.",
  },
  "payment.wallet.SOLANA": {
    group: "payments",
    label: "Solana receiving address",
    description: "Leave blank to hide this network from investors.",
  },
  "payment.instructions": { group: "payments", label: "Payment instructions" },
  "payment.minConfirmations": { group: "payments", label: "Minimum confirmations" },
  "payment.allowedNetworks": { group: "payments", label: "Selectable networks" },
  "cycle.weekday": { group: "investments", label: "Cycle weekday", description: "0 = Sunday … 6 = Saturday" },
  "cycle.time": { group: "investments", label: "Cycle opening time (HH:mm)" },
  "investment.durationDays": { group: "investments", label: "Investment duration (days)" },
  "investment.maxActivePerUser": {
    group: "investments",
    label: "Max active investments per user",
    description: "0 means unlimited.",
  },
  "rollover.mode": { group: "investments", label: "Rollover calculation" },
  "rollover.waitsForCycle": { group: "investments", label: "Rollover waits for next cycle" },
  "withdrawal.methods": { group: "withdrawals", label: "Enabled withdrawal methods" },
  "withdrawal.requirePasswordConfirmation": {
    group: "withdrawals",
    label: "Require password confirmation",
  },
  "withdrawal.minAmount": { group: "withdrawals", label: "Minimum withdrawal amount" },
  "withdrawal.instructions": { group: "withdrawals", label: "Withdrawal instructions" },
  "kyc.ninRequired": { group: "kyc", label: "NIN required" },
  "kyc.allowedIdTypes": { group: "kyc", label: "Accepted identity documents" },
  "kyc.minimumAge": { group: "kyc", label: "Minimum age" },
  "kyc.country": { group: "kyc", label: "Accepted country" },
  "kyc.maxUploadMb": { group: "kyc", label: "Maximum upload size (MB)" },
  "kyc.notice": { group: "kyc", label: "Verification notice shown to users" },
  "notify.emailEnabled": { group: "notifications", label: "Email notifications enabled" },
  "notify.dashboardEnabled": { group: "notifications", label: "In-app notifications enabled" },
  "maintenance.enabled": { group: "maintenance", label: "Maintenance mode" },
  "maintenance.message": { group: "maintenance", label: "Maintenance message" },
};

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

// ---------------------------------------------------------------------------
// Deposit networks
// ---------------------------------------------------------------------------

/**
 * Networks an investor may deposit on, in the order they are offered.
 *
 * A network is only actually offered when its `payment.wallet.<NETWORK>`
 * address is set, so this list is the menu, not the availability.
 */
export const DEPOSIT_NETWORKS = ["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"] as const;

export type DepositNetwork = (typeof DEPOSIT_NETWORKS)[number];

/** Investor-facing names — the bare codes are ambiguous to non-technical users. */
export const DEPOSIT_NETWORK_LABEL: Record<DepositNetwork, string> = {
  TRC20: "TRC-20 (Tron)",
  BEP20: "BEP-20 (BNB Smart Chain)",
  ERC20: "ERC-20 (Ethereum)",
  POLYGON: "Polygon",
  SOLANA: "Solana",
};

export function depositWalletKey(network: DepositNetwork): SettingKey {
  return `payment.wallet.${network}` as SettingKey;
}
