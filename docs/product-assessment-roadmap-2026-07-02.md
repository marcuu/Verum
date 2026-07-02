# Verum — Product Strategy & Roadmap (Gibson Biddle method) · Iteration 2

*2026-07-02, revised after implementation. Iteration 1 (in git history) set the
strategy and a four-quarter roadmap; the whole implementation was reviewed and
merged the same day (PRs #36–#47). This iteration re-runs the exercise from
the shipped product: the current experience, a fresh Chesky star ladder, and a
full strategy → backlog lockup for what comes next.*

*Standing adaptations from iteration 1 hold: "members" = the owner; "margin" =
cost of ownership; "growth" = growth of the record's value; the user is never
an adversary; and when in doubt, choose what makes the daily moment more
delightful for this one specific user.*

---

## 1 · The product experience today (as shipped)

Walk the day as the owner lives it now:

- **Open** — the installed PWA opens with or without a network (cached shell;
  `/api/*` never cached). The moon overhead is live.
- **Capture** — one line, Enter, done, seconds. The entry lands on the **day
  you lived** (device-local date; server "today" runs in `APP_TIMEZONE`).
  Offline, the words queue on-device and sync on reconnect — the save never
  bounces. *(#39, #43)*
- **The reward, earned** — on today's first save the daily quote arrives as a
  small ceremony: the box rises, the text warms from violet to ink, the
  actions fade in a beat later. The pool is yours: add and curate quotes
  in-product; the box hides entirely until seeded. *(#36, #37)*
- **Catch-up, not homework** — if yesterday went unlogged, Today offers one
  quiet line that expands into an inline input. Never shown to a fresh
  journal; gone the moment it's used. *(#41)*
- **Recall** — "on this day" in prior years sits under capture; the weekly
  reflection push now speaks in the owner's own words: *"A year ago this
  week: '…'"*, with count-copy fallback for young records. *(#40)*
- **Finitude, felt** — the life calendar states **≈ N weeks left** as plainly
  as weeks lived; the current week breathes; markers carry their accents; the
  compression legend is gone.
- **The birthday artifact** — for a week after each birthday, Today offers the
  year that just closed. `/year/[age]` lays that age-year out like a small
  book: the true 52/53-week strip, stats, markers, every entry in full — and
  **print is the annual volume** (a dedicated print stylesheet). The Life tab
  links to the last closed year all year round. *(#47)*
- **Never lose** — JSON export plus a **Markdown archive** (year chapters,
  written-out dates — readable in forty years with any text editor). Reminder
  **delivery health** is visible in settings: a red line when the last push
  failed, a quiet history behind a disclosure. *(#44, #45)*
- **Under it all** — 47 unit tests on the risk-bearing logic (streak & grace
  window, date math, age-year math, reflection selection, offline queue,
  archive formatter); signed sessions, rate limiting, service-role-only DB.

**Iteration-1 gaps, all closed:** empty reward ✅ (curation + ceremony) ·
UTC day betrayal ✅ (local days) · finitude rendered-not-felt ✅
(weeks-remaining, breathing week, birthday artifact) · record too quiet ✅
(reflection letter, catch-up, year review) · thin safety net ✅ (47 tests,
delivery visibility). **Dropped by decision:** verified automated backups —
the monthly reminder + manual JSON/Markdown export is the path (CEO,
2026-07-02).

## 2 · GLEe · DHM · GEM — re-affirmed, one turn of the crank

Strategies should be stable for years; these hold unchanged from iteration 1.
What moved is the *position*:

- **GLEe** — "Get big on the daily ritual" is now fully tooled; the product's
  centre of effort shifts one notch toward **"Lead in reflection that moves
  you"**. "Expand into a lifetime artifact" has its first real limb (the
  Markdown archive and printable volume).
- **DHM** — the two moats (the compounding record; bespoke fit) both deepened.
  The remaining delight gap is no longer missing surfaces — it's **depth of
  resonance** on the surfaces that now exist.
- **GEM** — Engagement > growth-of-record-value > cost containment. Costs
  stayed flat: no new services, one cron, free tiers.

> **North star (unchanged): % of days logged, trailing 90 days.**

## 3 · The star ladder, re-run

Iteration 1's ladder put the product's best case at 5★ and shipped the 6★–7★
frontier. Per the cadence rule — *as rungs ship, the frontier moves* — here is
the ladder as it stands now. Rungs 1–5 are unchanged and now guarded by tests;
the product's daily best case sits at **7★, with 8★ moments** (the letter, the
birthday artifact).

- **7★ (today's baseline)** — capture anywhere including offline; the day is
  the day you lived; the reward is earned, real, and yours; the calendar
  breathes and counts down honestly.
- **8★ — the record composes** — the weekly letter carries 2–3 of your own
  excerpts, not one; the annual volume has a title page and a closing page
  (weeks lived / weeks remaining) and is beautiful enough to *gift*; the
  first-run screen teaches capture in one line.
- **9★ — the record remembers for you** — the night a life marker's
  anniversary week begins, the entry you wrote that week resurfaces on Today;
  from any year review you can step to the same week in any other year; the
  Markdown archive gains decade chapters.
- **10★ — the record is portable proof** — a documented, *rehearsed* restore
  path: bare export → fresh deployment in minutes, on any host. The journal
  provably outlives Vercel, Supabase, and this codebase.
- **11★ (absurd, on purpose)** — the bound multi-volume legacy series; a time
  capsule of entries that unlocks for grandchildren; week 4,000 arrives and
  the record is simply *there*, whole, on whatever machines exist then.

**Buildable frontier this cycle: 8★–9★, with one 10★ down-payment (the
rehearsed restore).** Rung 11 stays direction, not backlog.

## 4 · Strategy → backlog lockup

Biddle's lockup, taken one level deeper than iteration 1: each strategy carries
its proxy metric and a **prioritized, sized backlog**. Sizes: S ≈ an evening,
M ≈ a weekend. Every item names its star rung and its kill criterion — a
backlog item is a bet, not a promise.

### Strategy 1 — Effortless capture
*Hypothesis: if logging (or catching up) stays under ~5 seconds from anywhere,
the habit sustains itself.* · **Proxy: % days logged (T90); median seconds
open → saved.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| B1 | **First-run empty state** — a fresh install's Today teaches capture in one quiet line, no onboarding chrome (open since the 06-27 review) | 8★ | S | P1 | If it adds any second screen or dialog, cut it |
| B2 | **Offline read cache** — the most recent ~30 entries readable on a plane, not just writable (extends the SW/queue work) | 9★ | M | P2 | If cache-staleness bugs cost more than offline reading delights, revert to capture-only |
| B3 | **Room to breathe** — Shift+Enter for a multi-line thought in capture; single-line remains the default posture | 8★ | S | P3 | If median entry length doesn't move in a month, the record didn't want it |

### Strategy 2 — An earned ritual worth savoring
*Hypothesis: if the post-save moment reliably delights, logging becomes
something looked forward to.* · **Proxy: quote pool size & freshness; zero
dead-end reward states; days logged before 22:00.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| B4 | **Pool health at a glance** — quote count (and core count) shown quietly in the composer, so a thinning pool is visible before the reward repeats | 8★ | S | P2 | If it reads as a stat rather than an invitation, remove the numbers |
| B5 | **Core quotes feel core** — a subtle mark when the day's pick is a core quote (earned through votes), no badges or points | 8★ | S | P3 | Anything louder than a glyph violates the register — cut |

### Strategy 3 — Finitude made felt / the record talks back
*Hypothesis: if recall surfaces move the owner, the record becomes something
consulted, deepening the moat daily.* · **Proxy: recall interactions/week
(past-entry opens, year-review visits, letter opens); markers added/quarter.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| B6 | **The letter, fuller** — weekly reflection composes 2–3 excerpts (this week last year + the same marker period), reading as one short letter | 8★ | M | **P0** | If Sunday letters start feeling like noise within a month, drop back to one excerpt |
| B7 | **Marker anniversaries** — when a life marker's anniversary week begins, the entry written that week resurfaces quietly on Today | 9★ | M | P1 | If resurfaced weeks miss emotionally (wrong entry, wrong moment), pause rather than tune endlessly |
| B8 | **The volume, typeset** — title page (name, age-year, dates), closing page (weeks lived · weeks remaining), print margins worthy of a shelf | 8★ | S | P1 | It must stay CSS-only; the moment it wants a PDF pipeline, stop |
| B9 | **Same week, other years** — from a year review, step to this week in any other year of the record | 9★ | M | P2 | If year-review visits stay flat a month after shipping, recall wasn't the gap |
| B10 | **Decade chapters** — the Markdown archive gains `# Part` breaks per decade of life, matching the calendar's decade rows | 9★ | S | P3 | Pure formatter change; kill only if it complicates restore |

### Strategy 4 — Quiet reliability
*Hypothesis: if data can never be lost and changes can't silently break
capture, trust compounds at near-zero maintenance cost.* · **Proxy: regressions
to capture flows (target 0); restore rehearsal ≤ 30 min; reminder delivery
success.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| B11 | **The rehearsed restore** — document and *actually perform* bare export → fresh deployment; record the steps and the elapsed time in `docs/` | 10★ | M | **P0** | None — this is the one bet that isn't optional; an unrehearsed backup is a hope, not a backup |
| B12 | **Preference-validation tests** — extract `isHHmm` / timezone validation to `lib/` and cover them; they guard every cron run | — | S | P1 | n/a (pure test debt) |
| B13 | **Capture smoke test** — one Playwright flow: login → type → Enter → entry exists; run pre-deploy | — | M | P2 | If it flakes more than it catches for a month, delete it without guilt |
| B14 | **Offline field pass** — a written 10-minute device checklist (install → airplane mode → write → reconnect → verify sync flash), run once per release that touches the SW | — | S | P1 | n/a (process, not code) |

### Sequencing (one quarter each, rolling)

- **Now → Q3 2026:** B6, B11 (the two P0s) + B1, B12, B14
- **Q4 2026:** B7, B8 + B4
- **Q1 2027:** B9, B13 + B2
- **Q2 2027:** B10, B3, B5 + re-run this exercise against the metrics

### The no-list (updated)

Multi-user or social anything · points, badges, levels, guilt mechanics ·
anti-gaming defenses against the owner · AI-generated prompts, mood tracking,
or sentiment analysis of the record · analytics dashboards · **automated
backup infrastructure** (dropped by CEO decision — manual export + reminder is
the path) · a PDF pipeline (print CSS is the volume) · paid infrastructure
while free tiers suffice · UI that points at the API.

## 5 · Risks & open hypotheses

| Risk | Bet at stake | Cheapest test |
|---|---|---|
| The fuller letter tips from resonance to noise | B6 | Ship at 2 excerpts before 3; one month of Sundays decides |
| Marker-anniversary recall lands on the wrong emotional moment | B7 | Ship for one upcoming marker anniversary only; expand if it moves you |
| Offline read cache introduces staleness confusion | B2 | Cache read-only with a visible "as of" line; kill on first confusion |
| The restore rehearsal reveals the export is insufficient | B11 | That *is* the point — run it early in the quarter, not late |

## 6 · Cadence

Quarterly: 30 minutes of SQL against the proxy metrics; update the lockup;
kill dead bets; pull the next quarter forward. Yearly (or after any cycle that
ships a frontier, as this one did): re-run the star ladder — today's 8★ should
read as next year's baseline. The strategies stay; the backlog should not
survive contact with evidence.
