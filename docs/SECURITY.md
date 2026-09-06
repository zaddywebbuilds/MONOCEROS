# Security

What the platform does to protect accounts, money and personal data — and, just as importantly, what it deliberately does **not** do.

---

## Authentication

| Control | Implementation |
| --- | --- |
| Password storage | bcrypt, cost 12. The plain password is never stored, logged or echoed |
| Password policy | 8+ characters with upper, lower and a number. Enforced by Zod on the server; the meter uses the same function so the two cannot drift |
| Sessions | Random 256-bit tokens. Only the **SHA-256 hash** is stored, so a database disclosure cannot be replayed |
| Cookies | `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, explicit expiry |
| Session lifetime | 72 hours for investors, **8 hours for administrators** (`ADMIN_SESSION_TTL_HOURS`) |
| Revocation | Sessions are database rows. Changing a password revokes every other session; suspending an account revokes all of them |
| Brute force | 5 failed attempts locks the account for 15 minutes (configurable). Administrator lockouts are audited |
| Enumeration | "Unknown account", "wrong password" and "already registered" all produce the same user-visible outcome. Password reset always reports the same message |
| Login logging | Every attempt — success or failure, with reason, IP and user agent — is recorded and shown to the account holder |
| 2FA | Schema and admin-profile flag are in place (`twoFactorEnabled`, `requiresTwoFactor`) so enrolment can be added without a migration |

---

## Authorisation

- **Every** protected page and server action re-establishes identity and role on the server. Hiding a button in the UI is never the control.
- Layered guards: `requireUser` → `requireVerifiedEmail` → `requireApprovedKyc` for investors; `requireAdminPage` / `assertStaff` / `assertAdmin` for the back office.
- Every user-scoped query is filtered by `userId`, so one investor cannot read or act on another's records even with a valid session and a guessed identifier.
- `src/middleware.ts` performs a cheap cookie-presence redirect for `/dashboard` and `/admin`. It is a UX optimisation and is documented as such — the real checks run server-side.
- Roles: `USER`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`. The two live administrators have equal permissions; the extra roles exist for future separation of duties.

---

## Input handling

- Every form, action and route parses its input with a **Zod** schema before anything else happens.
- Prisma's parameterised queries remove SQL injection as a class of bug. No user input is concatenated into SQL.
- React escapes rendered values; `dangerouslySetInnerHTML` is used in exactly one place, for JSON-LD structured data built from our own objects.
- Free text is stripped of control characters before it is persisted.
- Long-form admin content uses a small plain-text convention (`##`, `###`, `-`) rendered into elements — an administrator cannot inject markup into a public page.
- Money is parsed from strings into `Decimal`; a value with more than two decimal places, a negative sign or a non-numeric character is rejected.

---

## Uploads and private documents

- Accepted types are decided by **magic number**, not by the file extension or the declared MIME type. A PHP script renamed `id.png` is rejected.
- JPG, PNG and PDF only, with a configurable size ceiling.
- Object keys are namespaced and carry 128 bits of randomness, so they cannot be guessed.
- Documents are **never** written to `/public` and never served as static assets. Local-driver files are written `0600` into a git-ignored directory; the S3 driver writes private objects.
- Reading a document requires **all three** of: a valid staff session, a short-lived HMAC signature bound to that specific viewer, and an object key that genuinely belongs to a KYC submission or payment proof.
- Signed links expire in five minutes and are single-audience — forwarding one to a colleague does not work.
- Every successful read is written to the audit log.
- Responses carry `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `X-Content-Type-Options: nosniff` and a restrictive `Content-Security-Policy`.

---

## Rate limiting

Fixed-window limiting on sign-in, registration, password reset, payment submission, withdrawal requests, support messages, the contact form and document views. A successful sign-in clears its bucket.

The implementation is in-process and dependency-free, which is correct for a single node. For a multi-instance deployment, replace the store in `src/lib/rate-limit.ts` with Redis — the call sites do not change.

---

## Financial integrity

- Money is `DECIMAL(18,6)` end to end. No JavaScript float ever touches a monetary value.
- Package terms are **snapshotted** onto an investment at subscription time, so editing a package cannot change what an existing investor is owed.
- Maturity amounts are derived from capital and percentage, never typed by hand.
- A transaction hash is unique platform-wide, enforced both by an explicit check and by a database constraint.
- Status changes go through a **state machine**; a transition that is not listed throws.
- Multi-step operations run inside database transactions, so a partial state cannot be left behind.
- The administration interface has **no "edit balance" function**. Corrections are recorded as an annotated note with a mandatory reason and an audit entry.
- Approvals, rejections and settlements require an explicit confirmation which is also verified server-side.

---

## Audit

Append-only. Actor, role, action, entity, before/after JSON, reason, IP, user agent, timestamp. No delete or edit path exists in the interface.

---

## Transport and headers

Set in `next.config.ts` for every response:

`Strict-Transport-Security` (2 years, preload) · `X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` denying camera, microphone, geolocation and interest cohorts.

Dashboard, admin and document routes additionally send `X-Robots-Tag: noindex, nofollow`, and are excluded in `robots.ts`.

---

## Secrets

- Everything sensitive comes from environment variables and is validated at first use. Nothing is hard-coded.
- `.env` is git-ignored; `.env.example` is the annotated template.
- Administrator passwords are supplied interactively (hidden input) or through one-shot environment variables the script tells you to remove afterwards.
- No secret is exposed to the browser. Only `NEXT_PUBLIC_*` values reach the client, and none of them are sensitive.
- Client components import the action-state contract from `src/lib/action-state.ts`, which has no server imports — so the service graph, Prisma and the database driver can never be pulled into a browser bundle.

---

## What is deliberately absent

- **No private keys or seed phrases** are stored, requested or handled. Ever.
- **No automatic custody or movement of funds.** Every payment and every settlement is a human decision.
- **No blockchain reads.** The platform does not claim to have verified a transfer that a person has not checked.
- **No "edit balance" tool.**
- **No public exposure of identity documents**, and no long-lived document URLs.

---

## Operational recommendations

- Serve only over TLS; the cookie policy assumes it.
- Use the `s3` storage driver in production with a **private** bucket.
- Rotate `AUTH_SECRET` if you suspect exposure — this invalidates every session and every outstanding document link, which is the intended effect.
- Keep `CRON_SECRET` distinct from `AUTH_SECRET`.
- Give the application database user only the privileges it needs.
- Review the audit log routinely, particularly wallet address changes and payment approvals.
- Have a second person verify the company wallet address after any change. The platform notifies every staff account when it is edited, precisely so this is noticed.

---

## Reporting a vulnerability

Contact the support address configured under **Admin → Settings → Support**. Please do not open a public issue for a security report.
