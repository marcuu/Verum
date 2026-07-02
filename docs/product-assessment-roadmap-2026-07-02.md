# Verum — Product Assessment & Roadmap (Gibson Biddle method)

*2026-07-02 · Applies Biddle's Netflix-era toolkit — GLEe, DHM, GEM, and the
strategy → proxy-metric → tactic lockup — to the product as it stands on `main`.*

Biddle's frameworks were built for consumer businesses with millions of members.
Verum is deliberately a product for **one person**. Rather than pretend
otherwise, this document adapts the frameworks honestly: where Biddle says
"members," read "the owner"; where he says "margin," read "cost of ownership"
(hosting spend, maintenance hours, trust). The discipline transfers even where
the scale doesn't — strategy is still a set of hypotheses about how to delight,
each testable with a proxy metric, and a roadmap is still those strategies made
concrete, not a feature list.

---

## 1 · Where the product is today (assessment)

**What it is.** A single-user daily journal PWA: one quick-capture entry per
day, inline editing, full-text search, JSON export, a curated daily quote
(gated behind logging today), a memento-mori life calendar (52 weeks ×
age-years, with editable life markers), and Web Push reminders (daily nudge,
streak rescue, weekly reflection, monthly backup prompt). Next.js on Vercel,
Supabase Postgres behind service-role-only API routes, shared-token auth with
signed sessions.

**What's working** (evidence: `docs/design-review.md`,
`docs/product-review-iteration-2026-06-27.md`, `docs/user-story-tracker.csv`):

- **Capture is genuinely fast.** Open → type → Enter. The first screen is the
  capture surface; no prompts, moods, or tags. This is the product's core loop
  and it's healthy.
- **The reward ordering is right.** The daily quote unlocks only after today is
  logged — delight arrives *after* the honest act. This is the product's best
  detail and worth protecting.
- **The retention loops are quiet and appropriate.** Streak, "on this day"
  recall, and gated reminders — low-noise mechanisms suited to a private tool.
- **The foundation was recently hardened.** Signed sessions, rate limiting,
  scoped public read (PR #34); priority push alerts (PR #33). Security posture
  is documented and current.
- **Strategic coherence.** The product knows what it refuses to be: no social
  surface, no gamification arms race, no quantified-self dashboard.

**What's not working:**

1. **The record can quietly lie.** Any past day is silently editable, so the
   streak measures what the data says, not what happened. The design review
   called this the riskiest assumption in the product — "a streak motivates
   honest journaling rather than performative logging" — and it remains
   untested and unmitigated.
2. **Quotes are a feature you can't reach.** The empty state says "Add one via
   the API"; there is no in-product way to add or curate quotes. A gated reward
   that resolves to an API instruction is ceremony without payoff.
3. **Day semantics are incoherent.** Entries and streaks run on UTC; reminders
   run on Europe/London. A late-evening entry can land on the "wrong" day, which
   directly corrupts the honest-record promise (P3, still open).
4. **Trust in changes is thin.** No unit or E2E coverage on save, undo,
   streak computation, or reminder preferences (test-coverage score: 45).
   For a product whose asset is an irreplaceable personal record, regression
   risk *is* product risk.
5. **The emotional job is under-served.** The life calendar renders finitude
   but doesn't yet make it *felt* — weeks-remaining isn't stated, the current
   week doesn't breathe, and the "compressed extra week" legend teaches the
   user implementation math.

**Scores carried forward** (from the 2026-06-27 review): Product Health 84,
UX 88, Strategic Product 88, Growth/Retention 78, Test Coverage 45. The shape
of those numbers matches the assessment: strong core, weak safety net.

---

## 2 · GLEe — Get big, Lead, Expand

Biddle's GLEe asks: what does the product get big on, then lead, then expand
into, over a decade? For a single-user product, "big" means *depth of the
record*, not user count.

| Phase | Horizon | Statement |
|---|---|---|
| **Get big on…** | now → 1 yr | **the daily habit.** A near-unbroken, honestly-kept daily record. Everything else exists to serve capture. |
| **Lead in…** | 1 → 3 yrs | **honest reflection.** Become the most truthful mirror the owner has: recall, patterns, anniversaries, a life calendar that's felt rather than viewed. Leadership here means the record is trusted enough to *consult*, not just append to. |
| **Expand into…** | 3 → 10 yrs | **a lifetime record.** Decades of entries as a durable, portable, private asset — resilient to platform death (Vercel/Supabase churn), format-open, and eventually a legacy artifact. |

The sequencing discipline matters: don't build "Expand" features (fancy
analysis, multi-format archives) while "Get big" (the habit, the honest
record) has open integrity holes.

## 3 · DHM — how does Verum win?

**D**elight customers in **H**ard-to-copy, **M**argin-enhancing ways —
adapted: *Delight the owner, in ways no substitute app can copy, at near-zero
cost of ownership.*

- **Delight:** frictionless capture; the earned daily quote; being shown your
  own life honestly (on-this-day, the life calendar, weeks remaining).
- **Hard-to-copy:** not the code — any journal app has a text box. The moat is
  (a) the **accumulated record itself**, which compounds daily and cannot be
  cold-started elsewhere, and (b) **the trust property**: a private,
  self-hosted, honesty-first design no VC-backed journaling app will match,
  because their incentives point at engagement theater. Every roadmap item
  should deepen one of these two moats.
- **Margin (→ cost of ownership):** stays within free tiers (single Vercel
  cron, one Supabase project), zero third-party data processors, and — the
  scarcest resource — **low maintenance hours**. Tests and boring
  infrastructure are margin-enhancing moves here.

DHM verdict on the current product: Delight is good, Hard-to-copy is strong
*only if the record stays trustworthy* (weakness #1 and #3 attack the moat
directly), Margin is fine but fragile without tests.

## 4 · GEM — priority order

Biddle forces an explicit ranking of Growth, Engagement, Monetization. For
Verum:

1. **Engagement** — the daily habit and the trust in the record. This is the
   whole game.
2. **Growth** — reframed as *growth of the record's value*: depth, recall,
   durability. (User-count growth is explicitly refused; single-user is the
   product.)
3. **Monetization** — reframed as *cost containment*: free-tier hosting, low
   upkeep. Never traded against #1.

Tie-breaker rule for every future decision: **when engagement mechanics and
honesty collide, honesty wins** (the design review's central finding, adopted
here as strategy).

---

## 5 · Product strategy — the lockup

Biddle's core artifact: each strategy is a hypothesis about how to delight in
hard-to-copy, margin-enhancing ways, paired with a proxy metric and tactics.
The high-level engagement metric everything ladders up to:

> **North star: % of days logged with a same-day, non-trivial entry, trailing
> 90 days.** ("Same-day" and "non-trivial" are what make it an honesty metric
> rather than a streak metric.)

All proxy metrics below are computable from existing tables
(`verum_entries.created_at` vs `day`, text length, `verum_notification_deliveries`,
`verum_life_markers`) — no new tracking infrastructure needed beyond a small
metrics endpoint or monthly SQL review.

| # | Strategy (hypothesis) | Proxy metric | Tactics |
|---|---|---|---|
| 1 | **Effortless capture** — if opening the app and saving today's entry stays under ~5 seconds, the habit sustains itself. | Median seconds from open → saved entry; % days logged (T90). | Keep Today as first screen (guard against nav creep) · offline-first save via the service worker so capture works without signal · first-run empty state that teaches capture without onboarding chrome. |
| 2 | **An honest record** — if the record can't quietly lie, its long-term value (the moat) compounds. | % of entries created on their own day (vs backfilled); streak defined as *truthful presence*. | Mark backfilled entries as such (visible, not punitive) and exclude them from the live streak · soften the miss state (no guilt-red framing; a gap is honest data) · **resolve UTC vs local-day end to end** — pick local day, migrate, document (P3) · run Biddle-style hypothesis test: two weeks of self-observation — "am I writing to record or to keep the flame?" — before any further streak investment. |
| 3 | **Meaningful recall** — if the record talks back (on-this-day, reflection, search), consulting it becomes a second habit that reinforces the first. | Recall interactions per week (past-entry opens, anniversary views, searches, weekly-reflection opens). | Weeks-remaining stated plainly on the life calendar; current week gets presence (the "11-star" detail) · delete the compressed-extra-week legend · weekly reflection surfaces 2–3 resurfaced entries, not stats · in-product quote add/curation so the earned reward is real — or hide the quote box until seeded (invisible beats broken). |
| 4 | **Quiet reliability** — if reminders always arrive and data can never be lost, trust makes the other strategies possible. | Reminder delivery success rate; days since last verified backup; regressions shipped to capture/streak flows (target: 0). | Focused tests on the highest-risk flows: entry save/undo, streak computation, reminder preferences, life-marker editing (P4) · automated backup verification (monthly export → checksum → confirmation) rather than a mere prompt · delivery-failure visibility in Reminders settings. |

**What we're saying no to** (Biddle: strategy is as much the no-list):
multi-user or social anything · points, badges, levels, guilt mechanics ·
AI-generated prompts or mood tracking · analytics dashboards · any UI that
points at the API as if it were a feature · paid infrastructure while free
tiers suffice.

---

## 6 · Roadmap — rolling four quarters

Biddle's roadmap format: organized by strategy, not by feature; each quarter
has a theme; tactics are bets that can be killed if the proxy metric doesn't
move. Sized for a single-maintainer cadence.

### Q3 2026 — *"Make the record impossible to fake"* (Strategy 2 + 4)

The moat-repair quarter. Nothing new-shiny ships until the honesty holes close.

- Decide and migrate day semantics (local-day recommended); document in README.
- Backfill marking + truthful-presence streak; soften the miss state.
- Test harness: unit tests for `lib/streak.ts` and date helpers; integration
  tests for entry save/undo and reminder preferences.
- Run the two-week streak-honesty self-observation; record the verdict in
  `docs/`. **Kill criterion:** if the flame provably pressures filler entries,
  demote it to a quiet count or remove it.
- *Metric to move:* % same-day entries ≥ 95; zero capture/streak regressions.

### Q4 2026 — *"Earn the reward, honor the moment"* (Strategy 3)

- In-product quote add/edit (minimal: text + author, owner-only); retire "Add
  one via the API"; hide the box when unseeded.
- Life calendar: weeks-remaining stated as plainly as weeks-lived; current-week
  presence; delete the compressed-week legend.
- *Metric to move:* recall interactions/week up; quote box never renders a
  dead-end state.

### Q1 2027 — *"The record talks back"* (Strategy 3 + 1)

- Weekly reflection push deepens: resurfaces 2–3 past entries chosen for
  resonance (same week last year, same marker period), not stats.
- Offline-first capture (queue writes in the service worker, sync on
  reconnect).
- First-run empty state for a fresh install.
- *Metric to move:* % days logged (T90) holds ≥ target through winter — the
  hard season for any daily habit.

### Q2 2027 — *"Built to outlive its stack"* (Strategy 4, Expand groundwork)

- Verified automated backups: monthly export delivered + integrity-checked,
  surfaced in-app ("last verified backup: N days ago").
- Portability pass: documented restore path from a bare export to a fresh
  deployment; consider a second format (plain-text/Markdown archive) alongside
  JSON.
- Annual review artifact: a generated "year against the calendar" view —
  entries + markers for the closing age-year.
- *Metric to move:* days-since-verified-backup ≤ 31, always.

### Standing rules across all quarters

- Any tactic gets one quarter to move its proxy metric or it's killed
  (Biddle: strategies are hypotheses, not commitments).
- Engagement mechanics never ship if they trade against honesty.
- Cost of ownership stays flat: free tiers, one cron, no new services.

---

## 7 · Risks & open hypotheses

| Risk | Bet at stake | Cheapest test |
|---|---|---|
| The streak causes performative logging | Strategy 2, the whole moat | Two-week self-observation (Q3, costs nothing) |
| Local-day migration corrupts historical days | Strategy 2 | Dry-run the migration against an export copy first |
| Recall features become noise, not resonance | Strategy 3 | Ship the smallest version; watch weekly interactions for one month |
| Single maintainer bandwidth stalls the safety-net work | Strategy 4 | Front-load tests in Q3 while motivation is highest; treat them as unskippable |

## 8 · Cadence

Review this document quarterly against the proxy metrics (a 30-minute SQL
session against Supabase suffices). Update the lockup, kill dead tactics, and
roll the roadmap forward one quarter. The strategies should be stable for
years; the tactics should not survive contact with evidence.
