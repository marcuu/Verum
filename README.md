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
that selects and records the day's quote atomically, notification tables
(`verum_notification_preferences`, `verum_notification_subscriptions`,
`verum_notification_deliveries`), and a private `verum-backups` Storage bucket.

**Schema lives in `supabase/migrations/`** (ordered, one file per change).
The files are an exact mirror of the project's applied migration history
(pulled from `supabase_migrations.schema_migrations` on 2026-07-03), so the
CLI recognizes them as applied and `db push` only runs what's genuinely new:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

New schema changes = new timestamped file here, applied via `db push` (or the
Supabase MCP `apply_migration`, which records history the same way). Never
edit an applied migration; add a new one.

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
idempotent. Queued entries wait in plaintext `localStorage` on the device — a
deliberate trade-off for a personal device; don't enable capture on shared
machines. Reading the record still needs a connection; it's capture that
must never miss.

## Notifications (PWA + Web Push)

Verum is installable (`app/manifest.ts`, `public/sw.js`) and sends Web Push
reminders. Setup:

1. Apply the migrations in `supabase/migrations/` (see Database above).
2. Generate VAPID keys: `npx web-push generate-vapid-keys`.
3. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`
   and `CRON_SECRET` (locally and in Vercel).
4. Open the app → **Reminders** → *Enable reminders*, then *Send test*.

Reminders are driven by `vercel.json`: one once-daily cron per job (daily
reminder 17:30, streak rescue 19:00, weekly reflection 15:00, monthly backup
07:00 — all UTC), each hitting `/api/cron/notifications?job=…`. **Delivery
times are fixed by this schedule**, not user-configurable (the settings UI
shows them as facts), and a fixed UTC time lands an hour later on the clock
during BST. Jobs apply their own eligibility (enabled flag, entry/streak
checks, weekday/day-of-month) and per-period dedupe; the daily reminder sends
only if there's no entry for the local day — and subscriptions the push
service reports as gone (404/410) are disabled. An external scheduler must
send `Authorization: Bearer <CRON_SECRET>`.

**Backups are automatic — and sealed.** The monthly job writes a JSON
snapshot (entries, quotes, life markers) to the private `verum-backups`
Storage bucket — one object per month, upserted — and the push notification
reports the outcome instead of asking you to export by hand. When
`BACKUP_PUBLIC_KEY` holds an [age](https://age-encryption.org) recipient, the
snapshot is encrypted to that key before upload (`.json.age`): neither the
server nor the bucket ever holds a key that can read it back, so a bucket or
service-key compromise yields ciphertext. The matching identity file stays
offline with you (generate with `age-keygen`; store in a password manager or
on paper — **if you lose it, encrypted backups are unrecoverable by design**).
On its first encrypted run the job deletes that month's plaintext object;
sweep older months once by hand. Manual JSON/Markdown exports remain in the
header menu.

**The system pages its owner.** If a cron job throws, the route returns 500
(so Vercel records the failed run) and sends a priority `system_alert` push —
at most one per day — pointing at the delivery history panel.

## Operations

- **Logs**: Vercel → Project → Logs (all `[verum]`-prefixed). Delivery
  history is also visible in-app under Reminders.
- **A reminder didn't arrive**: check Reminders → Delivery history; a failed
  row shows the push-service error. Disable/re-enable reminders on the device
  to re-subscribe.
- **Restore from backup**: Supabase Dashboard → Storage → `verum-backups`,
  download the latest object. Encrypted (`.json.age`):
  `age -d -i verum-backup-key.txt verum-backup-YYYY-MM.json.age > backup.json`
  — standard age CLI, nothing project-specific. Plaintext (`.json`): open
  directly. Either way the arrays match the tables one-to-one.
- **Token leaked**: rotate `JOURNAL_ACCESS_TOKEN` and `SESSION_SECRET` in
  Vercel and redeploy — every outstanding session dies with the secret.

## Auth

A single shared secret (`JOURNAL_ACCESS_TOKEN`). The `/login` page posts it to
`/api/login`, which validates it (rate-limited via a durable Postgres counter
that holds across serverless cold starts, constant-time) and issues an
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

CI (GitHub Actions) runs `lint`, `typecheck`, `test`, and `build` on every
pull request; run the same four scripts locally before pushing.

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
| `BACKUP_PUBLIC_KEY` | no | age recipient (`age1…`) monthly backups are sealed to; keep the identity offline |
