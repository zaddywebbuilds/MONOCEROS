import "server-only";

import { serverEnv } from "@/lib/env";

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  name: string;
  send(message: OutboundEmail): Promise<void>;
}

/**
 * Development / fallback provider. Writes the message to the server log rather
 * than dropping it silently, so local flows remain testable without an API key.
 */
const consoleProvider: EmailProvider = {
  name: "console",
  async send(message) {
    // eslint-disable-next-line no-console
    console.info(
      [
        "",
        "──────────── EMAIL (console provider) ────────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  },
};

function resendProvider(): EmailProvider {
  return {
    name: "resend",
    async send(message) {
      const env = serverEnv();
      if (!env.RESEND_API_KEY) {
        throw new Error("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set.");
      }
      const { Resend } = await import("resend");
      const client = new Resend(env.RESEND_API_KEY);
      const result = await client.emails.send({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
      });
      if (result.error) {
        throw new Error(`Resend rejected the message: ${result.error.message}`);
      }
    },
  };
}

function smtpProvider(): EmailProvider {
  return {
    name: "smtp",
    async send(message) {
      const env = serverEnv();
      if (!env.SMTP_HOST) {
        throw new Error("EMAIL_PROVIDER=smtp but SMTP_HOST is not set.");
      }
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASSWORD
            ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
            : undefined,
      });
      await transport.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: env.EMAIL_REPLY_TO,
      });
    },
  };
}

/**
 * Whether outbound mail can actually leave the building.
 *
 * The console provider is a development fallback: it writes the message to the
 * server log and returns successfully, which is indistinguishable from a real
 * send to everything upstream. In production that is a silent failure — every
 * registrant is told to check an inbox nothing was sent to — so it is reported
 * here as not configured.
 *
 * Returns no secrets: the provider name and a boolean, nothing more.
 */
export function emailDeliveryStatus(): {
  provider: string;
  configured: boolean;
  reason?: string;
} {
  const env = serverEnv();
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return env.RESEND_API_KEY
        ? { provider: "resend", configured: true }
        : { provider: "resend", configured: false, reason: "RESEND_API_KEY is not set" };
    case "smtp":
      return env.SMTP_HOST
        ? { provider: "smtp", configured: true }
        : { provider: "smtp", configured: false, reason: "SMTP_HOST is not set" };
    default:
      return process.env.NODE_ENV === "production"
        ? {
            provider: "console",
            configured: false,
            reason: "EMAIL_PROVIDER is unset, so mail is written to the log instead of sent",
          }
        : { provider: "console", configured: true };
  }
}

/** Swapping providers is a one-line environment change. */
export function getEmailProvider(): EmailProvider {
  switch (serverEnv().EMAIL_PROVIDER) {
    case "resend":
      return resendProvider();
    case "smtp":
      return smtpProvider();
    default:
      return consoleProvider;
  }
}
