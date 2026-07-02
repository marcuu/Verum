# Verum — Product Strategy & Roadmap (Gibson Biddle method) · Iteration 3

*2026-07-02. Iteration 1 set strategy; the implementation shipped same-day
(PRs #36–#47). Iteration 2 graded the result 7★ — and the CEO correctly
rejected it: it graded the code, not the experience. Iteration 3 starts where
Chesky's exercise actually starts: with the user. One structured research
session with the owner (the entire user base) replaced the guesswork.*

---

## 1 · The research

Four questions, answered by the owner:

| Question | Answer | What it means |
|---|---|---|
| How often do you actually write? | **A few times a week** | The habit hasn't locked. The north star (% days logged, T90) is materially below target — everything else is downstream of this. |
| Where does the experience lose you? | **"It doesn't feel special" + "Nothing pulls me back"** | Notably *not* "capture feels flat" and *not* "it's write-only." The product is competent but unloved — a utility, not an object — and it exerts no gravity. |
| What does the 11-star version feel like? | **"A beautiful object"** | Not intelligence, not zero-friction, not permanence. **Craft.** Something with enough beauty that you'd show someone, and would miss if it vanished. |
| Where and when do you write? | **"Phone, in moments"** | The most damning answer. Verum was designed around *one calm evening entry* — a single line you edit. The owner lives in *scattered moments through the day*. The 11 am moment dies by evening because adding it means **editing a text field**, not capturing a moment. |

**The design premise was wrong.** Every prior iteration assumed the evening
ritual; the user is a moments person. And the delight bar was mis-set:
iteration 2 pursued *resonance features*; the user is asking for *an object
with craft*.

## 2 · The honest grade

Grading the lived experience, not the feature list:

> **Verum today is ~3★.** It works, the words are safe, the streak counts —
> and it's a website you have to remember to open, set in a system sans-serif,
> that greets you with an empty text box, asks before it gives, fights the way
> you actually capture (moments → edit-a-field), and sends a reminder that
> drifts an hour and reads like a utility. Nothing about it says *this is the
> most personal object you own*.

The iteration-2 error, kept visible as a lesson: **shipped surface ≠ delivered
experience.** The offline queue, the local days, the delivery health — that's
1–5★ *insurance* (it stops the experience falling to 1★), not stars earned.
Real stars live in how the daily moment feels.

## 3 · The ladder, re-anchored to the user's 11

The user defined 11★: **a beautiful object**. The ladder is rebuilt around
that definition, from where we actually stand:

- **3★ (today)** — competent utility. Safe, tested, forgettable.
- **4★** — it stops fighting you: capturing a *moment* is one tap and one
  line, any hour, without editing anything.
- **5★ (expected)** — opening it feels intentional: the app *gives before it
  asks* — your own words greet you before the input does.
- **6★** — it reads like a journal, not a SaaS: real typography, the date as
  a masthead, the moon and the page as one composition. First time you show
  it to someone.
- **7★** — the pull is desire, not duty: the reminder arrives carrying a line
  of your own from yesterday; opening it is anticipated, not remembered.
- **8★** — the object extends to paper: the annual volume is heirloom-grade —
  title page, colophon, margins worth a shelf.
- **9★** — moments flow in from the OS: share-sheet and home-screen shortcut
  capture; Verum is where a thought lands, not an app you navigate to.
- **10★** — the calendar is art: the life grid is beautiful enough to hang;
  every surface, down to the empty states, is composed.
- **11★ (absurd, on purpose)** — a bound series with your name on the spine;
  the most beautiful private object you own; people who glimpse it ask where
  to get one, and the answer is *you can't — it's mine*.

**Frontier this cycle: 4★ → 7★.** That's not incremental polish; it's
rebuilding the daily moment around who the user actually is.

## 4 · Strategy → backlog lockup (v3)

Strategies re-weighted by the research. "Quiet reliability" is demoted to
hygiene — necessary, never again mistaken for stars. **Craft is promoted from
absent to lead strategy.**

### Strategy A — Moments, not homework  *(from: "phone, in moments")*
*Hypothesis: when capturing the 11 am moment is one tap + one line, entries
per week rise without a single reminder changing.* · **Proxy: % days logged
(T90); moments per logged day.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| A1 | **Moment capture** — when today is already logged, Today offers an always-ready "Add a moment…" line that *appends* to the day (never opens an editor). The day renders as its moments, not one blob. | 4★ | M | **P0** | If appended days read worse than composed ones after two weeks, revisit the rendering, not the appending |
| A2 | **Edit without mangling** — today-edit and Journal-edit move to auto-growing textareas so multi-moment days survive editing (an `<input>` destroys newlines) | 4★ | S | **P0** | n/a — correctness for A1 |
| A3 | **OS-level capture** — PWA share-target + manifest shortcut ("Log a moment"), so a thought lands in Verum from anywhere | 9★ | M | P2 | If unused after a month (deliveries table won't show it — self-observe), remove the manifest surface |

### Strategy B — A beautiful object  *(from: the user's own 11★ definition)*
*Hypothesis: when the product reads as a crafted journal rather than a web
utility, it earns the "special" feeling that no feature list has produced.* ·
**Proxy: the owner shows it to someone unprompted (binary, honest); days
logged before 22:00.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| B1 | **The page, not the app** — typography pass: an editorial serif for everything that is *the record* (entries, quote, date masthead, year review); system sans stays for controls. Date becomes a masthead composed with the moon. | 6★ | M | **P0** | If it reads as costume rather than craft, pull back to type scale + spacing only |
| B2 | **Object identity** — install surface: icon, splash, theme-color, status-bar so the home-screen open feels like an object, not a tab | 6★ | S | P1 | n/a (table stakes for "object") |
| B3 | **The volume, heirloom-grade** — title page, colophon, CSS-counter page numbers, margins for binding | 8★ | S | P1 | Stays CSS-only; wants a PDF pipeline → stop |
| B4 | **The calendar as art** — a considered pass on the life grid: ink weights, marker accents, negative space; suitable for the longest look the product ever gets | 10★ | M | P2 | If it costs legibility at 5px cells, legibility wins |

### Strategy C — The pull  *(from: "nothing pulls me back")*
*Hypothesis: gravity comes from the record giving before it asks — not from
louder reminders.* · **Proxy: opens per week; reminder → entry conversion.**

| ID | Backlog item | Rung | Size | Pri | Kill criterion |
|----|--------------|------|------|-----|----------------|
| C1 | **The greeting** — on open, before the input, one quiet line of your own: yesterday's last moment (or this day last year). The app gives first. | 5★ | S | **P0** | If it ever delays capture readiness, capture wins |
| C2 | **Reminders in your own voice** — the daily push carries a fragment of yesterday: *"Yesterday: '…' — and today?"* | 7★ | S | P1 | If it reads as surveillance rather than continuity, revert to the calm prompt |
| C3 | **Reminder precision** — revisit the once-daily-cron hour drift (accepted trade-off; reopen only if C2 raises the stakes of timing) | 7★ | M | P3 | Costs money or a new service → stays dropped |

### Hygiene (was Strategy 4 — never stars, always owed)
B11-restore-rehearsal, preference-validation tests, capture smoke test, and
the offline field pass carry over from iteration 2 unchanged (renumbered
H1–H4), each still sized S–M, scheduled one per quarter, starting with the
rehearsed restore.

### Sequencing — accelerate

- **Now (this cycle):** the four P0s — **A1 + A2 + B1 + C1** — as shipping
  PRs, not a quarter plan. They are one coherent move: *rebuild the daily
  moment around the actual user.*
- **Next:** B2, B3, C2 (the object extends; the pull speaks) + H1.
- **Then:** A3, B4 + remaining hygiene; re-run the research — the four
  questions again, compare answers. The exercise repeats until "few times a
  week" reads "near daily" and "doesn't feel special" is unpickable.

### The no-list (additions)

Everything from iteration 2 holds, plus: no skeuomorphic leather · no
decorative animation that delays capture · no craft that costs offline or
capture speed — the object is beautiful *and* it works on a plane.

## 5 · Risks

| Risk | Bet | Cheapest test |
|---|---|---|
| Serif typography reads as costume | B1 | Ship type scale + masthead first; the serif is one variable, revertable in a line |
| Moments make the Journal read like a log file | A1 | Render moments as a composed paragraph per day in Journal; only Today shows the moment structure |
| The greeting becomes noise by repetition | C1 | It rotates (yesterday / this-day-last-year) and never repeats a line two days running |
| Another iteration graded by the builder | all | The proxy for Strategy B is deliberately non-gameable: *did the owner show it to someone unprompted* |

## 6 · Cadence

Every iteration of this document now begins with the four research questions,
not a code walkthrough. Quarterly metrics stay. The star ladder re-anchors to
the user's own 11-star definition whenever the research answer changes — the
ladder belongs to the user, not the roadmap.
