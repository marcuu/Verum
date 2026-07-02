// Session cookie primitives. The login route exchanges the shared access
// token for an HMAC-signed, expiring session value, so the raw secret never
// lives in the cookie jar and rotating SESSION_SECRET (or the access token)
// invalidates every outstanding session.
//
// Web Crypto only — this module is imported by both Node route handlers and
// the edge middleware, so it must not touch node:crypto or next/headers.

const VERSION = "v1";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// __Host- prefix locks the cookie to this host, Secure, Path=/ (no Domain).
// Plain name in dev so http://localhost keeps working in every browser.
export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-verum_session"
    : "verum_session";
}

// SESSION_SECRET is preferred; falling back to JOURNAL_ACCESS_TOKEN keeps the
// app zero-config while still deriving (not storing) the cookie value.
function secretMaterial(): string | undefined {
  return process.env.SESSION_SECRET || process.env.JOURNAL_ACCESS_TOKEN;
}

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey | null> {
  const secret = secretMaterial();
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`verum-session:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function b64urlEncode(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array | null {
  try {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

// Cookie value: "v1.<expiry-epoch-seconds>.<base64url(HMAC(v1.<expiry>))>".
export async function createSessionValue(
  now = Date.now()
): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${VERSION}.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifySessionValue(
  value: string | undefined | null,
  now = Date.now()
): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return false;

  const exp = Number(parts[1]);
  if (!Number.isInteger(exp) || exp * 1000 < now) return false;

  const key = await hmacKey();
  const sig = b64urlDecode(parts[2]);
  if (!key || !sig) return false;

  // crypto.subtle.verify is constant-time over the signature bytes.
  return crypto.subtle.verify(
    "HMAC",
    key,
    sig as Uint8Array<ArrayBuffer>,
    encoder.encode(`${parts[0]}.${parts[1]}`)
  );
}

// Constant-time string comparison for shared secrets (login token, cron
// secret). Hashing both sides first normalizes length so nothing about the
// expected value leaks through timing.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}
