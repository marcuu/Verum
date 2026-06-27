# Verum — a CEV product/design review

> Run of the Coherent Extrapolated Volition operating prompt against Verum itself.
> Reconstructed mental models used as tools, not impersonations. Few words, fully resolved.

## THE BRIEF

- **What it is:** A single-user daily journal. One quick-capture entry per day, inline edit,
  search, JSON export. Plus a curated daily quote (thumbs up/down → "core") and a memento-mori
  life calendar (52 weeks × age-years).
- **Who it's for:** One person — the owner. Shared-token auth, no accounts, no sharing.
- **Artifact under review:** The whole working product as it stands on this branch.
- **Decision wanted:** What is Verum actually for, and where is it fighting itself?

---

## The signal

**The name stakes the claim: _Verum_ = truth. The life calendar makes it literal — an honest
record of a finite life. But the streak flame and quote scores quietly optimize for chain-length
and dopamine, which is a different, lesser game. When honesty and gamification collide, honesty
wins. Demote the dopamine; protect the truth.** Everything below is in service of that one move.

The through-line is the power of *no*. Verum's value is what it refuses to become — not Duolingo
for feelings, not a quantified-self dashboard. Most of the work here is subtraction and discipline,
not features.

---

## 1 — THE JOB *(JtBD — Christensen)*

Nobody wants a journal. The owner hires Verum to make three kinds of progress:

- **Functional:** "Capture what happened today before it's gone." One field, one keystroke to save.
  The quick-capture bar nails this.
- **Emotional:** "Reassure me I'm not letting my life slip by unwitnessed." This is the real job,
  and the life calendar — not the text box — is what serves it.
- **Social:** Near zero by design (single user). Don't manufacture it.

What it fires: heavyweight journaling apps with prompts, moods, tags, and friction. Verum's
quick-capture is correctly the antidote to those. Keep it that way.

> The job outranks the idea. Any feature that doesn't advance "witness my finite life, honestly"
> is arbitrary, however clever.

## 2 — THE RISKIEST ASSUMPTION *(Hall)*

The whole thing rests on: **"A streak motivates honest journaling rather than performative logging."**
If false, Verum corrupts its own purpose — you write filler to keep the flame, and the record
stops being true.

Two honesty failures make this acute today:

- **The streak is silently backfillable.** Any past day is editable (`EntryRow.tsx`), so a broken
  chain can be retroactively manufactured. The streak measures *what the data says*, not *what
  happened* — a small lie the product invites.
- **"Logged ✓" rewards presence, not truth.** A one-word throwaway scores identically to a real
  entry. The incentive points away from honesty at the exact moment of capture.

**Cheapest test, before building anything:** for two weeks, watch your own entries. Are you writing
*to record* or *to keep the streak*? If even once it's the latter, the assumption is false and the
flame is a liability. This costs nothing and you are the entire user base.

> Honesty outranks everything beneath it. A motivator that pressures you to lie to yourself is dead,
> however well it retains.

## 3 — THE ESSENCE *(Ive)*

State it in one line, plainly enough to sound obvious:

> **Verum is an honest daily record set against the weeks you have left.**

That is the thing it is *for*. The text box and the life calendar are the inevitable form of that
sentence — one captures the day, one holds the finitude. They belong together and nothing about
them is arbitrary.

The streak flame is *not* derived from that sentence. It's borrowed from habit apps. It can stay
only if it's reshaped to serve truth rather than perfection (see Resolution). Simplicity here is
comprehension, not just fewer pixels: the moment you see the screen you should understand *this is
my life, written down, against the clock.*

## 4 — THE CONCEPTUAL MODEL *(Norman)*

One outright break in cause-and-effect, and one self-inflicted signifier:

- **Dead-end affordance — fix first.** When there are no quotes, the box says *"No quotes yet. Add
  one via the API."* (`QuoteBox.tsx:25`). The UI instructs an action the UI cannot perform. That's
  a broken model: the system tells you to do something only a developer can do. Either give the box
  a minimal "add quote" affordance, or — truer to the essence — hide the quote box entirely until a
  quote exists. A feature you can't reach from the product isn't a feature; it's a leak.
- **A signifier paid for nothing — "Compressed extra week."** The life calendar forces 53-week
  years into 52 columns, then adds a legend item to *explain its own math* to the user
  (`LifeCalendar.tsx:181`). The owner does not care about column arithmetic; they care whether a
  week happened. A signifier is a cost — add one only where comprehension genuinely fails. Here it
  fails because the implementation, not the concept, is leaking. Render the real weeks or absorb the
  variance silently; delete the legend entry.

## 6 — RESONANCE *(Chesky — the 11-star detail)*

The one detail already worth obsessing over is **gating the daily quote behind logging today**
(`app/page.tsx:248`). It's quietly excellent: the reward arrives *after* the honest act, never
before. This is resonance resting on a working essence — exactly the right order.

Protect it by making the reward real: a gated reward that resolves to *"Add one via the API"* is
ceremony wearing delight's clothes. Earn the moment, then honor it with an actual quote.

The 11-star version isn't more features — it's the life calendar becoming something you *feel*: the
current week breathing, the count of weeks-remaining stated as plainly as weeks-lived. Build for the
one person who will be moved by it, not a crowd who'd tolerate a dashboard.

---

## RESOLVING THE CONFLICTS

- **Streak vs. honesty (Hall beats Chesky).** Don't delete the streak — reframe it. It should
  reward *truthful presence*, not an unbroken chain. Concretely: stop letting silent past-day edits
  manufacture a current streak, and lower the emotional stakes of a miss (no guilt-red "Not logged
  today" framing that punishes a single honest gap). The flame serves the record or it goes.
- **Quote box: subtract vs. signpost (care for use decides).** Hiding the empty box serves the
  person living frictionlessly better than a label pointing at an unusable API. Subtract it; if
  quotes are meant to be user-curated, add the real affordance instead.
- **Life calendar: essence beats cleverness.** The proportional 52-column compression is engineering
  vanity surfaced as UI. Evidence (does the owner ever need to know a year had 53 weeks?) says it's
  inessential — so subtract the signifier.

## What this costs, and what I'm refusing

**Refusing:**
- The gamification arms race — no points, badges, levels, or guilt mechanics layered on the streak.
- Any UI that points at the API as if it were a user feature.
- Teaching the user the implementation's math (compressed-week legend).
- Multi-user / social surface area. The single-user constraint *is* the product.

**Costs:**
- Reshaping the streak risks the small retention bump a naïve flame gives. Accept it — a true
  record is the asset; a gamed one is worthless to its only user.
- Hiding the empty quote box means the feature is invisible until seeded. Correct: invisible beats
  broken.

## The one move, if you do nothing else

Make the record impossible to fake and the reward real:
1. The streak reflects truthful presence, not silently-backfilled data.
2. Replace *"Add one via the API"* with either a real add-quote affordance or nothing.
3. Delete the "compressed extra week" signifier.

Everything else is downstream of "Verum is an honest daily record set against the weeks you have left."
