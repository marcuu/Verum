# Verum Tech-Debt Scorecard

A repeatable framework for scoring technical debt in this codebase, plus the
first assessment (2026-07-03, run against `main` at `adb7986` — after the
architecture-review implementation #56 and the UI sweep #55 merged).

---

## Part 1 — The framework

### Why a scorecard

Point-in-time reviews (like `docs/codebase-architecture-review-2026-07-03.md`)
find issues; they don't tell you whether the codebase is getting better or
worse. This scorecard is the trend instrument: run it quarterly (or after any
big push), compare against the last run, and let the deltas — not the absolute
numbers — drive priorities.

### The eight dimensions

Debt is scored where it actually accrues interest, weighted for what matters
to a single-owner product whose asset is an irreplaceable personal record.

| # | Dimension | Weight | What it measures |
|---|-----------|:-:|------------------|
| 1 | **Change safety** | 20% | Can you change code and know you didn't break it? Tests, CI gates, verification practice. Weighted highest because every other debt is only payable if changes are safe to make. |
| 2 | **Architecture & modularity** | 15% | Coupling, component size, layering discipline, how much of the system one change must touch. |
| 3 | **Security** | 15% | Auth boundary, input validation, headers/CSP, secret handling, residual known risks. The journal is the asset. |
| 4 | **Data & schema** | 10% | Migration management, schema/code drift risk, integrity constraints, backup/recovery story. |
| 5 | **Operability** | 10% | Would you know if it broke? Error visibility, cron/job health, recovery path. |
| 6 | **Code quality & consistency** | 10% | Type strictness, lint posture, dead code, idiom consistency, comment discipline. |
| 7 | **Dependencies & platform** | 10% | Dependency currency and count, audit findings, constraints imposed by the platform tier. |
| 8 | **Documentation & knowledge** | 10% | Does written truth match running code? Setup, schema, and decision records. |

### Scoring anchors (1–5, halves allowed)

- **5 — No material debt.** Best practice for this project's scale; nothing to schedule.
- **4 — Minor debt, isolated.** Known, contained, cheap to pay; no velocity tax yet.
- **3 — Visible debt, manageable.** Taxing specific changes; should be on the roadmap.
- **2 — Active debt.** Taxing most changes in this area, or a realistic incident path.
- **1 — Blocking/dangerous.** Data-loss or security exposure, or area is effectively frozen.

**Composite** = Σ(score × weight) / 5, expressed as a percentage.
Grades: **A ≥ 90 · B 70–89 · C 50–69 · D 30–49 · F < 30.**

### The debt register

Scores summarize; the register is what you act on. Each item carries:

- **Principal** — one-time cost to retire it: **XS** (<1 h), **S** (half-day), **M** (1–3 days), **L** (1 wk+).
- **Interest** — ongoing cost while it stands: **High** (taxes most work or is an incident path), **Med** (taxes a specific area), **Low** (dormant until circumstances change).

Priority rule: **high interest first, then cheapest principal.** Low-interest
items are fine to carry indefinitely — carrying debt knowingly is a strategy,
not a failure; only unpriced debt is.

### How to re-run

1. `bash scripts/debt-evidence.sh` — collects the metrics (sizes, test counts,
   audit, outdated, lint, schema files, CI presence).
2. Score each dimension against the anchors, citing evidence. Judgement is
   expected; the script keeps the judgement honest.
3. Update the register: retire paid items (note the date), reprice survivors,
   add new ones.
4. Record the composite next to the previous runs in the History table.

---

## Part 2 — Assessment of 2026-07-03

Evidence: `scripts/debt-evidence.sh` output at `adb7986`; 60 tests passing in
6 suites; lint and typecheck clean; `npm audit` 2 moderate (Next-bundled
postcss); source ≈ 6,000 lines across `app/`, `components/`, `lib/`.

### Scores

| Dimension | Score | Weighted | Rationale (evidence) |
|-----------|:-:|:-:|----------------------|
| Change safety | **3.5** | 14.0 | CI now gates lint/typecheck/test/build on every PR; 60 unit tests cover the pure logic (streak, dates, offline queue, life-weeks, export, reflection). But **zero route-level tests** — the auth guard, input validation, and CSRF checks that were hand-verified in review have no regression net — and zero component tests; UI verification is still screenshots-by-hand (the #53 revert lesson is mitigated by CI, not eliminated). No coverage measurement. |
| Architecture & modularity | **3.5** | 10.5 | Layering is consistent (thin routes → `lib/`), the notifications subsystem is exemplary (jobs as pure functions of a context), HeaderMenu/BottomNav are now extracted. But `app/page.tsx` is still **869 lines** owning all four tabs' state and handlers; one layering leak (`page.tsx` imports `excerpt` from `lib/notifications/reflection` — a UI concern reaching into the notifications module); single-user assumptions hardwired throughout. |
| Security | **4.0** | 12.0 | Strong for its class: HMAC-signed expiring `__Host-` sessions, constant-time compares, per-IP login throttle, origin checks on mutations, full security-header set, generic error bodies, validated inputs on every write path, RLS locked with service-role-only access. Residuals, all known: CSP `script-src 'unsafe-inline'`; rate limiter is per-warm-instance (WAF rule still pending — dashboard action); stateless sessions not individually revocable; offline queue in plaintext localStorage (documented). |
| Data & schema | **2.5** | 5.0 | **The largest debt.** Schema lives as three run-once SQL files in `docs/` — one of which (`logical-month`) is a patch to another — with no migration tool, no ordering, no record of what's been applied where. Table shapes are hand-typed in TS with nothing detecting drift. Backup story is a monthly *reminder to export by hand*. Positives: real unique indexes back the dedupe paths, upserts keyed to natural keys, `verum_` prefix isolates co-tenancy. |
| Operability | **2.5** | 5.0 | Would you know if it broke? Mostly no. Nine `console.*` call sites and nothing collecting them — no error tracker, no log drain, no alerting. A failing cron 500s invisibly; the delivery-health panel in Reminders (good) is the only failure surface, and it requires the user to look. Recovery is Vercel redeploy + env rotation, undocumented. |
| Code quality & consistency | **4.5** | 9.0 | `strict: true`, **zero** `any`-casts, **zero** TODO/FIXME markers, ESLint (next/core-web-vitals + typescript) clean, comments consistently explain constraints rather than narrate code, dead code from F1 removed. Deducted half a point for the `contentEditable` entry editor (a known-quirky pattern) and small duplicated date logic between client (`localISO`) and server (`localDay`) that is intentional but undocumented at the call sites. |
| Dependencies & platform | **3.5** | 7.0 | Admirably small surface: 6 runtime deps. Dependabot now enabled. Open items: 2 moderate advisories via Next's bundled postcss (fix = routine Next patch bump, `15.5.18 → 15.5.20` wanted); majors pending on next 16, lucide-react 1.x, react 19.2; `web-push` is low-maintenance upstream. Platform: Vercel Hobby's once-daily cron forced the fixed-schedule compromise (F1) — a real constraint, honestly documented now. |
| Documentation & knowledge | **4.5** | 9.0 | README verified against code this week (stale cron-window claim fixed in #56); env table complete; SQL setup documented; assessments and decision records live in-repo and have a track record of being acted on. Missing: a recovery/incident runbook ("Supabase is down / the token leaked — now what") and the inherent bus-factor-of-one, which docs mitigate but can't remove. |

### Composite

**Σ weighted = 71.5 / 100 → Grade B**

Reading: the code itself is clean and safe to change (quality 4.5, security
4.0, CI in place), but the *system around the record* — schema management,
backups, and knowing when things fail — lags the code. The two 2.5s are where
a real loss scenario lives: an unnoticed cron failure is an inconvenience, but
a botched hand-run migration or a dead export habit is how a decade of journal
disappears.

### Debt register — 2026-07-03

| ID | Item | Dimension | Principal | Interest | Call |
|----|------|-----------|:-:|:-:|------|
| TD-1 | Schema as run-once SQL in `docs/`; no migration tool, ordering, or applied-state record | Data | **M** | **High** | Pay next. Adopt Supabase CLI migrations (or even a numbered `migrations/` dir + applied-log table); fold the three existing files in as the baseline. |
| TD-2 | No error visibility: `console.*` only, no tracker/drain/alerting; cron failures silent | Operability | **S** | **High** | Pay next. Sentry free tier or a Vercel log drain + one alert on cron non-200s. Half a day. |
| TD-3 | Automated backup is a *reminder*, not a backup — the export habit is load-bearing | Data | **S** | **High** | Extend the monthly cron job to also write the JSON export to Supabase Storage (or email it). Removes the human from the loop. |
| TD-4 | Zero route-level tests: auth gate, validation, CSRF invariants have no regression net | Change safety | **M** | **Med** | Vitest + `next-test-api-route-handler` (or plain handler invocation with mocked Supabase) over `requireAuth` matrix + entries validation. |
| TD-5 | `page.tsx` (869 lines): Today/Journal split still pending; needs a context design, not prop-drilling | Architecture | **M** | **Med** | Scheduled by the review; do it before the next feature that touches Today. |
| TD-6 | Login rate limiter per-warm-instance; WAF rule not yet configured | Security | **XS** | **Med** | Dashboard action, minutes. Do with TD-2's dashboard session. |
| TD-7 | No UI regression net (screenshots are manual); the #53 class of bug only caught by eyes | Change safety | **M** | **Med** | One Playwright smoke (login → capture → journal renders) in CI would cover the spine. |
| TD-8 | CSP allows `script-src 'unsafe-inline'` | Security | **M** | **Low** | Carry until a third-party script or nonce support makes it cheap. |
| TD-9 | Search fetches the full journal per keystroke; unanchored `ilike`, no index | Architecture | **M** | **Low** | Carry; reprice when the journal passes ~2k entries or search feels slow. |
| TD-10 | Majors pending: next 16, lucide 1.x, react 19.2 | Dependencies | **S** | **Low** | Let Dependabot surface them; take next 16 deliberately, not by default. |
| TD-11 | Single-user hardwiring (singleton prefs row, one token, no user column) | Data | **L** | **Low** | Documented, deliberate. Reprice only if the product ever grows a second reader. |
| TD-12 | UI imports `excerpt` from `lib/notifications/reflection` (layering leak) | Architecture | **XS** | **Low** | Move `excerpt` to a shared `lib/text.ts` next time either file is open. |

Retired this cycle (by #56, for the record): dead `isWithinWindow` + phantom
time-picker settings, vote lost-update race, unvalidated entry `day`/size,
swallowed delivery-log errors, duplicate initial fetch, NaN-able env parsing,
400-day streak cap, no CI, no lint, missing input a11y names.

**Update, same day (debt-payoff pass):**

- **TD-1 PAID** — schema now lives in `supabase/migrations/` as an **exact
  mirror of the live project's applied history** (all seven migrations pulled
  from `supabase_migrations.schema_migrations`, versions and contents
  verified against production — which corrected two wrong guesses in the
  first-pass reconstruction: `day` columns are `text` not `date`, and the
  daily-pick RPC prefers *regular* quotes over core). The run-once files in
  `docs/` are gone; repo and database can no longer drift silently.
- **TD-2 PAID** — a throwing cron job now logs, returns 500 (platform records
  the failure), and pages the owner via a priority `system_alert` push on the
  app's own channel, deduped to one per day by the existing delivery index.
- **TD-3 PAID** — the monthly job performs the backup itself: JSON snapshot
  of entries/quotes/life-markers upserted to the private `verum-backups`
  Storage bucket; the notification is now a receipt (and a priority alert on
  failure), not a chore. Restore path documented in README → Operations.
- **TD-4 PARTIALLY PAID** — 13 route-level tests (`test/entriesRoute.test.ts`)
  now pin the auth gate, tampered-cookie rejection, CSRF origin check,
  public-read scoping (export stays private), and the entry validation
  matrix, using real HMAC session values. Remaining: the other write routes.
- **TD-12 PAID** — `excerpt`/`lastLineOf` moved to `lib/text.ts`; the UI no
  longer imports from the notifications module.

- **TD-6 PAID (differently than priced)** — the Vercel MCP toolset exposes no
  firewall management, and WAF rate-limit rules aren't available on the Hobby
  plan regardless. So the guarantee moved into Postgres instead: a
  `verum_login_throttle` table + atomic `verum_login_failure` function give
  the login limiter a durable, cross-instance counter, with the in-memory
  limiter demoted to a database-down fallback. Verified live against
  production before wiring the route.

Applied to the live project the same day (via Supabase MCP): the
`verum-backups` bucket, the throttle table/function, and a `search_path` pin
on `verum_pick_daily_quote` (security lint 0011). The repo's
`supabase/migrations/` now mirrors `supabase_migrations.schema_migrations`
exactly — ten migrations, byte-for-byte.

TD-5 and TD-7 remain scheduled. Data & schema, Operability, and Security
should be re-scored at the next quarterly run with these in place.

### History

| Date | Composite | Grade | Notes |
|------|:-:|:-:|-------|
| 2026-07-03 | **71.5** | **B** | Baseline run, post #55/#56. Weakest: Data & schema 2.5, Operability 2.5. |

### What would move the number

Paying TD-1, TD-2, and TD-3 (~2–4 days total) plausibly lifts Data & schema to
4 and Operability to 4: composite ≈ **80 (B+)**. That is the highest-leverage
half-week available in this codebase — none of it is feature work, all of it
protects the record.
