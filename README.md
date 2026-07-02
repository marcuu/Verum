# Verum

Personal daily journal + curated quotes, with a "life calendar" visualisation.

**Stack:** Next.js (App Router) · Supabase (Postgres) · lucide-react · deployed on Vercel.

> Migrated from the original Flask + SQLite backend. Data now lives in Supabase;
> the UI is a Next.js app; both API and frontend are served same-origin on Vercel.

## Features

- **Journal** — one quick-capture entry per day, inline editing, full-text search, JSON + Markdown export.
- **Quotes** — a daily pick with thumbs up/down voting; quotes crossing the score threshold become "core".
- **Life calendar** — 52 weeks per age-year, marking past weeks, the current week, and weeks that have an entry.
- **Reminders (PWA)** — installable as a Progressive Web App with Web Push. One calm daily reminder ("What happened today?") if the day hasn't been logged yet.

### Day semantics

A journal "day" is the day the owner lived, not the UTC date. The browser
saves entries against the **device's local calendar date**, and server routes
that need "today" (daily quote pick, streak, anniversaries, entry-day
fallback) compute it in `APP_TIMEZONE` (default `Europe/London` — the same
timezone notification scheduling already used). Timestamps (`created_at`,
`updated_at`) remain UTC. Existing `day` values are untouched; the change is
prospective only.

## Architecture

```
app/
  page.tsx                 Main UI (client component)
  login/page.tsx           Token entry → sets httpOnly cookie
  api/
    login | logout         Auth cookie endpoints
    entries/               GET list/search, POST upsert
    entries/[day]/         GET one, DELETE
    entries/export/        GET all as JSON (?format=markdown for the archive)
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

## Offline capture

Capture works without a network. The service worker caches the app shell
(navigations network-first with cache fallback; hashed `/_next/static` assets
cache-first; **API responses are never cached**), so the installed PWA opens
offline. A save that can't reach the network is queued on-device
(`lib/offline.ts`, keyed by day, last write wins) and replayed automatically
when the connection returns — the one-entry-per-day upsert makes replays
idempotent. Reading the record still needs a connection; it's capture that
must never miss.

## Notifications (PWA + Web Push)

Verum is installable (`app/manifest.ts`, `public/sw.js`) and sends Web Push
reminders. Setup:

1. Run `docs/supabase-notifications.sql` in the Supabase SQL editor.
2. Generate VAPID keys: `npx web-push generate-vapid-keys`.
3. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`
   and `CRON_SECRET` (locally and in Vercel).
4. Open the app → **Reminders** → *Enable reminders*, then *Send test*.

The daily reminder is driven by `vercel.json`, a single once-daily cron at
`30 19 * * *` (UTC) hitting `/api/cron/notifications`. Because a fixed UTC time
drifts an hour across BST/GMT, the route uses a wide Europe/London window so it
still fires near the configured time (default 20:30). It sends only if reminders
are enabled, there's no entry for the local day, and one hasn't already gone out
to that subscription — and disables subscriptions the push service reports as
gone (404/410). On Vercel Pro you can switch to `*/15 * * * *` for minute-level
precision; an external scheduler must send `Authorization: Bearer <CRON_SECRET>`.

## Auth

A single shared secret (`JOURNAL_ACCESS_TOKEN`). The `/login` page posts it to
`/api/login`, which validates it (rate-limited, constant-time) and issues an
HMAC-signed, 30-day session in an httpOnly cookie — the raw secret is never
stored client-side, and rotating `SESSION_SECRET` invalidates all sessions.
`middleware.ts` redirects unauthenticated page requests to `/login`; API routes
validate the session themselves and reject cross-origin mutations. Set
`JOURNAL_PUBLIC_READ=true` to allow unauthenticated GETs (journal, quotes,
streak, life markers — the full export and notification settings stay private).

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
| `JOURNAL_ACCESS_TOKEN` | yes | Shared login token — use a long random value |
| `SESSION_SECRET` | no | **Secret** — signs session cookies; rotate to log out everywhere (falls back to the access token) |
| `JOURNAL_PUBLIC_READ` | no | `true` to allow anonymous reads (default `false`; export + notification settings stay private) |
| `APP_TIMEZONE` | no | IANA timezone for server-side "today" (default `Europe/London`) |
| `QUOTES_CORE_THRESHOLD` | no | Default `3` |
| `QUOTES_AVOID_DAYS` | no | Default `14` |
| `NEXT_PUBLIC_DOB` | no | Life calendar DOB, default `1993-12-19` |
| `NEXT_PUBLIC_LIFE_YEARS` | no | Life calendar span, default `108` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | for push | VAPID public key (browser-exposed) |
| `WEB_PUSH_PRIVATE_KEY` | for push | **Secret** — VAPID private key, server only |
| `WEB_PUSH_SUBJECT` | for push | `mailto:` contact for the push service |
| `CRON_SECRET` | for push | **Secret** — protects the cron route |
