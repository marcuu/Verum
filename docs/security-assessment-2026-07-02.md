# Verum — Security & Threat Assessment (2026-07-02)

Scope: full codebase review of the Next.js app (`app/`, `lib/`, `middleware.ts`,
`public/sw.js`), configuration (`next.config.ts`, `vercel.json`, `.env.example`),
Supabase schema in `docs/*.sql`, dependency lockfile, and git history.

## Threat model

Verum is a single-user personal journal PWA deployed on Vercel with a Supabase
backend accessed exclusively through the **service-role key** (RLS enabled, no
policies). Authentication is a **single shared token** (`JOURNAL_ACCESS_TOKEN`)
stored verbatim in an httpOnly cookie.

**Assets worth protecting**

1. Journal entries — highly sensitive personal data; full export at
   `/api/entries/export`.
2. `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; full DB read/write.
3. `JOURNAL_ACCESS_TOKEN` — the entire auth boundary.
4. `WEB_PUSH_PRIVATE_KEY`, `CRON_SECRET` — push spoofing / job triggering.

**Relevant adversaries**

- Opportunistic internet attackers brute-forcing the login endpoint.
- Anyone who obtains the auth cookie (device theft, backup leak, log leak).
- Malicious web pages attempting cross-site requests against the API.
- Log/infrastructure observers (secrets in URLs).

## What's already good

- Every API route handler is guarded (`requireAuth()` or `assertCron()` —
  verified across all 15 routes), and page routes are covered by `middleware.ts`.
- Supabase posture is correct: RLS on with no policies, service-role key used
  server-side only, never imported into client components. No anon-key path
  exists in code.
- Cookie flags: `httpOnly`, `secure` (prod), `sameSite: "lax"`.
- Security headers present: CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `frame-ancestors 'none'`.
- No `dangerouslySetInnerHTML`, `eval`, or dynamic HTML sinks anywhere; React
  escaping covers rendered entry/quote text.
- No secrets in git history (only `.env.example`, which holds placeholders).
- Input validation exists where writes accept structured data (life markers hex
  color/length, notification preferences allowlist + range checks).
- Push delivery has dedupe and 404/410 subscription cleanup.

## Findings

### H1 — No rate limiting or brute-force protection on login (High)

`app/api/login/route.ts` accepts unlimited guesses at the single shared token.
There is no per-IP throttle, no lockout, no failure logging, and success yields
a 1-year credential. Vercel serverless gives an attacker high parallelism.

**Harden:** add rate limiting (Vercel WAF rule, or an Upstash/Supabase-backed
counter keyed by IP) with exponential backoff; log failures. Ensure the token
itself is long and random (≥ 32 bytes from a CSPRNG) — the whole design's
strength reduces to this string's entropy.

### H2 — Auth cookie stores the raw shared secret with no revocation (High)

`app/api/login/route.ts:14` sets `verum_token` to `JOURNAL_ACCESS_TOKEN`
itself, `maxAge` 1 year. Consequences:

- A leaked cookie **is** the master secret; the only remediation is rotating
  the env var and redeploying.
- Logout (`app/api/logout/route.ts`) only clears the caller's own cookie —
  a stolen copy stays valid for a year.
- The secret transits every request and sits in every device's cookie jar.

**Harden:** exchange the token at login for a derived session credential —
either an HMAC-signed value with an expiry (signed with a separate
`SESSION_SECRET`) or a random session id stored in a Supabase table (enables
server-side revocation and "log out everywhere"). Shorten lifetime (e.g. 30
days, sliding). Name the cookie `__Host-verum_token` to lock it to the host
over HTTPS with `Path=/`.

### M1 — Timing-unsafe secret comparisons (Medium)

`lib/auth.ts:18` (`token === expected`), `middleware.ts:32`, and the cron
guard in `app/api/cron/notifications/route.ts` compare secrets with `===`,
which short-circuits on the first differing byte. Practical exploitability
over a serverless network path is low, but the fix is one line.

**Harden:** compare via `crypto.timingSafeEqual` on equal-length buffers
(hash both sides first to normalize length).

### M2 — `CRON_SECRET` accepted in the query string (Medium)

`assertCron()` accepts `?secret=<CRON_SECRET>`. Query strings are recorded in
Vercel request logs, proxies, and anywhere the URL is copied — a durable leak
channel for a bearer secret. Vercel's scheduler already sends the
`Authorization: Bearer` header, so the fallback mostly serves external
schedulers.

**Harden:** remove the query-string path (or, if an external scheduler truly
needs it, use a distinct secret so leakage doesn't compromise the primary).
Compare with `timingSafeEqual` per M1.

### M3 — Open redirect via the login `next` parameter (Medium)

`app/login/page.tsx:10,31` does `router.replace(params.get("next") || "/")`
with no validation. A phishing link like
`https://<your-app>/login?next=https://evil.example/login` bounces a
just-authenticated user to an attacker page (e.g. a fake "token expired,
re-enter it" screen). Protocol-relative `//evil.example` also bypasses naive
checks.

**Harden:** accept `next` only when it starts with `/` and not `//` (and
contains no `\`); otherwise fall back to `/`.

### M4 — `JOURNAL_PUBLIC_READ=true` exposes the entire journal (Medium, latent)

`requireAuth()` waives auth for **all** GET routes when the flag is on —
including `/api/entries/export` (full journal dump), `/api/entries?q=`
(search), and notification preferences. One mis-set env var turns the app
world-readable, and nothing in the code distinguishes "safe to publish" reads.

**Harden:** if the feature isn't actively used, delete it. If it is, scope it
to an explicit allowlist of routes and exclude `export`, search, and
notification endpoints.

### M5 — CSP permits `script-src 'unsafe-inline'`; no HSTS header (Medium)

`next.config.ts` ships a solid CSP, but `'unsafe-inline'` for scripts means
any injected markup that survives React escaping could execute. There is also
no `Strict-Transport-Security` header (Vercel adds one on `*.vercel.app`, but
not automatically for every custom-domain setup).

**Harden:** move to nonce-based CSP (Next 15 supports nonces via middleware)
or at minimum add `Strict-Transport-Security: max-age=63072000;
includeSubDomains; preload`, `Permissions-Policy`, and keep the rest.

### M6 — CSRF relies solely on `SameSite=Lax` (Medium-low)

All mutating routes are cookie-authenticated with no CSRF token or origin
check. `SameSite=Lax` blocks the classic cross-site POST today, but it is a
single control, and any future GET-with-side-effects or embedded-webview
cookie behavior erodes it.

**Harden:** in `requireAuth()` for non-GET methods, reject requests whose
`Origin` (or `Sec-Fetch-Site`) is present and not same-origin. Two lines,
defense in depth.

### L1 — Unescaped LIKE wildcards in entry search (Low)

`app/api/entries/route.ts:20` interpolates `q` into
`.ilike("text", `%${q}%`)`. supabase-js parametrizes the value so there is no
SQL injection, but `%`/`_` in user input become wildcards — crafted patterns
force expensive full scans (availability), and searches for literal `%` are
wrong.

**Harden:** escape `%`, `_`, and `\` in `q` before building the pattern; cap
`q` length.

### L2 — Push subscribe accepts arbitrary endpoint URLs (Low)

`app/api/notifications/subscribe/route.ts` stores any `endpoint` string, and
cron/test jobs later make server-side HTTPS requests to it (an authenticated
SSRF primitive, plus unbounded table growth). Risk is contained because only
the authenticated owner can call it, but VAPID-signed requests to arbitrary
hosts are still an odd capability to leave open.

**Harden:** require `https:` URLs, optionally allowlist known push-service
hosts (`*.push.services.mozilla.com`, `fcm.googleapis.com`,
`*.push.apple.com`, `*.notify.windows.com`), and cap active subscriptions.

### L3 — Raw database error messages returned to clients (Low)

Nearly every route does `NextResponse.json({ error: error.message }, { status: 500 })`,
leaking Supabase/Postgres internals (table names, constraint names). Callers
are authenticated, so impact is small, but it aids anyone probing with a
stolen cookie — and when `JOURNAL_PUBLIC_READ` is on, it leaks anonymously.

**Harden:** log the real error server-side; return a generic message.

### L4 — Cron job availability nits (Low)

- `localParts()` throws on an invalid `timezone` string (the preferences PUT
  accepts any non-empty string), which turns every cron run into a 500 until
  fixed. Validate with `Intl.supportedValuesOf("timeZone")` on write.
- Service-worker `notificationclick` navigates to whatever URL is in the push
  payload; payloads are server-only today, but forcing same-origin in `sw.js`
  is a one-line belt-and-braces (`if (new URL(url, origin).origin !== origin) url = "/"`).

### L5 — Dependency hygiene (Low)

- `npm audit`: 2 moderate advisories — the bundled `postcss < 8.5.10`
  (XSS in stringify output) flagged via `next@15.5.18`. Build-time only for
  this app, but clear it by bumping Next within 15.x when a patched release
  lands (do **not** run `npm audit fix --force`; it downgrades Next to 9.x).
- `next@15.5.18` already includes the middleware-bypass fix (CVE-2025-29927).
  Keep Next, `@supabase/supabase-js`, and `web-push` on a regular patch
  cadence — the auth boundary lives partly in framework middleware.
- Consider enabling Dependabot/Renovate and GitHub secret scanning + push
  protection on the repo.

### L6 — No security observability (Low)

Failed logins, cron auth failures, and 401s are invisible. Add minimal
structured logging (IP, path, outcome) for auth failures so brute-force
attempts are detectable in Vercel logs, and consider an alert threshold.

## Prioritized hardening plan

| # | Action | Finding | Effort |
|---|--------|---------|--------|
| 1 | Rate-limit + log failures on `/api/login`; verify token entropy | H1 | S |
| 2 | Replace raw-secret cookie with signed/revocable session, `__Host-` prefix, shorter TTL | H2 | M |
| 3 | Validate the login `next` redirect param | M3 | XS |
| 4 | Drop `?secret=` from the cron guard; `timingSafeEqual` everywhere secrets are compared | M1, M2 | XS |
| 5 | Add Origin/Sec-Fetch-Site check for non-GET in `requireAuth()` | M6 | XS |
| 6 | Remove or allowlist-scope `JOURNAL_PUBLIC_READ` | M4 | S |
| 7 | Add HSTS + Permissions-Policy; plan nonce-based CSP | M5 | S |
| 8 | Escape LIKE wildcards; genericize 500 bodies; validate timezone + push endpoints | L1–L4 | S |
| 9 | Dependency update cadence + secret scanning + auth-failure logging | L5, L6 | S |

Overall: the codebase is in good shape for its size — consistent auth guards,
locked-down Supabase, sane headers, no injection sinks. The real risk
concentrates in the **shared-token auth design** (H1/H2): everything else is
defense-in-depth around that single credential.

## Remediation status (2026-07-02)

Implemented in this branch:

- **H1** — in-memory rate limiting (10 failures / 15 min per IP) + failure
  logging on `/api/login` (`lib/rateLimit.ts`). *Note: per-instance state on
  serverless; add a Vercel WAF rate rule on `/api/login` for a hard guarantee.*
- **H2** — login now issues an HMAC-signed, 30-day expiring session
  (`lib/session.ts`) instead of storing the raw token; `__Host-` cookie prefix
  in production; rotating `SESSION_SECRET` revokes all sessions. Existing
  logins are invalidated once — everyone re-enters the token.
- **M1** — all secret comparisons (login token, cron bearer) are constant-time.
- **M2** — `?secret=` query fallback removed from the cron route; header only.
- **M3** — login `next` param restricted to same-origin paths.
- **M4** — `JOURNAL_PUBLIC_READ` no longer applies to `/api/entries/export` or
  notification preferences (`requireAuth(…, { allowPublicRead: false })`).
- **M5** — added `Strict-Transport-Security` and `Permissions-Policy` headers.
  *Nonce-based CSP (dropping `'unsafe-inline'` for scripts) left as follow-up.*
- **M6** — non-GET API requests verify `Origin` / `Sec-Fetch-Site`.
- **L1** — entry search escapes LIKE wildcards and caps query length.
- **L2** — push subscribe validates `https:` endpoint URLs and key lengths.
- **L3** — all routes log DB errors server-side and return generic 500 bodies.
- **L4** — timezone validated as a real IANA zone on write; service worker
  pins notification-click navigation to the app origin.
- **L6** — failed login and cron auth attempts are logged.

Not done (needs platform/dependency action): Vercel WAF rate rule (H1),
nonce-based CSP (M5), Next.js bump to clear the transitive postcss advisory,
Dependabot/secret-scanning repo settings (L5).
