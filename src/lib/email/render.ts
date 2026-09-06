import { appUrl } from "@/lib/env";

/**
 * A single, reusable transactional email shell. Every message on the platform
 * is composed from these primitives so branding stays consistent and there is
 * only one place to change the layout.
 */

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailDetail {
  label: string;
  value: string;
}

export interface EmailContent {
  preheader: string;
  heading: string;
  paragraphs: string[];
  details?: EmailDetail[];
  button?: EmailButton;
  note?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailHtml(content: EmailContent, companyName = "Monoceros"): string {
  const detailRows = (content.details ?? [])
    .map(
      (d) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #17223a;color:#94a4bd;font-size:13px;">${escapeHtml(
            d.label,
          )}</td>
          <td style="padding:10px 0;border-bottom:1px solid #17223a;color:#e9eef6;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(
            d.value,
          )}</td>
        </tr>`,
    )
    .join("");

  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;color:#c3cede;font-size:15px;line-height:1.65;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
         <tr><td style="border-radius:10px;background:#12c99b;">
           <a href="${content.button.url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#04060c;text-decoration:none;border-radius:10px;">${escapeHtml(
             content.button.label,
           )}</a>
         </td></tr>
       </table>
       <p style="margin:12px 0 0;color:#64748b;font-size:12px;word-break:break-all;">If the button does not work, paste this link into your browser:<br>${content.button.url}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#04060c;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04060c;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b111e;border:1px solid #17223a;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;">
      <tr><td style="padding:26px 30px 0;">
        <span style="display:inline-block;font-size:17px;font-weight:700;letter-spacing:-0.02em;color:#e9eef6;">${escapeHtml(
          companyName,
        )}</span>
        <span style="display:inline-block;margin-left:8px;height:6px;width:6px;border-radius:99px;background:#12c99b;vertical-align:middle;"></span>
      </td></tr>
      <tr><td style="padding:20px 30px 8px;">
        <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#ffffff;font-weight:650;letter-spacing:-0.02em;">${escapeHtml(
          content.heading,
        )}</h1>
        ${paragraphs}
        ${
          detailRows
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;border-top:1px solid #17223a;">${detailRows}</table>`
            : ""
        }
        ${button}
        ${
          content.note
            ? `<p style="margin:24px 0 0;padding:12px 14px;background:#0e1525;border-left:2px solid #c69f52;border-radius:6px;color:#94a4bd;font-size:12.5px;line-height:1.6;">${escapeHtml(
                content.note,
              )}</p>`
            : ""
        }
      </td></tr>
      <tr><td style="padding:26px 30px 30px;">
        <div style="height:1px;background:#17223a;margin-bottom:18px;"></div>
        <p style="margin:0;color:#64748b;font-size:11.5px;line-height:1.6;">
          This is an automated message from ${escapeHtml(companyName)}. Investment values shown are
          determined by the subscribed package and are not a projection of external market performance.
          Capital is at risk.
        </p>
        <p style="margin:10px 0 0;color:#475569;font-size:11.5px;">
          <a href="${appUrl}" style="color:#64748b;text-decoration:none;">${appUrl.replace(/^https?:\/\//, "")}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function renderEmailText(content: EmailContent, companyName = "Monoceros"): string {
  const lines = [companyName.toUpperCase(), "", content.heading, "", ...content.paragraphs];

  if (content.details?.length) {
    lines.push("");
    for (const d of content.details) lines.push(`${d.label}: ${d.value}`);
  }
  if (content.button) {
    lines.push("", `${content.button.label}: ${content.button.url}`);
  }
  if (content.note) {
    lines.push("", content.note);
  }
  lines.push("", `${appUrl}`);
  return lines.join("\n");
}
