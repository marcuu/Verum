// Minimal in-memory failure throttle for the login endpoint.
//
// This is the FALLBACK layer: the durable counter lives in Postgres (see
// lib/loginThrottle.ts), which holds across cold starts and instances. This
// per-warm-instance map only decides when the database is unreachable.

type Bucket = { failures: number; resetAt: number };

// Shared with the durable layer so both enforce the same policy.
export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_MAX_FAILURES = 10;

const WINDOW_MS = LOGIN_WINDOW_SECONDS * 1000;
const MAX_FAILURES = LOGIN_MAX_FAILURES;

const buckets = new Map<string, Bucket>();

function bucketFor(key: string, now: number): Bucket {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) return existing;

  const fresh: Bucket = { failures: 0, resetAt: now + WINDOW_MS };
  buckets.set(key, fresh);

  // Opportunistic prune so the map cannot grow without bound.
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  return fresh;
}

export function isRateLimited(key: string, now = Date.now()): boolean {
  const b = buckets.get(key);
  return !!b && b.resetAt > now && b.failures >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()): void {
  bucketFor(key, now).failures += 1;
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
