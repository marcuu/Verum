// Route-level tests for the invariants that used to live only in review
// notes: the auth gate, the CSRF origin check, public-read scoping, and
// entry input validation (TD-4 in the tech-debt register).
//
// next/headers and the Supabase client are mocked; the session cookie is a
// REAL HMAC value from lib/session, so the crypto verification path runs.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createSessionValue, sessionCookieName } from "@/lib/session";

const cookieJar = new Map<string, string>();
const headerBag = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name)
        ? { name, value: cookieJar.get(name)! }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) => headerBag.get(name.toLowerCase()) ?? null,
  }),
}));

// Minimal chainable Supabase stub: every builder method returns the chain,
// and awaiting it resolves to { data, error }. Upserts are recorded.
const upsertCalls: Array<Record<string, unknown>> = [];
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "order", "ilike", "eq", "limit"]) {
    c[m] = () => c;
  }
  c.upsert = (row: Record<string, unknown>) => {
    upsertCalls.push(row);
    return Promise.resolve({ error: null });
  };
  c.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return c;
}
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: () => chain({ data: [], error: null }),
  }),
}));

import { GET, POST } from "@/app/api/entries/route";

const SECRET = "test-secret-for-route-tests";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/entries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function login() {
  const session = await createSessionValue();
  cookieJar.set(sessionCookieName(), session!);
}

beforeEach(() => {
  cookieJar.clear();
  headerBag.clear();
  upsertCalls.length = 0;
  process.env.SESSION_SECRET = SECRET;
  process.env.JOURNAL_ACCESS_TOKEN = "test-token";
  delete process.env.JOURNAL_PUBLIC_READ;
});

describe("entries route auth gate", () => {
  it("rejects unauthenticated GET with 401", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/api/entries")
    );
    expect(res.status).toBe(401);
  });

  it("allows unauthenticated GET when JOURNAL_PUBLIC_READ=true", async () => {
    process.env.JOURNAL_PUBLIC_READ = "true";
    const res = await GET(
      new NextRequest("http://localhost:3000/api/entries")
    );
    expect(res.status).toBe(200);
  });

  it("keeps the full export private even with JOURNAL_PUBLIC_READ=true", async () => {
    process.env.JOURNAL_PUBLIC_READ = "true";
    const { GET: exportGet } = await import("@/app/api/entries/export/route");
    const res = await exportGet(
      new NextRequest("http://localhost:3000/api/entries/export")
    );
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated POST with 401", async () => {
    const res = await POST(postReq({ day: "2026-07-03", text: "hello" }));
    expect(res.status).toBe(401);
    expect(upsertCalls).toHaveLength(0);
  });

  it("rejects a tampered session cookie", async () => {
    await login();
    const value = cookieJar.get(sessionCookieName())!;
    cookieJar.set(sessionCookieName(), value.slice(0, -2) + "xx");
    const res = await POST(postReq({ day: "2026-07-03", text: "hello" }));
    expect(res.status).toBe(401);
  });

  it("rejects cross-origin POST with 403 even with a valid session", async () => {
    await login();
    headerBag.set("origin", "https://evil.example");
    headerBag.set("host", "localhost:3000");
    const res = await POST(postReq({ day: "2026-07-03", text: "hello" }));
    expect(res.status).toBe(403);
    expect(upsertCalls).toHaveLength(0);
  });

  it("accepts same-origin POST with a valid session", async () => {
    await login();
    headerBag.set("origin", "http://localhost:3000");
    headerBag.set("host", "localhost:3000");
    const res = await POST(postReq({ day: "2026-07-03", text: "hello" }));
    expect(res.status).toBe(200);
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toMatchObject({ day: "2026-07-03", text: "hello" });
  });
});

describe("entries route input validation", () => {
  beforeEach(login);

  it("400s on empty text", async () => {
    const res = await POST(postReq({ day: "2026-07-03", text: "   " }));
    expect(res.status).toBe(400);
  });

  it("400s on a malformed day instead of 500ing at the database", async () => {
    const res = await POST(postReq({ day: "banana", text: "hello" }));
    expect(res.status).toBe(400);
    expect(upsertCalls).toHaveLength(0);
  });

  it("400s on an impossible calendar day", async () => {
    const res = await POST(postReq({ day: "2026-02-31", text: "hello" }));
    expect(res.status).toBe(400);
  });

  it("400s on a far-future day", async () => {
    const res = await POST(postReq({ day: "2999-01-01", text: "hello" }));
    expect(res.status).toBe(400);
  });

  it("400s on oversized text", async () => {
    const res = await POST(
      postReq({ day: "2026-07-03", text: "x".repeat(64_001) })
    );
    expect(res.status).toBe(400);
  });

  it("defaults the day when omitted", async () => {
    const res = await POST(postReq({ text: "hello" }));
    expect(res.status).toBe(200);
    expect(upsertCalls[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
