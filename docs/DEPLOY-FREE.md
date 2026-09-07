# Free demo deployment

Get Monoceros online at a real URL, for **£0 / $0**, so the owner can click
through it. Two free accounts, neither asks for a card:

- **Neon** — the PostgreSQL database — <https://neon.tech>
- **Vercel** — runs the app — <https://vercel.com>

About 15 minutes. This is a **demo setup**, not production — see
[What this setup is not](#what-this-setup-is-not) at the end.

---

## 1. Create the database (Neon)

1. Sign up at <https://neon.tech> with your GitHub account.
2. **Create project**. Name it `monoceros`, and pick the region closest to you —
   **Europe (Frankfurt)** is the nearest Neon offers to Nigeria.
3. When it finishes, copy the **connection string**. It looks like:

```
postgresql://neondb_owner:xxxx@ep-xxx-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Keep that tab open.

---

## 2. Set up the database from your machine

In the project folder:

```bash
# Windows PowerShell
$env:DATABASE_URL="<paste the Neon connection string>"
npx prisma migrate deploy
npm run db:seed
npm run admin:create
```

```bash
# macOS / Linux
export DATABASE_URL="<paste the Neon connection string>"
npx prisma migrate deploy
npm run db:seed
npm run admin:create
```

`npm run admin:create` asks for an email, a display name and a password for each
administrator. Input is hidden. **Write the details down** — you will sign in
with them.

Optionally add sample investors and investments so the demo is not empty:

```bash
npm run db:seed:demo
```

That creates three clearly-labelled accounts on `@demo.monoceros.invalid` with
the password `DemoInvestor#2026`, plus active, queued, matured and
awaiting-verification investments to look at.

---

## 3. Deploy the app (Vercel)

1. Sign up at <https://vercel.com> with your GitHub account.
2. **Add New → Project** → import **`zaddywebbuilds/MONOCEROS`**.
3. Leave the build settings alone — Vercel detects Next.js.
4. Expand **Environment Variables** and add these:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | your Neon connection string |
| `AUTH_SECRET` | a long random string — see below |
| `CRON_SECRET` | another long random string |
| `STORAGE_DRIVER` | `local` |
| `STORAGE_LOCAL_DIR` | `/tmp/monoceros-storage` |
| `EMAIL_PROVIDER` | `console` |
| `NEXT_PUBLIC_SITE_NAME` | `Monoceros` |

Generate the two secrets by running this twice:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

5. **Deploy.** It takes two or three minutes.
6. Vercel gives you a URL like `https://monoceros-abc123.vercel.app`. Now add
   two more environment variables with that URL, under
   **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `APP_URL` | `https://monoceros-abc123.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | the same URL |

7. **Deployments → ⋯ → Redeploy.** `NEXT_PUBLIC_APP_URL` is baked in at build
   time, so this second deploy is what makes links and emails correct.

---

## 4. Set the payment details

The wallet ships blank on purpose, so nobody can ever pay into a placeholder.
Until you set it, subscribing is refused and the admin overview shows a warning.

1. Go to `https://your-url.vercel.app/admin/login`
2. Sign in with the administrator you created in step 2.
3. **Settings → Payments**, set the **network** (e.g. `TRC20`) and the **company
   wallet address**, and save.

For a demo you can put any plausible-looking address in. **If this ever becomes
real, have a second person verify it before a single payment is accepted.**

While you are there, **Settings → General** and **Support** let you fill in the
company name, support email and WhatsApp number that show across the site.

---

## 5. Keep the cycle engine running (optional, free)

Only matters if the owner will look at it over several days — it is what opens
investment cycles on Friday and matures investments after 30 days.

Vercel's free plan only allows one cron run per day, so the repository includes
a GitHub Actions workflow instead. To switch it on, add two repository secrets
at **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `APP_URL` | `https://your-url.vercel.app` |
| `CRON_SECRET` | the same value you put in Vercel |

It then runs every 15 minutes, free. You can also trigger it by hand from the
**Actions** tab, or from **Admin → Investment cycles** inside the app.

---

## What to show the owner

A route worth walking:

1. **Home** — hero, live crypto prices, the five packages, the Friday countdown
2. **How It Works** — the eight steps
3. **Packages** → click one → the confirmation screen showing the exact terms
4. **Sign in** as `active.investor@demo.monoceros.invalid` / `DemoInvestor#2026`
   - **Overview** — active investment with a live 30-day countdown
   - **Investments** → open the matured one → the withdraw / rollover choice
   - **Payments** → the wallet, QR code and transaction-hash form
5. **Sign out**, then sign in at `/admin/login` as your administrator
   - **Overview** — real figures, and the queue of things needing attention
   - **KYC** — a pending submission waiting for a decision
   - **Payments** — a submitted payment waiting for verification
   - **Investment cycles** — the next Friday, who is queued, how much capital
   - **Audit log** — every action recorded

---

## What this setup is not

Be straight with the owner about these — none are faults in the application,
they are consequences of using free hosting:

- **Uploaded documents do not persist.** Vercel wipes the filesystem between
  requests, so a KYC document can be uploaded but may not open again later. On
  a paid setup this is solved with S3-compatible storage (`STORAGE_DRIVER=s3`)
  or a host with a persistent disk.
- **No emails are sent.** `EMAIL_PROVIDER=console` writes them to the Vercel
  log instead. Verification links will not arrive in an inbox. Add a free
  [Resend](https://resend.com) account when you want real email.
- **The database sleeps** when idle. The first page load after a quiet period
  takes a few seconds.
- **Vercel's free plan is for non-commercial use.** Showing a prototype to the
  owner is fine; running a live platform that takes customer money is not, and
  would need a paid plan.
- **The URL is a vercel.app subdomain.** A custom domain is free to attach if
  you already own one.

When it stops being a demo, [docs/DEPLOY-RENDER.md](DEPLOY-RENDER.md) covers a
production setup — one provider, persistent disk, real scheduler, around
$15/month.
