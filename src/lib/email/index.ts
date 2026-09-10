import "server-only";

import { appUrl } from "@/lib/env";
import { emailDeliveryStatus, getEmailProvider } from "@/lib/email/provider";
import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/email/render";
import { getSettings } from "@/lib/settings";

/**
 * Transactional email service.
 *
 * Sending is always best-effort: a provider outage must never roll back an
 * approved payment or a created withdrawal. Failures are logged, not thrown.
 */

async function deliver(to: string, subject: string, content: EmailContent): Promise<boolean> {
  try {
    const settings = await getSettings();
    if (!settings["notify.emailEnabled"]) return false;

    // A console "send" succeeds without sending anything. Callers that tell a
    // user to go and check their inbox need to know the difference.
    const status = emailDeliveryStatus();
    if (!status.configured) {
      // eslint-disable-next-line no-console
      console.error(
        `[email] NOT SENT "${subject}" to ${to} — provider "${status.provider}" is not configured: ${status.reason}`,
      );
      return false;
    }

    const companyName = settings["company.name"] || "Monoceros";
    const provider = getEmailProvider();

    await provider.send({
      to,
      subject,
      html: renderEmailHtml(content, companyName),
      text: renderEmailText(content, companyName),
    });

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[email] failed to send "${subject}" to ${to}:`, error);
    return false;
  }
}

const link = (path: string) => `${appUrl}${path}`;

// ---------------------------------------------------------------------------
// Account lifecycle
// ---------------------------------------------------------------------------

export function sendWelcomeEmail(to: string, firstName: string, verifyUrl: string) {
  return deliver(to, "Confirm your Monoceros account", {
    preheader: "One step left — confirm your email address.",
    heading: `Welcome, ${firstName}.`,
    paragraphs: [
      "Your Monoceros account has been created. Confirm your email address to continue to identity verification.",
      "Identity verification is required before you can subscribe to an investment package.",
    ],
    button: { label: "Confirm email address", url: verifyUrl },
    note: "This link expires in 24 hours. If you did not create this account, you can ignore this message.",
  });
}

export function sendVerificationEmail(to: string, verifyUrl: string) {
  return deliver(to, "Confirm your email address", {
    preheader: "Confirm your email address to activate your account.",
    heading: "Confirm your email address",
    paragraphs: ["Use the button below to confirm this address and activate your account."],
    button: { label: "Confirm email address", url: verifyUrl },
    note: "This link expires in 24 hours.",
  });
}

export function sendEmailVerifiedEmail(to: string, firstName: string) {
  return deliver(to, "Your email address is confirmed", {
    preheader: "Next step: identity verification.",
    heading: "Email confirmed",
    paragraphs: [
      `Thank you, ${firstName}. Your email address has been confirmed.`,
      "The next step is identity verification. Once your documents are approved you can subscribe to an investment package.",
    ],
    button: { label: "Complete verification", url: link("/dashboard/verification") },
  });
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  return deliver(to, "Reset your Monoceros password", {
    preheader: "A password reset was requested for your account.",
    heading: "Reset your password",
    paragraphs: [
      "A password reset was requested for your Monoceros account. If this was you, use the button below.",
    ],
    button: { label: "Reset password", url: resetUrl },
    note: "This link expires in 60 minutes and can be used once. If you did not request it, no action is required — your password has not changed.",
  });
}

export function sendPasswordChangedEmail(to: string, when: string) {
  return deliver(to, "Your password was changed", {
    preheader: "Security notice for your Monoceros account.",
    heading: "Your password was changed",
    paragraphs: [
      "The password on your Monoceros account was changed. All other sessions have been signed out.",
    ],
    details: [{ label: "Changed", value: when }],
    note: "If you did not make this change, contact support immediately.",
  });
}

export function sendWalletChangedEmail(
  to: string,
  data: { newAddress: string; network: string; when: string },
) {
  return deliver(to, "Your withdrawal wallet was updated", {
    preheader: "Security notice — withdrawal destination changed.",
    heading: "Withdrawal wallet updated",
    paragraphs: ["The saved withdrawal destination on your account was changed."],
    details: [
      { label: "Network", value: data.network },
      { label: "Wallet address", value: data.newAddress },
      { label: "Changed", value: data.when },
    ],
    note: "If you did not make this change, contact support immediately and do not request a withdrawal.",
  });
}

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export function sendKycSubmittedEmail(to: string, reference: string) {
  return deliver(to, "Identity verification submitted", {
    preheader: "We have received your documents.",
    heading: "Verification submitted",
    paragraphs: [
      "Your identity documents have been received and are queued for manual review by our compliance team.",
      "You will receive an email as soon as the review is complete.",
    ],
    details: [{ label: "Reference", value: reference }],
  });
}

export function sendKycApprovedEmail(to: string, firstName: string) {
  return deliver(to, "Identity verification approved", {
    preheader: "You can now subscribe to an investment package.",
    heading: "Verification approved",
    paragraphs: [
      `Good news, ${firstName}. Your identity has been verified.`,
      "You can now choose an investment package and submit your subscription payment.",
    ],
    button: { label: "View packages", url: link("/dashboard/packages") },
  });
}

export function sendKycRejectedEmail(to: string, reason: string, resubmit: boolean) {
  return deliver(to, resubmit ? "Additional documents required" : "Identity verification declined", {
    preheader: "Action required on your verification.",
    heading: resubmit ? "Additional documents required" : "Verification declined",
    paragraphs: [
      resubmit
        ? "Our compliance team needs a clearer or additional document before your verification can be approved."
        : "Your identity verification could not be approved with the documents provided.",
      "You can submit again from your dashboard.",
    ],
    details: [{ label: "Reason", value: reason }],
    button: { label: "Resubmit documents", url: link("/dashboard/verification") },
  });
}

// ---------------------------------------------------------------------------
// Payments and investments
// ---------------------------------------------------------------------------

export function sendPaymentSubmittedEmail(
  to: string,
  data: { reference: string; amount: string; packageName: string },
) {
  return deliver(to, `Payment submitted — ${data.reference}`, {
    preheader: "Your payment is awaiting verification.",
    heading: "Payment submitted",
    paragraphs: [
      "We have received your payment details. The finance team verifies every transfer manually, usually within one business day.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Package", value: data.packageName },
      { label: "Amount", value: data.amount },
    ],
    button: { label: "Track your subscription", url: link("/dashboard/investments") },
  });
}

export function sendPaymentApprovedEmail(
  to: string,
  data: { reference: string; amount: string; packageName: string; cycleDate: string },
) {
  return deliver(to, `Payment approved — ${data.reference}`, {
    preheader: "Your subscription is queued for the next trading cycle.",
    heading: "Payment approved",
    paragraphs: [
      "Your payment has been verified and your subscription is now queued.",
      "It will be activated automatically when the next weekly investment cycle opens.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Package", value: data.packageName },
      { label: "Amount", value: data.amount },
      { label: "Cycle opens", value: data.cycleDate },
    ],
    button: { label: "View investment", url: link("/dashboard/investments") },
  });
}

export function sendPaymentRejectedEmail(
  to: string,
  data: { reference: string; reason: string },
) {
  return deliver(to, `Payment could not be verified — ${data.reference}`, {
    preheader: "Action required on your payment.",
    heading: "Payment could not be verified",
    paragraphs: [
      "The finance team could not verify the payment details submitted for this subscription. You can correct and resubmit them from your dashboard.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Reason", value: data.reason },
    ],
    button: { label: "Resubmit payment details", url: link("/dashboard/payments") },
  });
}

export function sendInvestmentActivatedEmail(
  to: string,
  data: {
    reference: string;
    packageName: string;
    principal: string;
    maturityAmount: string;
    startedAt: string;
    maturesAt: string;
  },
) {
  return deliver(to, `Investment activated — ${data.reference}`, {
    preheader: "Your 30-day term has started.",
    heading: "Your investment is active",
    paragraphs: ["The weekly cycle has opened and your subscription is now active."],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Package", value: data.packageName },
      { label: "Capital", value: data.principal },
      { label: "Maturity value", value: data.maturityAmount },
      { label: "Started", value: data.startedAt },
      { label: "Matures", value: data.maturesAt },
    ],
    button: { label: "Track your investment", url: link("/dashboard/investments") },
  });
}

export function sendInvestmentMaturedEmail(
  to: string,
  data: { reference: string; maturityAmount: string },
) {
  return deliver(to, `Investment matured — ${data.reference}`, {
    preheader: "Withdraw or roll over your matured investment.",
    heading: "Your investment has matured",
    paragraphs: [
      "Your investment has reached the end of its term. You can now request a withdrawal or roll the full matured amount into the next weekly cycle.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Maturity value", value: data.maturityAmount },
    ],
    button: { label: "Choose withdraw or rollover", url: link("/dashboard/investments") },
  });
}

export function sendRolloverCreatedEmail(
  to: string,
  data: {
    reference: string;
    principal: string;
    maturityAmount: string;
    cycleDate: string;
  },
) {
  return deliver(to, `Rollover created — ${data.reference}`, {
    preheader: "Your matured amount has been rolled into a new subscription.",
    heading: "Rollover created",
    paragraphs: [
      "The full matured amount has been carried into a new subscription, which is queued for the next weekly cycle.",
    ],
    details: [
      { label: "New reference", value: data.reference },
      { label: "Capital", value: data.principal },
      { label: "Projected maturity value", value: data.maturityAmount },
      { label: "Cycle opens", value: data.cycleDate },
    ],
    button: { label: "View investment", url: link("/dashboard/investments") },
  });
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export function sendWithdrawalRequestedEmail(
  to: string,
  data: { reference: string; amount: string; destination: string },
) {
  return deliver(to, `Withdrawal requested — ${data.reference}`, {
    preheader: "Your withdrawal request has been received.",
    heading: "Withdrawal requested",
    paragraphs: [
      "Your withdrawal request has been received and is queued for manual review and settlement by the finance team.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Amount", value: data.amount },
      { label: "Destination", value: data.destination },
    ],
    button: { label: "Track withdrawal", url: link("/dashboard/withdrawals") },
    note: "If you did not make this request, contact support immediately.",
  });
}

export function sendWithdrawalApprovedEmail(
  to: string,
  data: { reference: string; amount: string },
) {
  return deliver(to, `Withdrawal approved — ${data.reference}`, {
    preheader: "Your withdrawal has been approved for settlement.",
    heading: "Withdrawal approved",
    paragraphs: ["Your withdrawal has been approved and is being prepared for settlement."],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Amount", value: data.amount },
    ],
  });
}

export function sendWithdrawalPaidEmail(
  to: string,
  data: { reference: string; amount: string; txid?: string | null },
) {
  return deliver(to, `Withdrawal paid — ${data.reference}`, {
    preheader: "Your withdrawal has been settled.",
    heading: "Withdrawal paid",
    paragraphs: ["Your withdrawal has been settled to your nominated destination."],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Amount", value: data.amount },
      ...(data.txid ? [{ label: "Transaction hash", value: data.txid }] : []),
    ],
    button: { label: "View transaction history", url: link("/dashboard/transactions") },
  });
}

export function sendWithdrawalRejectedEmail(
  to: string,
  data: { reference: string; reason: string },
) {
  return deliver(to, `Withdrawal declined — ${data.reference}`, {
    preheader: "Action required on your withdrawal request.",
    heading: "Withdrawal declined",
    paragraphs: [
      "Your withdrawal request was declined. Your investment remains matured and you can submit a new request.",
    ],
    details: [
      { label: "Reference", value: data.reference },
      { label: "Reason", value: data.reason },
    ],
    button: { label: "Open withdrawals", url: link("/dashboard/withdrawals") },
  });
}

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export function sendSupportReplyEmail(
  to: string,
  data: { reference: string; subject: string },
) {
  return deliver(to, `New reply on ${data.reference}`, {
    preheader: "Support has replied to your ticket.",
    heading: "New reply on your support ticket",
    paragraphs: [`Our support team has replied to "${data.subject}".`],
    details: [{ label: "Reference", value: data.reference }],
    button: { label: "Open ticket", url: link("/dashboard/support") },
  });
}

export function sendAdminAlertEmail(to: string, subject: string, body: string, url?: string) {
  return deliver(to, subject, {
    preheader: subject,
    heading: subject,
    paragraphs: [body],
    ...(url ? { button: { label: "Open in admin", url } } : {}),
  });
}
