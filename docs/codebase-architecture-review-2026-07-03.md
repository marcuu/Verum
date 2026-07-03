# Verum — Codebase & Architecture Review (2026-07-03)

Reviewer scope: full source tree (`app/`, `lib/`, `components/`, `middleware.ts`,
`public/sw.js`, config), the Supabase schema in `docs/*.sql`, the prior
assessments in `docs/`, and all 55 pull requests (open, merged, and
closed-unmerged). Verification: `npm test` (53 passing), `tsc --noEmit` (clean).

---

## 1. Executive summary

This is a healthy codebase for what it is: a single-user journal PWA, ~5,800
lines of TypeScript, with an unusually strong security posture and unusually
good documentation for a personal project. The architecture is simple and
consistently applied — thin API routes over a service-role Supabase client,
pure logic extracted into `lib/` where it is tested, one shared auth guard used
by every route.

The three most important gaps are **process, not code**:

1. **No CI.** Tests and typecheck exist but nothing runs them on a PR. The
   #53 → #54 merge-then-revert cycle is the direct cost of this.
2. **One correctness bug that breaks a user promise**: the Reminders UI offers
   time pickers (`daily_time`, `rescue_time`, `weekly_time`, `backup_time`)
   that scheduling completely ignores — the window helper written for them
   (`lib/notifications/schedule.ts:39`, `isWithinWindow`) is dead code.
3. **A 960-line god component** (`app/page.tsx`) that every UI change must
   pass through — and UI changes are where the project's only revert happened.

Everything else below is graded housekeeping.

---

## 2. Architecture review

### What is genuinely good

- **Auth is one pattern, applied everywhere.** All 17 API route files call
  `requireAuth()` (or `assertCron()`), verified exhaustively. Sensitive routes
  (`entries/export`, notification settings/deliveries) opt out of
  `JOURNAL_PUBLIC_READ` via `allowPublicRead: false`. Page routes are covered
  by `middleware.ts`. There is no second way to reach data.
- **The security assessment loop actually closed.** Every finding in
  `docs/security-assessment-2026-07-02.md` (H1 rate limiting, H2 raw-secret
  cookie, M1 timing-safe compares, M2 query-string cron secret, M3 open
  redirect, M4 public-read scoping, M5 HSTS/Permissions-Policy, M6 CSRF origin
  check, L1 LIKE escaping, L3 generic errors, L4 timezone validation + SW
  same-origin pin) is fixed in the current code. Sessions are now HMAC-signed,
  expiring, `__Host-`-prefixed in production, with constant-time comparison
  (`lib/session.ts`). This is better auth hygiene than most production SaaS.
- **Day semantics are thought through and documented.** "A day is the day the
  owner lived" — client saves against device-local date (`lib/client.ts`),
  server computes "today" in `APP_TIMEZONE` (`lib/dates.ts`), timestamps stay
  UTC. The README explains the migration posture (prospective only).
- **Offline design is correct.** The service worker never caches `/api/*`; the
  capture queue (`lib/offline.ts`) is keyed by day so replays collapse to last
  write, and the server's one-entry-per-day upsert makes replay idempotent.
  Navigations only cache non-redirect 200s so a `/login` redirect can never
  poison the shell.
- **The notifications subsystem is the best-factored module.** Jobs are pure
  functions of a `JobContext` (`lib/notifications/jobs/*`), delivery is
  centralized with per-period dedupe backed by real unique indexes in the
  schema, and dead subscriptions (404/410) are disabled automatically.
- **Pure logic is tested where it matters.** Streak grace-window math, date
  helpers, offline queue, life-week math, Markdown export, reflection
  excerpting — 53 tests, all passing, fast (<1s).
- **Docs are a working part of the system.** README matches the code (I
  checked its claims against implementation), SQL migrations are runnable,
  and product/security assessments live in-repo next to what they assess.

### Structural observations

- **Single-user assumptions are hardwired** (singleton preferences row
  `id = true`, one shared token, no user column on any table). This is fine —
  but it should stay a conscious decision. Any future "share with partner"
  feature is a schema migration plus an auth redesign, not a patch.
- **`app/page.tsx` (960 lines) owns all four tabs**, every piece of client
  state, the offline sync loop, keyboard shortcuts, deep-link handling, and
  the flash system. It works, but it's the file with the highest change
  frequency and the lowest test coverage, and it's where the project's only
  revert originated. Extract: `TodayTab`, `JournalTab`, a `useEntries()` hook
  (entries + streak + optimistic save/delete), and a `useOfflineSync()` hook.
  The logic is already cleanly `useCallback`-shaped; this is mostly a move.
- **The rate limiter is per-warm-instance** (`lib/rateLimit.ts`) — honestly
  documented in its header comment. On Vercel serverless a distributed
  attacker sees weaker limits than the constants suggest. The code comment
  already names the right fix (platform-level WAF rule on `/api/login`);
  do it in the Vercel dashboard, it's zero code.
- **Stateless sessions can't be revoked individually.** Logout clears the
  cookie but a stolen copy stays valid ≤30 days unless `SESSION_SECRET`
  rotates. Documented trade-off; acceptable at this threat level. If it ever
  bothers you, add an `iat` claim plus a "sessions issued before X are
  invalid" env var — still stateless, one line to revoke everywhere.

---

## 3. Findings

Ordered by (impact × likelihood), not by severity theater.

### F1 — Reminder time preferences are stored, shown, and ignored (correctness)

`components/NotificationSettings.tsx` renders `<input type="time">` for
`daily_time`, `rescue_time`, `weekly_time`, `backup_time`; the preferences PUT
validates and persists them. But the cron route pins each job to a fixed UTC
time in `vercel.json`, and the jobs "apply no time-of-day window" (comment at
`app/api/cron/notifications/route.ts:20-24`). `isWithinWindow()` in
`lib/notifications/schedule.ts` — written exactly for this — has **zero call
sites**. A user who moves their reminder from 20:30 to 07:00 sees the setting
save and nothing change.

**Fix (pick one):**
- Honor the preference: switch to a `*/15` (Pro) or hourly cron and gate each
  job with `isWithinWindow(local.hhmm, prefs.daily_time, …)` — the dedupe
  index already makes this safe; or
- Tell the truth: remove the time pickers, show the fixed schedule with a
  note ("Vercel Hobby: delivered near 20:30 UK time"), and delete
  `isWithinWindow` and the `*_time` columns from the UI surface.

Either is fine. The current state — a settings control wired to nothing — is
the one wrong option.

### F2 — No CI (process, highest leverage)

There is no `.github/workflows/`. `npm test`, `tsc --noEmit`, and
`next build` all exist and all pass, but every one of the 50 merged PRs landed
on the author's say-so. PR #53 merged, broke the UI, and had to be reverted by
#54 — a 20-line workflow running build + typecheck + tests on `pull_request`
would have been the cheapest reviewer on the team. Add Dependabot config in
the same PR (the 2026-07-02 security assessment recommended it; still absent).

### F3 — Quote voting is a lost-update race (minor correctness)

`app/api/quotes/[id]/vote/route.ts:32-50` does read → add delta → write. Two
concurrent votes lose one. Single-user makes this near-theoretical, but the
fix is smaller than the current code: one RPC or a Postgres
`update … set score = score + :delta … returning *`. The project already uses
an RPC for exactly this reason (`verum_pick_daily_quote` — chosen "atomically
in SQL"); voting should match the house style.

### F4 — `POST /api/entries` accepts any string as `day` and unbounded text

`app/api/entries/route.ts:43` — `day` is trimmed but never validated as
`YYYY-MM-DD` (a garbage value 500s at the DB instead of 400ing; a *valid but
wild* date like `0099-01-01` silently creates an entry the UI can barely
reach), and `text` has no length ceiling since PR #5 removed the cap. Validate
`^\d{4}-\d{2}-\d{2}$` + a plausible range (e.g. DOB…today+1) and a generous
byte cap (say 64 KB). Same check belongs on `entries/[day]` DELETE.

### F5 — Delivery log writes silently ignore their own errors

`lib/notifications/delivery.ts:105-107,114-116` — supabase-js doesn't throw;
the `insert` result's `error` is discarded. If the deliveries insert fails
(schema drift, quota), dedupe stops working and the user gets a duplicate push
every cron run with nothing in the logs. Check the error and `console.error`
it; the unique indexes will then be an actual backstop rather than a hope.

### F6 — Duplicate initial fetch on load

`app/page.tsx`: the mount effect calls `loadEntries("")` (line 149) and the
debounced-search effect fires `loadEntries("")` again 200ms later (line
166-171) because it runs on mount with `search === ""`. Two identical
full-journal fetches racing each other on every cold load. Skip the debounce
effect on first render (a `useRef` first-run guard), or fold initial load into
it.

### F7 — Full-journal fetch on every load and every keystroke (scale)

`GET /api/entries` has no `limit`; the client refetches the whole journal per
debounced search keystroke, and search is an unanchored `ilike '%q%'` with no
trigram index. At year one (~365 rows) this is irrelevant; at year ten
(~3,650 rows × growing text) it's a slow tab on mobile. Not urgent — but note
the shape of the fix now: `?limit=` + `?before=` cursor on the API (the UI
already renders only 7 rows by default), and a `pg_trgm` GIN index in a
`docs/supabase-entries-search.sql` migration when search feels slow.

### F8 — Env parsing can still produce NaN

`lib/constants.ts:12-17` — `parseInt(process.env.QUOTES_CORE_THRESHOLD ?? "3")`
yields `NaN` for a mistyped value, which then flows into the daily-pick RPC
and `isCore()`. The closed codex PR #32 fixed this class of bug; the fix
didn't survive the PR's closure. One helper: `intFromEnv(name, fallback)`
with a `Number.isFinite` check.

### F9 — Residual security items (all low, all known)

- CSP still allows `script-src 'unsafe-inline'` (`next.config.ts:26`) —
  nonce-based CSP via middleware is the eventual fix; low priority while
  there's no third-party script.
- The offline queue stores journal text in plaintext `localStorage` — fine on
  a personal device, worth a README sentence so it's a documented choice.
- The streak walker caps at 400 iterations (`lib/streak.ts:43`) — a 400+ day
  streak will report wrong numbers. Bump the bound or derive it from the
  entry span; cheap insurance for exactly the user this app is for.
- No error observability beyond `console.*` — enable a Vercel log drain or
  add Sentry (free tier) so failed crons and 500s are visible after the fact.

### F10 — No linter or formatter

No ESLint config, no Prettier, no `lint` script. The code is remarkably
consistent anyway (one author-agent, strong conventions), but CI (F2) wants a
lint step and future contributors won't share the house style by osmosis.
`eslint-config-next` + Prettier defaults, enforced in CI, done.

---

## 4. PR history review (55 PRs)

### Patterns

- **Velocity is extraordinary and mostly disciplined**: 50 merged PRs in ~5
  months of calendar time but effectively three working bursts (Jan 26,
  Jun 27–28, Jul 2–3). PR descriptions are consistently excellent — they state
  intent, mechanism, and verification. Several (#34, #38, #43) read like
  design docs. Keep this.
- **Assessment → roadmap → implementation loops work.** The security
  assessment (#34 fixed everything it found), the product assessments
  (#35, #48), and the roadmap PRs show a real strategy-to-backlog chain.
  This review is written to slot into that same loop.
- **Stacked branches caused friction.** #42 and #46 exist only to "collapse
  merged work to main", and #50 landed a doc "stranded from #48". Stacking
  without CI and without a merge queue produces exactly these repair PRs.
  With F2's CI in place, prefer: one branch per PR, always cut from `main`,
  merge promptly.
- **The one revert was a UI PR verified only by reading code.** #53 (five UI
  enhancements) merged and was reverted the same day by #54. The open #55
  redid a UI pass with screenshot verification against a production build —
  and found a real bug reading code couldn't (Tailwind v4's `overline`
  utility colliding with the `.overline` class). Lesson worth
  institutionalizing: **UI PRs need rendered evidence**, whether screenshots
  in the description or a Playwright smoke job in CI.

### Closed-unmerged PRs — anything lost?

- **#6 (SQLite → Supabase import script)**: superseded; migration is done.
  Nothing to recover.
- **#32 (codex validation & safety)**: mostly re-implemented later and better
  (#34 covered redirect hardening and more; #38 built the test harness). Two
  items did *not* survive: env-var parsing validation (now F8) and explicit
  accessible names on the capture inputs (placeholders are not accessible
  names; `app/page.tsx` capture/moment/catch-up inputs rely on them). Both are
  small; both are worth landing this time.

### Open PR #55 — recommendation: **merge**

Reviewed the full diff (6 files, +86/−57). It is exactly what a UI craft pass
should be: small, screenshot-verified against the production bundle, and it
fixes a real rendering bug (`.overline` / Tailwind v4 collision,
`text-decoration: none` reset). The `formatDay()` helper in `EntryRow.tsx`
correctly pins UTC so the displayed date can't drift off the ISO day key, and
keeps the ISO form in `title`. No behavioral risk spotted. Two nits, neither
blocking: `formatDay` hardcodes `en-GB` (consistent with the rest of the app),
and the removed 🔥 emoji was the only non-text glyph in the streak — an
intentional voice choice per the PR body.

---

## 5. Recommended order of work

| # | Action | Size | Pays for |
|---|--------|------|----------|
| 1 | CI workflow: build + typecheck + vitest on PR; add Dependabot | S | Every future PR (F2) |
| 2 | Merge PR #55 | — | Closes the UI-sweep thread |
| 3 | Decide F1: wire reminder times to `isWithinWindow`, or remove the pickers | S–M | Honest settings |
| 4 | Input validation: entries `day`/size (F4), env ints (F8), aria-labels from #32 | S | Correctness debt |
| 5 | Check delivery-log insert errors (F5); atomic vote via RPC (F3) | S | Notification + data integrity |
| 6 | ESLint + Prettier, enforced in CI (F10) | S | Contributor scale |
| 7 | Split `app/page.tsx` into tab components + hooks (§2) | M | Every future UI PR |
| 8 | Dedupe the double initial fetch (F6) | XS | Load performance |
| 9 | When search slows: pagination + trigram index (F7) | M | Year-three journal |
| 10 | Background: Vercel WAF rule on `/api/login`; log drain/Sentry; nonce CSP | S | Defense in depth |

Items 1–5 are a day of work combined. Item 7 is the only refactor; do it
before the next big UI iteration, not after.

---

## 6. Verdict

For its class — a single-owner product built fast with agent assistance — this
codebase is in the top tier: security done properly, logic tested where
testing pays, docs that match reality, and an assessment culture that closes
its own loops. The gaps are the classic solo-project ones: no CI to catch what
the author can't see, one settings surface that over-promises, and one
component that has absorbed the whole UI. All three are fixable in under a
week, and the first one makes every later fix safer.
