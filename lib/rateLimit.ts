// Minimal in-memory failure throttle for the login endpoint.
//
// Serverless caveat: state lives per warm instance, so a determined attacker
// spread across cold starts sees weaker limits than these numbers suggest.
// This still blunts naive brute force from a single source; pair it with a
// platform-level rule (e.g. Vercel WAF rate limiting on /api/login) for a
// hard guarantee.

type Bucket = { failures: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 10;

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
