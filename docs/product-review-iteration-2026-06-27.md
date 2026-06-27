# Product Review Iteration - 2026-06-27

## Scope

Reviewed the current Verum codebase after the recent Today/Journal/Reminders/Life navigation work. The canonical feature inventory is `docs/user-story-tracker.csv`.

## Council Synthesis

Jony Ive: The app's best direction is still reduction. Today should remain the product's center of gravity, with reminders and life calendar controls kept secondary. The undefined marker-editor surface token is a craft defect because it makes a small, intimate interaction feel less inevitable.

Nikita Bier: The strongest retention loops are low-noise ones: daily capture, streak continuity, "on this day" recall, and carefully gated reminders. Adding more prompts would be lower leverage than making existing memory surfaces feel reliable.

Marty Cagan: The product is strategically coherent as a private daily record. The highest-value work is not a new feature; it is protecting trust in existing reflective workflows and keeping documentation current enough that future changes do not reintroduce confusion.

Alan Cooper: The main workflow is efficient: open, write, save. Secondary workflows should remain discoverable without stealing focus. Life marker editing is a reasonable secondary workflow, but it must render consistently because visual uncertainty increases cognitive load.

## Prioritized Backlog

| Priority | Problem | Evidence | Expected Outcome | Effort | Status |
|---|---|---|---|---:|---|
| P0 | Life marker editor uses an undefined CSS token. | `app/globals.css` referenced `var(--paper)` though only `--bg` existed. | Marker editor background, input surface, and selected-ring contrast render consistently in light and dark mode. | 1 | Done |
| P1 | Product inventory was stale after recent UX changes. | Tracker still described confirmation dialogs and omitted newer reminders, notification jobs, past entries, and life markers. | Future review and development starts from an accurate map of the product. | 2 | Done |
| P2 | Reminders is the densest screen in an otherwise quiet app. | Four reminder groups plus setup copy and test controls share one tab. | Consider progressive disclosure for advanced reminder types after core daily setup. | 4 | Open |
| P3 | UTC day semantics may not match a user's local journaling mental model. | Daily capture and streak use UTC helpers while notifications use Europe/London scheduling. | Decide and document whether Verum is UTC-based or local-day-based end to end. | 5 | Open |
| P4 | Validation is mostly type/build plus static review. | No unit/E2E coverage for save, undo, reminders preferences, or life marker editing. | Add small, focused tests around the highest-risk flows. | 6 | Open |

## Scores After This Iteration

| Metric | Score |
|---|---:|
| Product Health | 82 |
| Product Quality | 84 |
| UX | 86 |
| Design Craft | 82 |
| Growth / Retention | 78 |
| Strategic Product | 88 |
| Test Coverage | 45 |

## Remaining Highest-Impact Opportunities

1. Add focused tests for life marker editing, entry undo, and notification preference validation.
2. Simplify the Reminders tab with progressive disclosure for rescue, weekly, and backup reminders.
3. Resolve UTC versus local-day semantics across entries, streaks, anniversaries, and notifications.
4. Add a tiny quote curation workflow or document the API-only workflow more explicitly.
5. Consider a first-run empty state that teaches capture without becoming onboarding chrome.
