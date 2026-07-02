# Verum — Product Assessment & Roadmap (Gibson Biddle method)

*2026-07-02 · Applies Biddle's Netflix-era toolkit — GLEe, DHM, GEM, and the
strategy → proxy-metric → tactic lockup — to the product as it stands on
`main`. Ideation runs through Brian Chesky's Airbnb star-experience exercise
(the "11-star" ladder — deliberately climbing past absurd, then walking back
to the frontier of buildable).*

*Revised per CEO direction: the first draft treated the owner as someone who
might game their own journal. Wrong lens. Verum has exactly one user, that
user is known, and they aren't an adversary. This version asks only one
question of every idea: **does it make the product more delightful, more
irreplaceable, or cheaper to own — for them?***

**How Biddle maps to a product for one.** His frameworks assume millions of
members. Adapted honestly: "members" = the owner; "margin" = cost of ownership
(hosting spend, maintenance hours); "growth" = growth of the record's value.
The discipline transfers even where the scale doesn't — strategy is still a
set of hypotheses about how to delight, each with a proxy metric, and a
roadmap is still those strategies made concrete, not a feature list.

---

## 1 · Assessment — where delight stands today

**What it is.** A single-user daily journal PWA: one quick-capture entry per
day, inline editing, full-text search, JSON export, a curated daily quote
(gated behind logging today), a memento-mori life calendar (52 weeks ×
age-years, with editable life markers), and Web Push reminders (daily nudge,
streak rescue, weekly reflection, monthly backup prompt). Next.js on Vercel,
Supabase Postgres behind service-role-only API routes, shared-token auth with
signed sessions. Recent quarters shipped real craft: liquid-glass navigation,
a live moon-phase header, priority push alerts, a hardened security posture.

**Delight already banked** (evidence: `docs/design-review.md`,
`docs/product-review-iteration-2026-06-27.md`, `docs/user-story-tracker.csv`):

- **Capture is genuinely fast.** Open → type → Enter. The first screen *is*
  the capture surface; no prompts, moods, or tags. The core loop is healthy.
- **The reward ordering is right.** The daily quote unlocks only after today
  is logged — delight arrives after the act. This is the product's best
  detail and the seed of its ritual.
- **The loops are quiet and personal.** Streak, "on this day" recall, gated
  reminders, the moon overhead. Past-day editing means a missed day is
  recoverable the next morning — exactly how a real journaler keeps a habit.
- **The owner can trust the container.** Signed sessions, rate limiting,
  scoped public read; private by construction.

**Delight left on the table:**

1. **The ritual's peak can be empty.** The quote unlock is the best moment in
   the product, yet there's no in-product way to add or curate quotes — the
   empty state points at the API. The ceremony sometimes resolves to nothing.
2. **The day boundary can betray an evening writer.** Entries and streaks run
   on UTC while reminders run on Europe/London; a late entry can land on
   tomorrow's date and a kept habit can read as broken. The product should
   match the user's lived day.
3. **Finitude is rendered, not felt.** The life calendar shows the weeks but
   never states weeks-remaining; the current week has no presence; the
   "compressed extra week" legend explains implementation math instead of
   meaning.
4. **The record doesn't talk back enough.** "On this day" exists, but the
   weekly reflection doesn't yet resurface the entries that would actually
   move the owner, and years of accumulated writing sit mostly silent.
5. **The safety net is thin.** No automated coverage on save, undo, streak,
   or reminder preferences (test-coverage score: 45). For an irreplaceable
   personal record, a regression is the one event that can destroy delight
   permanently — this is a margin issue, not a policing issue.

**Scores carried forward** (2026-06-27 review): Product Health 84, UX 88,
Strategic Product 88, Growth/Retention 78, Test Coverage 45. Strong core,
delight not yet fully cashed in, thin net underneath it.

---

## 2 · GLEe — Get big, Lead, Expand

| Phase | Horizon | Statement |
|---|---|---|
| **Get big on…** | now → 1 yr | **the daily ritual.** A near-unbroken record kept because the moment of logging is genuinely pleasant — capture in seconds, then an earned reward that's real. |
| **Lead in…** | 1 → 3 yrs | **reflection that moves you.** The most resonant mirror the owner has: recall, anniversaries, a life calendar that's felt rather than viewed. The record becomes something you *consult*, not just append to. |
| **Expand into…** | 3 → 10 yrs | **a lifetime artifact.** Decades of entries as a durable, portable, private asset — resilient to platform death, format-open, eventually a legacy object (see the top of the star ladder). |

## 3 · DHM — how Verum wins

*Delight the owner, in ways no substitute can copy, at near-zero cost of
ownership.*

- **Delight:** frictionless capture; an earned reward that's real; being shown
  your own life vividly; reminders that arrive like a friend, not a nag.
- **Hard-to-copy:** not the code — any journal app has a text box. Two moats:
  (a) the **accumulated record**, compounding daily, impossible to cold-start
  elsewhere; (b) **bespoke fit** — a private, taste-matched product no
  mass-market app can be, because they must design for everyone. Every roadmap
  item deepens one of these.
- **Margin:** free tiers (one Vercel cron, one Supabase project), zero
  third-party data processors, and low maintenance hours — which makes tests
  and boring infrastructure margin moves, not chores.

Verdict: the moats are sound; the gap is **under-delivered delight**. That is
where the roadmap goes.

## 4 · The star ladder — Chesky's exercise, run on Verum

Chesky's method: take the core experience, describe what 1–5 stars look like,
then keep climbing past reasonable into absurd. The absurd rungs aren't the
plan — they reveal the *direction* of perfect, and you walk back to the
frontier of what's buildable. The moment laddered here is **the daily log**:
the reminder, the writing, and what happens after.

- **1★** — You open the app and your entry is gone. (Data loss. The only
  unforgivable rung; everything in Strategy 4 exists to make this impossible.)
- **2★** — The entry saves onto the wrong date; the streak says you failed a
  day you didn't. The reminder never came. *(This is the UTC bug. We are
  shipping a 2-star experience to an evening writer today.)*
- **3★** — It works, but the reminder nags at a fixed hour whether or not
  you've written, and after saving… nothing happens.
- **4★** — Clean capture, entry saved, streak ticks. Functional, forgettable.
- **5★ (expected)** — Open → type → Enter. Saved instantly, streak ticks, a
  quote appears. *This is Verum's current best case — when the quote pool
  isn't empty.*
- **6★** — The reward is never empty and feels chosen: the quote pool is
  yours, curated in-product, and the unlock moment has a small ceremony to
  it. Missed yesterday? It's one tap to catch up, right on Today.
- **7★** — The app knows your rhythm. The reminder lands at *your* hour and
  never fires once you've written. The entry always lands on the day you
  lived. Writing works on a plane; it syncs when you land. The current week
  on the life calendar breathes, and weeks-remaining is stated as plainly as
  weeks-lived.
- **8★** — After you save, the app occasionally hands you this week from a
  year ago. The weekly reflection reads like a short letter assembled from
  your own sentences. On your birthday, a "year against the calendar" — the
  age-year just closed, its entries and markers on one page.
- **9★** — The record talks back across decades: the night before a life
  marker's anniversary, the entry you wrote that day resurfaces. Each year
  closes with a beautifully typeset volume — your year as a book, generated
  from your own export.
- **10★** — The journal is a life companion. Open it at week 1,700 of your
  life and it shows you week 1,700 — what you wrote, what surrounded it, how
  far along the calendar you were. The life calendar is something you visit
  to *feel* time, not check a grid.
- **11★ (absurd, on purpose)** — A biographer has read every word. At week
  4,000 a bound, multi-volume life record exists for your grandchildren; a
  time capsule of entries unlocks for them decades from now; the journal
  outlives its author as a designed inheritance.

**Walking back from 11:** the buildable frontier is **6★–8★**, and rung 9's
"year as a book" is reachable groundwork (a typeset artifact from the export).
The harvest, in priority order:

| Star rung | Harvested idea | Lands in |
|---|---|---|
| 2★ fix | Local-day semantics — the entry lands on the day you lived | Strategy 1, Q3 |
| 6★ | In-product quote curation + a real unlock ceremony | Strategy 2, Q3 |
| 6★ | One-tap catch-up for a missed yesterday | Strategy 1, Q4 |
| 7★ | Reminder at the owner's hour, silent once logged; offline capture | Strategies 1·4, Q4–Q1 |
| 7★ | Weeks-remaining stated; the current week breathes | Strategy 3, Q3 |
| 8★ | Resonant weekly reflection; birthday "year against the calendar" | Strategy 3, Q4–Q2 |
| 9★ | Typeset annual volume from the export (print-ready PDF) | Strategy 3, Q2 |
| 10★–11★ | Direction only: the record as legacy — keeps portability and format-openness non-negotiable | GLEe "Expand" |

## 5 · GEM — priority order

1. **Engagement** — the daily ritual and the pleasure of consulting the
   record. The whole game.
2. **Growth** — of the record's value: depth, recall, durability. User-count
   growth is explicitly refused; single-user *is* the product.
3. **Monetization** — cost containment: free tiers, low upkeep. Never traded
   against #1.

Tie-breaker for every decision: **choose whatever makes the daily moment more
delightful for this one specific user** — never what generalizes, scales, or
defends against hypothetical misuse.

---

## 6 · Product strategy — the lockup

Each strategy is a hypothesis about how to delight in hard-to-copy,
margin-enhancing ways, paired with a proxy metric and tactics (now carrying
the star-ladder harvest). The high-level metric everything ladders up to:

> **North star: % of days logged, trailing 90 days.** Simple presence — if
> the ritual is delightful, the number takes care of itself.

All proxy metrics are computable from existing tables (`verum_entries`,
`verum_notification_deliveries`, `verum_life_markers`, `verum_quotes`) — no
new tracking beyond a monthly SQL review.

| # | Strategy (hypothesis) | Proxy metric | Tactics |
|---|---|---|---|
| 1 | **Effortless capture** — if logging today (or catching up yesterday) stays under ~5 seconds from anywhere, the habit sustains itself. | Median seconds open → saved; % days logged (T90). | Local-day semantics so the entry lands on the day it was lived (kills the 2★ rung) · one-tap yesterday catch-up on Today (6★) · offline-first save via the service worker (7★) · guard Today's primacy against nav creep. |
| 2 | **An earned ritual worth savoring** — if the post-save moment reliably delights, logging becomes something looked forward to. | Quote pool size & freshness; zero dead-end reward states; days logged before 22:00 (a savored ritual happens earlier). | In-product quote add/edit/curation; retire "Add one via the API"; hide the box until seeded (6★) · design the unlock as a small ceremony — the transition from saved → quote should feel earned (6★) · reminder tuned to the owner's hour, silent once logged (7★). |
| 3 | **Finitude made felt** — if the life calendar and recall surfaces move the owner, the record becomes something consulted, deepening the moat daily. | Recall interactions/week (past-entry opens, anniversary views, life-tab visits); markers added/quarter. | Weeks-remaining stated as plainly as weeks-lived; current-week presence; delete the compressed-week legend (7★) · weekly reflection as a short letter assembled from the owner's own entries (8★) · birthday "year against the calendar" (8★) · typeset annual volume generated from the export (9★). |
| 4 | **Quiet reliability** — if data can never be lost and reminders always arrive, trust compounds and maintenance hours stay near zero (the margin play; also the guarantee behind every rung above 1★). | Reminder delivery success; days since last verified backup; regressions to capture flows (target 0). | Focused tests on save/undo, streak & date helpers, reminder preferences · automated backup verification (monthly export → checksum → in-app "last verified: N days ago") · delivery-failure visibility in Reminders. |

**The no-list** (strategy is what you refuse): multi-user or social anything ·
points, badges, levels, guilt mechanics · anti-gaming defenses against the
owner — the user is not an adversary · AI-generated prompts or mood tracking ·
analytics dashboards · UI that points at the API as if it were a feature ·
paid infrastructure while free tiers suffice.

---

## 7 · Roadmap — rolling four quarters

Organized by strategy, themed by quarter, every tactic a killable bet. Sized
for a single-maintainer cadence. Delight ships first; the net follows close
behind.

### Q3 2026 — *"From 5 stars to 6"* (Strategy 2 + 3, the 2★ fix)

- In-product quote curation; retire "Add one via the API"; hide until seeded;
  give the unlock its small ceremony.
- Life calendar: weeks-remaining stated; current-week presence; delete the
  compressed-week legend.
- Local-day migration (dry-run against an export copy first; document in
  README).
- *Metric to move:* zero dead-end reward states; life-tab visits up; every
  entry on the day it was lived.

### Q4 2026 — *"The record talks back"* (Strategy 3 + 1)

- Weekly reflection as a letter: 2–3 resurfaced entries chosen for resonance
  (same week last year, same marker period), not stats.
- One-tap yesterday catch-up on Today.
- Reminder timing tuned to the owner's hour; silent once logged.
- *Metric to move:* recall interactions/week up; % days logged (T90) holds
  through autumn.

### Q1 2027 — *"Never miss, never lose"* (Strategy 1 + 4)

- Offline-first capture (queue writes in the service worker, sync on
  reconnect).
- Test harness on the highest-risk flows: save/undo, streak & date helpers,
  reminder preferences.
- Delivery-failure visibility in Reminders settings.
- *Metric to move:* % days logged holds through winter — the hard season for
  any daily habit; zero capture regressions.

### Q2 2027 — *"Built to outlive its stack"* (Strategy 3 + 4, Expand groundwork)

- ~~Verified automated backups~~ — **dropped per CEO decision (2026-07-02)**;
  the monthly backup reminder + manual JSON/Markdown export remain the path.
- Portability pass: documented restore path from bare export to fresh
  deployment; plain-text/Markdown archive alongside JSON.
- Birthday artifact shipped: "year against the calendar," plus a first cut of
  the typeset annual volume (print-ready PDF from the export) — rung 9 made
  real.
- *Metric to move:* days-since-verified-backup ≤ 31, always.

### Standing rules

- Any tactic gets one quarter to move its proxy metric or it's killed —
  strategies are hypotheses, not commitments.
- The user is the owner, not an adversary — nothing ships whose purpose is to
  constrain or audit them.
- Cost of ownership stays flat: free tiers, one cron, no new services.

---

## 8 · Risks & open hypotheses

| Risk | Bet at stake | Cheapest test |
|---|---|---|
| Quote curation adds friction that dulls the ritual instead of feeding it | Strategy 2 | Ship the minimal add form; if the pool isn't growing after a month, simplify or seed in bulk |
| Local-day migration mislabels historical days | Strategy 1 | Dry-run against an export copy; diff before applying |
| Recall features become noise, not resonance | Strategy 3 | Ship the smallest version; watch weekly interactions for one month |
| Ceremony becomes chrome (the 6★ unlock over-designed into friction) | Strategy 2 | Time the save-to-quote moment; if it slows capture, cut it back |
| Single-maintainer bandwidth stalls the safety net | Strategy 4 | Q1 2027 is deliberately a reliability quarter; its tests are unskippable |

## 9 · Cadence

Review quarterly against the proxy metrics (a 30-minute SQL session
suffices). Update the lockup, kill dead tactics, roll the roadmap forward one
quarter — and re-run the star ladder once a year: as rungs 6–8 ship, the
frontier moves, and next year's "absurd" should be closer to rung 9.
