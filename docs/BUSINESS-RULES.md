# Business rules

The rules the platform enforces in code. Where a rule is configurable, the setting is named.

---

## 1. What this platform is, and is not

The automated trading operation runs **outside** this application.

Monoceros does **not**: connect to it, place or observe orders, read a blockchain, calculate returns from market performance, or display trade activity, win rates or profit figures.

Monoceros **does**: manage accounts, identity verification, subscriptions, payments, weekly investment cycles, maturity, withdrawals, rollovers, notifications, support and administration.

The data model and service layer are separated cleanly enough that a broker or exchange integration could be added later without altering how existing records behave.

---

## 2. Money

- Stored as PostgreSQL `DECIMAL(18,6)` and handled as `Prisma.Decimal`. **Never** a JavaScript float.
- Presented to two decimal places; maturity amounts are rounded half-up to two places at the point they are calculated.
- The platform never custodies funds and never holds a private key or seed phrase.

---

## 3. Time

- Every timestamp is stored in **UTC**.
- Business time is **Africa/Lagos** (`general.timezone`).
- Calendar-day arithmetic is performed on a date-only value and re-anchored in the business timezone, so results do not depend on the server's own timezone or on any daylight-saving transition in it.
- Countdowns are always `target − now`. **No counter is ever decremented in the database**, so a restart, an outage or a wrong clock on a user's device cannot alter a term.

---

## 4. Registration and eligibility

- Nigerian residents, **18 or older** (`kyc.minimumAge`, `kyc.country`).
- Two steps: personal details, then credentials and consent.
- **The NIN is not collected at registration.** It is collected during identity verification, after the account exists.
- Mobile numbers are validated as Nigerian and normalised to `+234XXXXXXXXXX`.
- Passwords require 8+ characters with an uppercase letter, a lowercase letter and a number; a special character is encouraged and shown in the meter.
- The Terms, Privacy Policy and Risk Disclosure must be accepted explicitly.
- Email confirmation is required before verification, which is required before investing.

---

## 5. Identity verification (KYC)

| Status | Meaning |
| --- | --- |
| `NOT_SUBMITTED` | Nothing submitted yet |
| `PENDING` | Awaiting a compliance decision |
| `APPROVED` | May subscribe |
| `REJECTED` | Declined, with a reason |
| `RESUBMIT_REQUESTED` | A clearer or additional document is needed |

- A NIN (11 digits) plus one document from `kyc.allowedIdTypes`.
- Uploads are validated by **magic number**, not by file extension or declared MIME type. JPG, PNG and PDF only, up to `kyc.maxUploadMb`.
- Every submission is reviewed by a person. Rejection and resubmission both require a written reason, which the investor sees.
- Documents are written to private storage and are readable only through a signed, role-checked, short-lived link. Every read is audited.

---

## 6. Packages

Fields: name, slug, capital, return percentage, maturity amount, duration, description, badge, display order, active flag.

Seeded terms:

| Package | Capital | Return | Maturity | Term |
| --- | --- | --- | --- | --- |
| Gold | $500 | 30% | $650 | 30 days |
| Diamond | $1,000 | 40% | $1,400 | 30 days |
| Sapphire | $3,000 | 50% | $4,500 | 30 days |
| Emerald | $5,000 | 60% | $8,000 | 30 days |
| Alexandrite | $10,000 | 70% | $17,000 | 30 days |

**The maturity amount is derived, never typed.** The admin form calculates it from capital × (1 + return ÷ 100), and the seed script refuses to run if a stated figure disagrees.

### The snapshot rule

When an investor subscribes, the package's **name, capital, return percentage, maturity amount and duration are copied onto the investment**. Editing or disabling the package afterwards has **no effect** on any existing investment. This is enforced in `createSubscription` and asserted in the tests.

---

## 7. Investment state machine

```
DRAFT ─▶ PAYMENT_PENDING ─▶ PAYMENT_SUBMITTED ─▶ PAYMENT_UNDER_REVIEW ─▶ QUEUED ─▶ ACTIVE ─▶ MATURED
                                    │                     │                                    ├─▶ WITHDRAWAL_REQUESTED ─▶ COMPLETED
                                    └──▶ PAYMENT_REJECTED ┘                                    └─▶ ROLLED_OVER
```

- Every change goes through `transition()`, which checks the table in `src/lib/domain/investment-status.ts` and writes an `InvestmentStatusEvent` row.
- A transition not in that table throws. The UI can never cause one by hiding or showing a button.
- Notably forbidden: activating an unapproved payment, withdrawing before maturity, cancelling a running investment, rolling over anything that is not `MATURED`.

---

## 8. Payments

- One company wallet, configured by an administrator (`payment.asset`, `payment.network`, `payment.walletAddress`).
- **Both the network and the address ship blank.** Until both are set, no wallet details are displayed and subscriptions are refused.
- The investor sends the exact amount and submits the **transaction hash**.
- A transaction hash is **unique platform-wide**. A duplicate is rejected, both by an explicit check and by a database unique constraint.
- Optional proof of payment upload, validated the same way as an identity document.
- Verification is **manual**. Approval and rejection both require confirmation, and both are audited. Rejection requires a reason, which the investor sees, and the investor can then correct and resubmit.

---

## 9. The weekly cycle — the central rule

A cycle opens every **Friday at 00:00 Africa/Lagos** (`cycle.weekday`, `cycle.time`).

> **The eligible cycle is the first boundary strictly after the moment of payment approval.**

| Payment approved | Joins the cycle opening |
| --- | --- |
| Thursday 23:59 WAT | **the very next day** (Friday) |
| Friday 00:00 WAT | **the following Friday** |
| Friday 00:01 WAT | **the following Friday** |
| Any other time | the next Friday |

The investor is never asked to choose. The cycle is derived from the **approval** instant, not the submission instant — so a payment submitted on Monday and approved the following Saturday joins the Friday after that.

Cycle rows carry `UPCOMING → ACTIVE → COMPLETED` and are created lazily, the first time something needs to reference the boundary.

---

## 10. Activation and maturity

A scheduled worker (`/api/cron/run`, or `npm run jobs:run`) runs at least every five minutes and:

1. reconciles cycle statuses,
2. activates every `QUEUED` investment whose cycle boundary has passed —
   `startedAt` = the cycle opening instant, `maturesAt` = `startedAt` + `durationDays` calendar days,
3. moves every `ACTIVE` investment whose `maturesAt` has passed to `MATURED`,
4. prunes expired tokens and sessions.

Every step is **idempotent**: running the worker twice activates nothing twice. A missed run delays activation but can never corrupt a term, because everything is derived from stored instants.

Administrators can trigger activation manually for a boundary that has already passed. It is behind a confirmation dialog and is audited with a reason.

---

## 11. Returns

The maturity amount comes from the **subscribed package** and nothing else.

It is not derived from external trading performance and does not change with it. This is stated on the packages page, the subscription confirmation page, in the emails and in the legal documents.

---

## 12. Withdrawals

- Available **only** once an investment is `MATURED`.
- The amount is the **full matured amount**; partial withdrawals are not offered.
- Default method `USDT_WALLET`; `withdrawal.methods` exists so a bank method can be enabled later without rebuilding anything.
- The investor supplies a destination address and network, and confirms their **password** (`withdrawal.requirePasswordConfirmation`).
- Changing a saved withdrawal wallet is written to `WalletChangeLog` **and** emailed to the account holder.

Statuses: `PENDING → UNDER_REVIEW → APPROVED → PROCESSING → PAID`, with `REJECTED` and `CANCELLED`.

- Settlement is manual. "Mark paid" is behind a confirmation dialog and accepts a settlement transaction hash, which becomes the investor's receipt.
- Marking paid closes the investment as `COMPLETED`.
- Rejection requires a reason and returns the investment to `MATURED`, so the investor can request again or roll over.

---

## 13. Rollover

Rollover carries the **full matured amount** forward as the capital of a new investment.

> A Gold investment matures at $650. Rolling it over creates a new investment with **$650** of capital — not $500.

Because a matured amount rarely equals a package's headline capital, the return percentage is chosen by `rollover.mode`:

| Mode | Behaviour |
| --- | --- |
| `SAME_PACKAGE_PERCENTAGE` *(default)* | Keep the matured investment's own percentage. $650 at 30% → **$845** |
| `REQUIRE_PACKAGE_SELECTION` | The investor picks a package; its percentage is applied to the full matured amount |

- The new investment is `QUEUED` for the **next available cycle** (`rollover.waitsForCycle`, default true). It does not start immediately.
- `parentInvestmentId` links the chain, so a sequence of rollovers can be traced end to end.
- The source investment becomes `ROLLED_OVER` and cannot be rolled over again.

---

## 14. Multiple investments

The model supports many investments per account: historical, queued and active at the same time. There is no hard-coded limit. `investment.maxActivePerUser` can impose one (0 = unlimited).

---

## 15. References

Human-readable and allocated from an atomic per-prefix, per-year counter:

```
MON-INV-2026-000024   investment
MON-PAY-2026-000031   payment
MON-WDR-2026-000009   withdrawal
MON-KYC-2026-000114   KYC submission
MON-TXN / MON-TKT / MON-RLV / MON-USR
MON-CYC-20260911      cycle (derived from its date)
```

Database identifiers are CUIDs and are never presented as the primary reference.

---

## 16. Notifications

In-app notifications and emails are raised for: registration, email confirmation, KYC submitted/approved/rejected, payment submitted/approved/rejected, investment queued/activated/matured, withdrawal requested/approved/rejected/paid, rollover created, password changed and withdrawal wallet changed.

Both channels can be switched off globally (`notify.emailEnabled`, `notify.dashboardEnabled`). Email delivery is best-effort: a provider outage is logged and never rolls back an approved payment or a created withdrawal.

---

## 17. Audit

Every sensitive action writes an `AuditLog` row: actor, role, action, entity, before/after JSON, reason, IP, user agent and timestamp.

Covered: administrator sign-in and lockout, KYC decisions, KYC document views, payment review/approval/rejection, investment activation and maturity, investment annotations, manual cycle activation, withdrawal decisions and settlement, rollover creation, package create/edit/disable, wallet address changes, settings changes, content and FAQ edits, account suspension, support status changes and notification broadcasts.

**The audit log has no delete or edit path in the administration interface.**

---

## 18. Content honesty

The platform will not publish what the business cannot evidence.

- No fabricated licences, registration numbers, certifications, audited returns or broker statements. Where a value is unset it is **omitted**, not filled with a placeholder.
- No performance claims, win rates, investor counters, testimonials or "recent withdrawal" popups.
- Market prices are labelled as informational and are never used in a calculation; if the provider is unreachable the UI says so rather than showing stale numbers.
- Risk warnings appear on the packages page, the subscription confirmation, the footer, the auth pages and in the emails.

---

## 19. Default settings

| Setting | Default |
| --- | --- |
| Country | Nigeria |
| Timezone | Africa/Lagos |
| Display currency | USD |
| Payment asset | USDT |
| Payment network / wallet | **blank — must be set by an administrator** |
| Cycle day / time | Friday, 00:00 |
| Investment duration | 30 days |
| NIN required | true |
| Rollover mode | `SAME_PACKAGE_PERCENTAGE` |
| Rollover waits for cycle | true |
| Payment verification | manual |
| Withdrawal processing | manual |
| Return source | package-defined |
| Trading integration | none |
| Max active investments per user | unlimited |
