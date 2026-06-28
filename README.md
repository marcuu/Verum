# Verum

Personal daily journal + curated quotes, with a "life calendar" visualisation.

**Stack:** Next.js (App Router) · Supabase (Postgres) · lucide-react · deployed on Vercel.

> Migrated from the original Flask + SQLite backend. Data now lives in Supabase;
> the UI is a Next.js app; both API and frontend are served same-origin on Vercel.

## Features

- **Journal** — one quick-capture entry per day, inline editing, full-text search, JSON export.
- **Quotes** — a daily pick with thumbs up/down voting; quotes crossing the score threshold become "core".
- **Life calendar** — 52 weeks per age-year, marking past weeks, the current week, and weeks that have an entry.
- **Reminders (PWA)** — installable as a Progressive Web App with Web Push. One calm daily reminder ("What happened today?") if the day hasn't been logged yet.

## Architecture

```
app/
  page.tsx                 Main UI (client component)
  login/page.tsx           Token entry → sets httpOnly cookie
  api/
    login | logout         Auth cookie endpoints
    entries/               GET list/search, POST upsert
    entries/[day]/         GET one, DELETE
    entries/export/        GET all as JSON
    life-markers/          GET list, POST upsert
    life-markers/[week]/   DELETE
    quotes/                GET list, POST create
    quotes/daily/          GET today's pick (atomic SQL RPC)
    quotes/[id]/           DELETE
    quotes/[id]/vote/      POST { delta: 1 | -1 }
components/                QuoteBox, EntryRow, LifeCalendar
lib/                       supabase (service-role), auth, dates, client, types, constants
middleware.ts              Redirects unauthenticated page requests to /login
```

### Database

Four tables in the Supabase `public` schema, namespaced with a `verum_` prefix
(co-located with another app in the same project):

- `verum_entries` — `id, day (unique), text, created_at, updated_at`
- `verum_life_markers` — `id, week_index (unique), label, accent, created_at, updated_at`
- `verum_quotes` — `id, text, author, score, last_seen_at, created_at, updated_at` (unique on `text, author`)
- `verum_quotes_daily_pick` — `day (pk), quote_id (fk), picked_at`

Plus the `verum_pick_daily_quote(day, core_threshold, avoid_days)` SQL function
that selects and records the day's quote atomically. For existing projects, run `docs/supabase-life-markers.sql` once to add the life-marker table.

Notification tables (`verum_notification_preferences`, `verum_notification_subscriptions`,
`verum_notification_deliveries`) — run `docs/supabase-notifications.sql` once to add them.

RLS is enabled with **no policies**, so the anon/publishable key cannot read or
write. All access is via the service-role key from the server-side API routes,
which sit behind the shared-token auth gate.

## Notifications (PWA + Web Push)

Verum is installable (`app/manifest.ts`, `public/sw.js`) and sends Web Push
reminders. Setup:

1. Run `docs/supabase-notifications.sql` in the Supabase SQL editor.
2. Generate VAPID keys: `npx web-push generate-vapid-keys`.
3. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`
   and `CRON_SECRET` (locally and in Vercel).
4. Open the app → **Reminders** → *Enable reminders*, then *Send test*.

Reminders are driven by the four cron entries in `vercel.json`, each calling
`/api/cron/notifications?job=...` at its own UTC time:

- `backup` at `0 9 * * *`
- `weekly` at `0 17 * * *`
- `daily` at `30 19 * * *`
- `rescue` at `0 21 * * *`

The cron schedule provides the time-of-day trigger; the route validates
`CRON_SECRET`, loads the configured timezone, then applies each job's own
eligibility rules. Daily reminders send only if reminders are enabled, there's
no entry for the local day, and one hasn't already gone out to that
subscription. Stale push subscriptions reported as gone (404/410) are disabled.
An external scheduler can call the route with `?secret=<CRON_SECRET>`.

## Auth

A single shared secret (`JOURNAL_ACCESS_TOKEN`). The `/login` page posts it to
`/api/login`, which validates it and sets an httpOnly cookie. `middleware.ts`
redirects unauthenticated page requests to `/login`; API routes validate the
cookie themselves. Set `JOURNAL_PUBLIC_READ=true` to allow unauthenticated GETs.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Get the Supabase keys from **Dashboard → Project Settings → API**. The
`SUPABASE_SERVICE_ROLE_KEY` is secret — keep it out of the browser and out of git.

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Add the environment variables from `.env.example` (Production + Preview).
3. Deploy.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Secret** — server only |
| `JOURNAL_ACCESS_TOKEN` | yes | Shared login token |
| `JOURNAL_PUBLIC_READ` | no | `true` to allow anonymous reads (default `false`) |
| `QUOTES_CORE_THRESHOLD` | no | Default `3` |
| `QUOTES_AVOID_DAYS` | no | Default `14` |
| `NEXT_PUBLIC_DOB` | no | Life calendar DOB, default `1993-12-19` |
| `NEXT_PUBLIC_LIFE_YEARS` | no | Life calendar span, default `108` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | for push | VAPID public key (browser-exposed) |
| `WEB_PUSH_PRIVATE_KEY` | for push | **Secret** — VAPID private key, server only |
| `WEB_PUSH_SUBJECT` | for push | `mailto:` contact for the push service |
| `CRON_SECRET` | for push | **Secret** — protects the cron route |
