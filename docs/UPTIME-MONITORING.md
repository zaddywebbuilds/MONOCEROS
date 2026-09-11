# Uptime monitoring and the launch-week warm-up

Two jobs, one monitor:

1. **Tell us when the site is actually down.** Nobody noticed outbound email had
   been broken for days until a registrant complained on WhatsApp. A monitor
   that watches a real health check closes that gap.
2. **Keep the database awake during launch week.** Neon's free plan suspends the
   compute after a few minutes idle. Waking it costs the next visitor a few
   seconds, measured on the live site as:

   ```
   first request, database asleep   2,146 ms
   once awake                          442 ms
   a page that never touches the DB    661 ms
   ```

   The homepage cold was 4.7 s. Low traffic makes this *worse*, not better —
   the fewer visitors there are, the larger the share of them who arrive to a
   sleeping database. That is the wrong first impression for a debut.

## What to monitor

`https://www.monocerosai.live/api/health`

That route runs `SELECT 1` against the database on every request — it is
`force-dynamic` with `no-store`, so it can never be served from a cache. It
returns **200** when the database is reachable and **503** when it is not, which
is what makes it a genuine health check rather than just a page that loads.

Do not point the monitor at the homepage. The homepage is cached for 60
seconds, so most requests never reach the database and would neither keep it
warm nor detect that it had failed.

## Setting it up

UptimeRobot's free plan is enough. You will need to create the account yourself.

1. Sign up at <https://uptimerobot.com>
2. **Add New Monitor**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Monoceros — health`
   - URL: `https://www.monocerosai.live/api/health`
   - Monitoring Interval: **5 minutes** (the free minimum)
3. Under the alert contacts, tick your email address so a failure actually
   reaches you.
4. Save.

Optionally add a second monitor on `https://www.monocerosai.live/` with a long
interval, purely to catch the case where the site is down in a way that somehow
leaves the API responding.

## This is a launch-week measure, not a plan

Be clear-eyed about what it does and does not buy:

- **It reduces cold starts; it does not eliminate them.** A 5-minute ping
  against a roughly 5-minute suspend threshold means the database will still
  nod off occasionally. Usually the ping absorbs the wake-up instead of a
  visitor, which is the point — but the window is not zero.
- **It is not free in effect.** Neon's free plan also caps monthly *compute
  hours*. Keeping the database awake around the clock is precisely what
  consumes that allowance, and it will run out faster than if the database were
  allowed to sleep. Watch the usage meter in the Neon dashboard during the
  week.

The real fix is Neon's paid plan (about $19/month), which lets the compute stay
warm without burning a quota. Budget for it, and treat this as a bridge.

Separately, and for an unrelated reason: **Vercel's free plan does not permit
commercial use.** That trigger is the first real payment, not a traffic
threshold. See [DEPLOY-FREE.md](DEPLOY-FREE.md).

## Keep the monitor after launch week

Even once the database is paid for and always warm, leave the health monitor
running. Its second job — telling you the site is broken before a customer
does — is the one that never expires.
