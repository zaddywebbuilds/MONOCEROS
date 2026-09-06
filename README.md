# Monoceros

An investment subscription management platform: public site, investor dashboard and two-administrator back office.

Monoceros manages **customers, identity verification, subscriptions, payments, weekly investment cycles, maturity, withdrawals, rollovers, notifications and administration**. The automated trading operation runs **outside** this application — the platform does not connect to it, execute orders, read a blockchain, or display trade activity.

---

## Contents

- [What the platform does](#what-the-platform-does)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Seeding](#seeding)
- [Creating administrators](#creating-administrators)
- [Payment settings](#payment-settings)
- [Scheduled jobs](#scheduled-jobs)
- [Email](#email)
- [Document storage](#document-storage)
- [Market data](#market-data)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Business rules](#business-rules)
- [Security](#security)

---

## What the platform does

| Area | Behaviour |
| --- | --- |
| Public site | Home, packages, markets, how it works, about, FAQ, support, contact, and four legal documents |
| Registration | Two-step, Nigerian mobile validation, 18+ check, email confirmation. **No NIN at registration** |
| Verification | NIN plus a supported identity document, reviewed manually, documents held in private storage |
| Subscriptions | Package terms are snapshotted onto the investment and never change afterwards |
| Payments | One company USDT wallet, transaction hash required and unique platform-wide, verified manually |
| Cycles | A new cycle opens weekly (Friday 00:00 Africa/Lagos by default); approval time decides the cycle |
| Maturity | 30 calendar days from activation, always derived from stored timestamps |
| Withdrawals | Available only at maturity, password-confirmed, settled manually |
| Rollovers | The **full** matured amount becomes the principal of a new subscription in the next cycle |
| Admin | Users, KYC, payments, investments, cycles, withdrawals, rollovers, packages, content, settings, audit |
| Audit | Every sensitive action is recorded and cannot be deleted through the interface |

---

## Technology

- **Next.js 16** (App Router, React 19, server actions) and **TypeScript** in strict mode
- **Tailwind CSS v4** with a design-token theme
- **PostgreSQL** with **Prisma 7** (driver adapter, `@prisma/adapter-pg`)
- **Zod** for validation, shared between client hints and server enforcement
- **bcryptjs** password hashing, database-backed sessions in HttpOnly cookies
- **Vitest** for tests
- Pluggable **email** (console / Resend / SMTP) and **storage** (local filesystem / S3-compatible)

---

## Getting started

Requirements: **Node.js 20+** and a **PostgreSQL 14+** database.

```bash
git clone https://github.com/zaddywebbuilds/MONOCEROS.git
cd MONOCEROS
npm install
cp .env.example .env
```

Fill in `.env` (at minimum `DATABASE_URL` and `AUTH_SECRET`), then:

```bash
npx prisma migrate deploy
npm run db:seed
npm run admin:create
npm run dev
```

Open <http://localhost:3000>. The back office is at `/admin/login`.

Generate the two secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Environment variables

Everything lives in `.env`; `.env.example` is the annotated template. Nothing is hard-coded.

### Required

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32+ random characters. Signs sessions and document links |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Public base URL, used in emails and metadata |

### Sessions and sign-in

| Variable | Default | Purpose |
| --- | --- | --- |
| `SESSION_TTL_HOURS` | `72` | Investor session lifetime |
| `ADMIN_SESSION_TTL_HOURS` | `8` | Administrator session lifetime (deliberately shorter) |
| `LOGIN_MAX_ATTEMPTS` | `5` | Failures before a temporary lock |
| `LOGIN_LOCK_MINUTES` | `15` | Lock duration |

### Email

`EMAIL_PROVIDER` is `console`, `resend` or `smtp`. See [Email](#email).

### Storage

`STORAGE_DRIVER` is `local` or `s3`. See [Document storage](#document-storage).

### Other

| Variable | Default | Purpose |
| --- | --- | --- |
| `MARKET_API_BASE_URL` | CoinGecko v3 | Public price data, display only |
| `COINGECKO_API_KEY` | — | Optional demo/pro key |
| `MARKET_CACHE_SECONDS` | `60` | Price cache window |
| `UPLOAD_MAX_MB` | `8` | Upload ceiling (also an admin setting) |
| `CRON_SECRET` | — | Bearer token for `POST /api/cron/run` |

---

## Database

Prisma 7 keeps the connection URL in `prisma.config.ts` (which reads `DATABASE_URL`) rather than in `schema.prisma`, and the client connects through a driver adapter configured in `src/lib/prisma.ts`.

```bash
npx prisma migrate dev --name your_change   # create a migration in development
npx prisma migrate deploy                   # apply migrations in production
npx prisma studio                           # inspect data
npm run prisma:generate                     # regenerate the client
```

An initial migration covering the whole schema ships in `prisma/migrations/`.

**Money** is stored as `DECIMAL(18,6)` and handled as `Prisma.Decimal` throughout — never as a JavaScript float. **Timestamps** are stored in UTC and displayed in the business timezone.

---

## Seeding

```bash
npm run db:seed        # settings, the five packages, FAQ entries — safe to re-run
npm run db:seed:demo   # development sample data only; refuses to run in production
```

The production seed creates **no users, investments or transactions**. It also asserts that every package's maturity amount equals `capital × (1 + return ÷ 100)`, so a typo cannot reach the database.

The demo seed creates clearly-labelled accounts on the reserved `@demo.monoceros.invalid` domain, covering an unverified user, a pending KYC submission, and active, queued, matured and awaiting-verification investments.

---

## Creating administrators

The platform expects **two administrators with equal permissions**. Passwords are never hard-coded and never logged.

```bash
npm run admin:create
```

The script prompts for each administrator's email, display name and password (input is hidden) and enforces the password policy. For automated provisioning, set `ADMIN_ONE_EMAIL`, `ADMIN_ONE_PASSWORD`, `ADMIN_ONE_NAME` (and the `ADMIN_TWO_*` equivalents) and run the same command — then remove those variables from `.env`, since only the hash is kept.

The role model is `USER`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN`. Today both administrators are created as `ADMIN`; `SUPPORT` and `SUPER_ADMIN` exist so responsibilities can be separated later without a migration.

---

## Payment settings

**The payment network and wallet address ship empty on purpose.** Until an administrator sets both under **Admin → Settings → Payments**:

- no wallet address or QR code is displayed anywhere,
- creating a subscription is refused with a clear message,
- the admin overview shows a warning banner.

The network is a free choice from the configured list (TRC20, ERC20, BEP20, Polygon, Solana, or your own) — nothing is assumed. Changing the wallet address writes a dedicated audit entry and notifies every staff account.

---

## Scheduled jobs

One idempotent worker activates queued investments when a cycle opens, matures investments whose term has elapsed, and prunes expired tokens and sessions.

**HTTP (recommended on Vercel or any PaaS)** — run at least every five minutes:

```bash
curl -X POST https://your-domain/api/cron/run \
  -H "Authorization: Bearer $CRON_SECRET"
```

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/run", "schedule": "*/5 * * * *" }] }
```

**Command line** (systemd timer, container cron, or manual):

```bash
npm run jobs:run
```

Running it more often than necessary is harmless — it compares stored instants against the current time and does nothing when nothing is due. Nothing in the platform decrements a counter in the database, so a missed run delays activation but can never corrupt a term.

---

## Email

Swap providers with one environment variable.

| `EMAIL_PROVIDER` | Needs | Behaviour |
| --- | --- | --- |
| `console` | nothing | Writes the message to the server log. The default for development |
| `resend` | `RESEND_API_KEY` | Sends via Resend |
| `smtp` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` | Sends via any SMTP relay |

Delivery is best-effort by design: a provider outage logs an error and never rolls back an approved payment or a created withdrawal. Both email and in-app notifications can be switched off globally under **Admin → Settings → Notifications**.

Templates live in `src/lib/email/`. Every message shares one layout, so branding changes in one place.

---

## Document storage

Identity documents and payment proofs are **never** written to `/public` and never served as static assets.

| `STORAGE_DRIVER` | Configuration |
| --- | --- |
| `local` | `STORAGE_LOCAL_DIR` (default `./.private-storage`, git-ignored, files written `0600`) |
| `s3` | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, optional `S3_ENDPOINT` for R2/B2/MinIO |

Reading a document goes through `GET /api/documents`, which requires **all** of:

1. a valid staff session (role checked on the server),
2. a short-lived HMAC signature bound to that specific viewer,
3. an object key that actually belongs to a KYC submission or payment proof.

Every successful read is written to the audit log. Uploads are validated by **magic number**, not by the declared MIME type or the file extension.

> On Vercel the filesystem is ephemeral — use the `s3` driver in production.

---

## Market data

`/markets` and the homepage ticker read public prices from CoinGecko. This is **display only**: no investment value on the platform is derived from it. If the provider is unreachable the UI shows an explicit "unavailable" state rather than stale or invented numbers.

Only assets with a real data source are shown. Foreign exchange and commodities are described in copy but not quoted, because no provider is configured for them.

---

## Testing

```bash
npm run test          # unit tests — no database required
npm run test:watch
npm run typecheck
```

The unit suite covers the cycle boundary rule, maturity arithmetic, decimal money handling, package terms, the investment state machine, every validation schema, password hashing, rate limiting, signed document URLs and upload sniffing.

Database-backed workflow tests live in `tests/integration/` and are **skipped** unless you point them at a disposable database:

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/monoceros_test npm run test
```

They truncate every table between tests, so never aim them at a real database.

The most important assertion, stated directly:

| Payment approved at | Joins the cycle opening |
| --- | --- |
| Thursday 23:59 WAT | **the very next day** (Friday) |
| Friday 00:00 WAT | **the following Friday** |
| Friday 00:01 WAT | **the following Friday** |

---

## Deployment

### Vercel + managed PostgreSQL

1. Push the repository and import it into Vercel.
2. Set every variable from `.env.example` in the project settings.
3. Set `STORAGE_DRIVER=s3` and the S3 credentials (the Vercel filesystem is ephemeral).
4. Add the cron entry shown in [Scheduled jobs](#scheduled-jobs).
5. Run `npx prisma migrate deploy` and `npm run db:seed` against the production database.
6. Run `npm run admin:create`.
7. Sign in at `/admin/login` and set the payment network and wallet address.

### Any Node host

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start
```

Serve behind TLS. Session cookies are `Secure` whenever `NODE_ENV=production`, and HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` headers are set in `next.config.ts`.

### Go-live checklist

- [ ] `AUTH_SECRET` and `CRON_SECRET` are freshly generated and unique to production
- [ ] `ADMIN_*_PASSWORD` variables removed from `.env` after the accounts exist
- [ ] Payment network and wallet address set, and **verified by a second person**
- [ ] Support email, WhatsApp number and company details filled in under Settings
- [ ] Legal pages reviewed; no registration or licence number published unless genuinely held
- [ ] Scheduled job running and visible in the logs
- [ ] Email provider configured and a test message received
- [ ] `STORAGE_DRIVER=s3` with a **private** bucket
- [ ] Demo data absent (`npm run db:seed:demo` must never be run in production)

---

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            SQL migrations
  seed.ts                Production seed (settings, packages, FAQ)
  seed-demo.ts           Development sample data
scripts/
  create-admin.ts        Administrator provisioning
  run-jobs.ts            Scheduled worker, CLI entry point
src/
  app/
    (public)/            Marketing site
    (auth)/              Sign in, register, password recovery, email confirmation
    dashboard/           Investor portal
    admin/               Back office ((protected) group holds the authenticated shell)
    api/documents/       Signed, role-checked private document delivery
    api/cron/run/        Scheduled worker endpoint
  components/
    ui/                  Buttons, cards, tables, forms, modals, toasts, feedback states
    marketing/           Public page sections
    dashboard/ admin/    Portal and back-office components
    visuals/             SVG illustrations and decorative layers
  lib/
    auth/                Passwords, tokens, sessions, role checks
    domain/              State machines and status presentation
    validation/          Zod schemas
    email/ storage/      Pluggable providers
    time.ts              Cycle and maturity mathematics
    money.ts             Decimal handling
    settings-registry.ts Setting keys, defaults and metadata
  server/
    services/            Business logic (investments, payments, KYC, withdrawals, rollovers, jobs)
    actions/             Server actions
    queries/             Read models
tests/                   Unit tests, plus integration tests that self-skip
docs/                    Business rules and security notes
```

Nothing is a single giant component: UI, business logic, data access, validation, authentication, authorisation, scheduled tasks and notifications are separated.

---

## Business rules

The rules the platform enforces are documented in [`docs/BUSINESS-RULES.md`](docs/BUSINESS-RULES.md), including the cycle cutoff, the maturity calculation, the snapshot rule and the rollover calculation.

Two that are worth repeating here:

- **Maturity amounts come from the subscribed package.** They are not derived from external trading performance and do not change with it.
- **Editing a package never changes an existing investment.** Capital, return percentage, maturity amount and term are copied onto the investment at subscription time.

---

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full list. In summary: bcrypt password hashing, database-backed sessions in HttpOnly `SameSite=Lax` cookies, per-role session lifetimes, brute-force lockout, rate limiting on every sensitive endpoint, server-side authorisation on every protected route and action, Zod validation of every input, magic-number upload validation, private document storage behind short-lived signed and role-checked links, an append-only audit log, and no private keys or seed phrases stored anywhere.

---

## Licence

Proprietary. All rights reserved.
