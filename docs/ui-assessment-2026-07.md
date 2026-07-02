# Verum UI Assessment — July 2026

A design review of the current product, followed by five enhancements aimed at
making Verum a market-leading, beautiful journal.

---

## Where the UI stands today

### What's working — and worth protecting

Verum already has something most products never achieve: **a coherent design
philosophy**. The comment at the top of `globals.css` says it plainly — *"one
spine, three zones, hierarchy carried by space and type weight, not boxes and
borders"* — and the implementation genuinely honours it:

- **A real point of view.** Serif for the record, sans for controls; one
  radius; one accent (violet) reserved as the *reward* colour. Underline-only
  inputs. Almost no cards or borders. This restraint is rare and is the
  product's aesthetic core.
- **Earned ceremony.** The daily quote arrives only after the day is logged,
  with a quiet rise-and-settle animation (`quoteBox--earned`). The greeting
  gives a line back before asking for one. The yesterday catch-up is an offer,
  not a nag. These are genuinely distinctive product moments.
- **Modern chrome.** The liquid-glass bottom nav with the sliding spring
  bubble is contemporary and well-executed, including dark-mode and
  reduced-motion variants.
- **Fundamentals are respected.** WCAG-checked contrast values (documented in
  the CSS variables), `prefers-color-scheme`, `prefers-reduced-motion`,
  `hover: none` handling, 44px touch targets, aria labels/roles/menus, safe-area
  insets, offline-first PWA. The print stylesheet for the year-in-review
  ("the volume") is a lovely artifact.

### Where it falls short of "market-leading, beautiful"

1. **The typography is a promise the platform can't keep.** The record's
   identity rests on `"Iowan Old Style", Palatino, "Book Antiqua", Georgia,
   serif` — a stack that only exists on Apple devices. On Android and Windows
   (most of the world), the journal falls back to Georgia or the default
   serif, and the entire "a journal, not a SaaS" feeling degrades. There is
   also no fluid type scale; sizes are fixed rem values with a single 640px
   breakpoint.

2. **The Journal zone reads like a database, not a book.** Entries are a flat
   list keyed by raw ISO dates (`2026-07-02`), with no grouping by month or
   year, no humanised dates, and no highlighting of search matches. The empty
   state is one grey line. Meanwhile the `/year/[age]` page already proves the
   product knows how to be book-like — that quality never made it back to the
   everyday reading surface.

3. **The Life calendar is the most emotionally powerful screen and the least
   expressive.** Every logged week is an identical violet dot; a week with one
   line and a week with thirty days of rich entries look the same. Detail
   lives in `title` tooltips, which don't exist on touch. Cells shrink to
   ~5px on phones. There's no moment of drama when the grid first renders —
   for a memento-mori visual, the reveal *is* the product.

4. **Navigation between zones is a hard cut.** Sections toggle via the
   `hidden` attribute. The nav bubble glides beautifully, but the content it
   points at teleports. There is no shared motion language (durations and
   easings are ad-hoc per rule), no entrance choreography for lists, and the
   flash toast is a plain dark bar that ignores the glass language of the nav.

5. **The surface is clinical rather than warm.** Pure `#fff` / `#0c0c0c`
   grayscale reads as "developer tool", not "paper and ink". The login page —
   the first thing a new device ever shows — is a bare input on a blank page,
   with none of the ceremony the rest of the product has taught the user to
   expect.

---

## Five enhancements

Ordered by leverage: each builds on the one before it.

### 1 · Own the typography — a self-hosted editorial serif and a fluid type scale

**Why it's first:** every other beauty investment is rendered *in* this type.
Right now the product's signature look is exclusive to Apple hardware.

- Self-host a distinctive text serif via `next/font/local` (zero-CLS,
  same-origin, keeps the PWA offline-capable) — e.g. **Newsreader**,
  **Source Serif 4**, or **Fraunces** for display moments. Map it into
  `--font-serif` so every existing rule inherits it; keep the system sans for
  controls.
- Add a fluid scale with `clamp()` for the six or so sizes in use (capture
  input, moments, quote, record text, metadata), replacing the fixed
  rem + single-breakpoint pattern.
- Typographic finish: `font-feature-settings` for oldstyle figures in running
  text (tabular already used for dates — correct), true quotation marks with
  hanging punctuation on the daily quote, `text-wrap: pretty` on entry
  paragraphs.

**Touches:** `app/globals.css`, `app/layout.tsx` (font loading), no component
changes.

### 2 · Make the Journal read like a book

**Why:** the record is the product's soul, and it currently renders as rows.
The year-in-review page already has the right instincts — bring them to the
daily surface.

- **Humanise and group dates.** Render `2 July` instead of `2026-07-02`, and
  group entries under quiet month-year overlines (`July 2026`) using the
  existing `.overline` style. Sticky the current group label during scroll.
- **Search that shows its work.** Highlight matching terms in results (a
  `<mark>` styled as a soft violet wash — the accent finally earning a second,
  related job), and show a result count.
- **A designed empty state.** A first-run Journal should say what will grow
  here, in the serif voice, not `"No entries yet."` in grey.
- **Entry rhythm.** Slightly more generous vertical padding between days, a
  hairline only between month groups — the page starts to paginate like a
  book rather than stripe like a table.

**Touches:** `app/page.tsx` (grouping), `components/EntryRow.tsx`,
`globals.css`.

### 3 · Elevate the Life calendar into the signature visual

**Why:** this is the screen people screenshot and share — the marketing
asset that lives inside the product. It deserves depth.

- **Density, not presence.** Shade logged weeks by how much was written —
  2–3 steps of violet intensity (entries-per-week is already computable from
  the data passed in). A rich month becomes visibly rich; the grid becomes a
  fingerprint of a life rather than a scatter of identical dots.
- **A reveal worth waiting for.** On first mount, animate the past weeks
  filling in — a fast wave sweeping down the decades (CSS
  `animation-delay` per row; fully disabled under `prefers-reduced-motion`).
  It should feel like watching the life so far get counted.
- **Touch-first detail.** Replace `title` tooltips with a tap-to-peek
  popover: week dates, marker label, and a one-line excerpt of the entry if
  the week has one. The existing marker editor can dock into this popover so
  editing happens in place.
- **Decade rhythm.** A slightly stronger rule and label every 10 rows (the
  bold labels exist; give them a hairline), so the grid scans in chapters.

**Touches:** `components/LifeCalendar.tsx`, `globals.css`.

### 4 · A coherent motion system — and soft transitions between zones

**Why:** the nav bubble promised physicality; the content should keep that
promise. Motion is what separates "clean" from "premium".

- **Tokens first.** Define `--ease-spring`, `--ease-out`, `--dur-fast/med/slow`
  in `:root` and refactor the existing ad-hoc cubic-beziers onto them, so all
  motion shares one personality.
- **Zone transitions.** Use the View Transitions API (with the `hidden`-toggle
  as the no-op fallback) for a ~250ms cross-fade + 8px vertical drift when
  switching tabs, direction-aware to match the bubble's slide.
- **Choreographed entrances.** Stagger the journal rows and life-calendar
  rows by ~20ms on first paint; let the "moment added" append with the same
  rise-and-settle the quote already uses — one gesture, reused.
- **A toast that belongs.** Restyle `.flash` in the bottom-nav's glass
  language (blur, hairline border, spring-in from the nav) instead of the
  current opaque bar.
- Everything gated behind `prefers-reduced-motion`, as the codebase already
  does.

**Touches:** `globals.css`, `app/page.tsx` (tab switch), no new dependencies.

### 5 · Warm the surface — paper-and-ink palette, and a cover-page login

**Why:** the final percent. Grayscale-on-white is neutral; a journal should
feel like material.

- **Paper, not white.** Shift the light background to a warm off-white
  (`#faf9f6`-family), inks to warm near-blacks, hairlines to warm greys.
  Dark mode becomes a warm charcoal rather than neutral `#0c0c0c` — ink by
  candlelight, not terminal black. Re-verify the documented contrast ratios
  and update `themeColor` in `app/layout.tsx` to match.
- **The accent stays sacred.** Violet remains the only chromatic voice —
  the warm neutrals make it glow more, not less.
- **Login as the cover of the book.** Centre the moon-phase mark, set
  "Verum" in the display serif, one italic line beneath it, the same
  underline input. Thirty minutes of work; it's the first screen every new
  device sees and the current version spends none of the product's charm on
  it.
- **Unified focus style.** One `:focus-visible` ring token across inputs,
  cells, menu items — accessibility polish that also reads as intentional
  craft.

**Touches:** `globals.css` (palette variables), `app/layout.tsx`,
`app/login/page.tsx`.

---

## Sequencing note

1 → 5 is roughly two focused days of work with no new runtime dependencies
(the font files are the only new assets). Typography (1) and palette (5) are
pure CSS-variable changes and can ship first as a single "materials" PR;
the Journal (2) and Life calendar (3) are the visible feature beats; motion
(4) threads through both and lands best last, once the surfaces it animates
are final.
