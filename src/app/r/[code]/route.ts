import { NextResponse, type NextRequest } from "next/server";

import { resolveReferralCode } from "@/server/services/referrals";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The public face of a referral link: /r/stanleyokafor-7F3K9Q
 *
 * Short enough to send in a WhatsApp message and read out loud, which is how
 * these are actually shared. It sets a cookie as well as passing the code on
 * the URL, so somebody who lands here, reads the packages first and registers
 * an hour later is still attributed to the person who introduced them.
 *
 * An unknown code redirects to registration without one rather than showing an
 * error. Whoever followed the link did not choose it, and a typo in somebody
 * else's message should not read as "you are not welcome here".
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const referrerId = await resolveReferralCode(code);

  const target = new URL("/register", request.url);
  if (referrerId) target.searchParams.set("ref", code.trim().toLowerCase());

  const response = NextResponse.redirect(target);

  if (referrerId) {
    response.cookies.set(REFERRAL_COOKIE, code.trim().toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
  }

  return response;
}
