/**
 * Shared between the /r/<code> link handler and registration, which is why it
 * lives here rather than in either of them.
 */
export const REFERRAL_COOKIE = "mon_ref";

/** Thirty days: long enough to read the site and think about it. */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function referralLink(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/+$/, "")}/r/${code}`;
}
