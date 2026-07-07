# Verum — Privacy & Security Principles (2026-07-07)

How to maximise privacy and security for a single-owner journal, stated as
principles first, then graded adherence, then a plan. The framing borrows
deliberately from Troy Hunt's body of work (Have I Been Pwned, Pwned
Passwords): **data is a liability, not an asset; every layer eventually
fails; spend where the breach would actually hurt.**

Assessed at `main` = `7c21afe`. Companion documents:
`security-assessment-2026-07-02.md` (findings, all remediated),
`tech-debt-scorecard-2026-07-03.md` (Security dimension 4.0).

---

## Part 1 — The principles

**P1. The only data that can't leak is data you never held.**
HIBP exists because organisations hoarded what they didn't need. Apply the
inverse: no analytics, no telemetry, no incidental identifiers (IPs, user
agents) kept beyond their operational moment, no operational records kept
forever. Every column is a future breach line-item.

**P2. Assume breach; size the blast radius before it happens, not after.**
The cookie will be stolen, the provider will have an incident, a co-tenant
will have a bug. The question is never *if* a layer fails but *what the
failure buys the attacker*: segmentation, key scope, revocation paths, and
application-layer encryption on the crown jewels decide that.

**P3. A secret is only as strong as its entropy — and its handling.**
Length beats cleverness (Pwned Passwords' core lesson); a strong secret
mishandled (in a URL, a log, a timing side-channel) is a weak secret.
Constant-time comparison, derived credentials, durable guess-throttling, and
checking secrets against breach corpora (k-anonymity: prove membership
without revealing the secret) are all cheap.

**P4. Privacy has a physical layer.**
Encryption in transit is table stakes; the lock screen, the shared laptop,
and the shoulder-surfer are not covered by TLS. Content that leaves the
encrypted channel and lands on glass — notification previews, plaintext
device storage, long-lived sessions on abandoned devices — is part of the
threat model of a *diary* specifically.

**P5. Encrypt in transit always; encrypt at rest where the data would hurt most.**
Provider-side disk encryption protects against stolen hardware, not stolen
credentials. For the data whose leak is unrecoverable (the journal, its
backups), the ceiling is encryption where the *application* holds the only
key — pay toward that ceiling exactly as far as it doesn't destroy the
product.

**P6. Every third party is a data-sharing decision.**
Each CDN, font host, analytics snippet, or error tracker is another
organisation that now sees your reader. For a personal journal the correct
number of third parties is as close to zero as the platform allows, and the
CSP should *enforce* that, not merely describe it.

**P7. Sunlight is the control of last resort.**
You cannot respond to what you cannot see (know when the system fails, keep a
data map of what lives where), and you must not let the seeing become the
leak (log events, not content; identifiers hashed). Troy's disclosure ethos,
scaled to a repo of one: the docs tell the truth about every trade-off.

---

## Part 2 — How the codebase adheres

| # | Principle | Grade | Evidence |
|---|-----------|:-:|----------|
| P1 | Hold less | **B+** | Genuinely zero analytics/telemetry/third-party calls — verified by grep and by `connect-src 'self'`. Journal text never lands in the deliveries table (meta = timezones, dates, counts only). Login-throttle rows self-prune after a day. **Debits:** raw IPs written to logs on auth events; full `user_agent` stored per push subscription; `verum_notification_deliveries` grows forever. |
| P2 | Assume breach | **C** | RLS locked, sessions expire, one rotation kills all sessions, backups exist. **But:** the journal shares a Supabase project with another app, so one project-wide service-role key — and any co-tenant vulnerability (the advisors flag anon-executable `SECURITY DEFINER` functions and always-true `meal_state` policies *on the same database*) — reaches the diary. No individual session revocation. Journal and backups are plaintext at rest beyond provider disk encryption. |
| P3 | Secrets | **A−** | Constant-time compares throughout; HMAC-derived expiring `__Host-` sessions (raw token never stored client-side); durable Postgres login throttle that survives cold starts; cron secret header-only. **Debit:** nothing enforces that `JOURNAL_ACCESS_TOKEN` is actually strong — the whole design reduces to one string nobody ever measures. |
| P4 | Physical layer | **C−** | The weakest area, and it's by design working *against* privacy: the daily reminder and weekly reflection quote the journal verbatim onto the lock screen ("Yesterday: …"). Offline queue is plaintext `localStorage` (documented, but documented ≠ mitigated). 30-day sessions persist on every device that ever logged in, with no way to end one remotely. |
| P5 | Encryption | **B−** | TLS + 2-year HSTS; Web Push payloads are end-to-end encrypted (RFC 8291) — Google/Apple/Mozilla relay ciphertext and cannot read reminder text, which is a better story than most apps can tell. At rest: provider-level only; the monthly backup is plaintext JSON in the bucket. |
| P6 | Third parties | **A** | The standout. `default-src 'self'`, no fonts/CDNs/trackers, self-hosted everything; the complete processor list is Vercel, Supabase, and push transports that see only ciphertext. Sole blemish: `script-src 'unsafe-inline'`. |
| P7 | Sunlight | **B+** | The system pages its owner on cron failure; delivery history is user-visible; README documents every trade-off honestly (including the plaintext queue) and carries an ops runbook. **Debit:** the one leak-shaped logging habit — raw IPs in `console.warn`. |

**Reading:** the *network* story is excellent — an eavesdropper, a third
party, or a push relay learns nothing. The two soft flanks are exactly the
Troy-shaped ones: **blast radius** (co-tenancy, plaintext at rest, no
per-session kill switch) and the **physical layer** (the diary quotes itself
onto lock screens).

---

## Part 3 — The plan

Ordered by risk-per-effort. Items 2–5 and 7 are a day or two combined.

1. **Give the journal its own Supabase project** — *P2, effort M, do first.*
   The single biggest blast-radius cut: today a bug in the co-tenant app is a
   bug adjacent to the diary, sharing one database and one god-key. Migrate
   the `verum_*` tables + bucket to a dedicated project (the migrations
   directory makes this nearly mechanical), rotate keys, and the co-tenant's
   advisor findings stop being Verum's problem.
2. **Encrypt backups before they touch the bucket** — *P2/P5, S–M.*
   Sealed-box (age/libsodium-style) encryption in `lib/backup.ts`: encrypt
   with a public key from env; the private key lives offline with the owner
   only. A bucket or service-key compromise then yields ciphertext. This is
   "assume breach" made concrete for the one artifact designed to outlive
   everything.
3. **Private lock-screen mode, on by default** — *P4, S.*
   A `discreet_notifications` preference: reminders say "What happened
   today?" instead of quoting yesterday's entry; own-voice excerpts become
   the opt-in. The E2E push channel is wasted if the plaintext ends up on
   glass in a meeting room.
4. **Measure the one secret everything reduces to** — *P3, S.*
   A `scripts/check-secret.mjs` (run in CI against a dummy, run manually
   against the real value): enforce ≥128 bits entropy and check Pwned
   Passwords via the k-anonymity range API — five SHA-1 hex chars leave the
   machine, the secret never does. Purest Troy in the whole plan.
5. **Retention + log hygiene** — *P1/P7, S.*
   Hash IPs before logging (HMAC-truncate, enough to correlate a brute force,
   useless to identify); stop storing full `user_agent` (truncate to browser
   family or drop); prune `verum_notification_deliveries` older than ~90 days
   inside the existing cron.
6. **Per-session revocation** — *P2, S.*
   Add an issued-at claim plus a stored not-before watermark ("kill every
   session older than X" without rotating secrets); optionally a session-id
   table for "log out everywhere except here".
7. **Delete `JOURNAL_PUBLIC_READ`** — *P1/P2, XS.*
   If it isn't actively used, one env-var typo away from a world-readable
   diary is a footgun with no offsetting benefit. Remove the code path.
8. **Nonce-based CSP** — *P6, M.* Close `'unsafe-inline'` for scripts via
   middleware nonces; the last gap between the CSP as written and P6 as
   stated.
9. **Flush device state on logout** — *P4, XS–S.* Clear the offline queue
   and shell cache when the session ends; a logout on a shared machine
   should leave nothing to find.

**The ceiling, named honestly:** true end-to-end encryption — entries
encrypted on-device, server never sees plaintext. It is achievable and it
would cost exactly the features that make Verum good: server-side search,
anniversaries, reflections in your own voice, the streak. Security is a
spectrum, not a binary (Troy again); with items 1–5 done, the remaining gap
to the ceiling protects against one adversary — a subpoena-or-root-level
compromise of Supabase itself — at the price of most of the product. Decline
it deliberately, in writing, here.
