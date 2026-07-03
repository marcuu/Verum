// Durable login throttle (TD-6): the decision comes from Postgres, and the
// in-memory limiter takes over only when the database is unreachable.

import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = { failures: number; reset_at: string } | null;
const dbState: { row: Row; fail: boolean; rpcCalls: number } = {
  row: null,
  fail: false,
  rpcCalls: 0,
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (dbState.fail) throw new Error("db down");
            return { data: dbState.row, error: null };
          },
        }),
      }),
      delete: () => ({
        eq: async () => {
          if (dbState.fail) throw new Error("db down");
          dbState.row = null;
          return { error: null };
        },
      }),
    }),
    rpc: async () => {
      if (dbState.fail) throw new Error("db down");
      dbState.rpcCalls++;
      return { data: 1, error: null };
    },
  }),
}));

import {
  clearLoginFailures,
  isLoginThrottled,
  recordLoginFailure,
} from "@/lib/loginThrottle";
import { LOGIN_MAX_FAILURES } from "@/lib/rateLimit";

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  dbState.row = null;
  dbState.fail = false;
  dbState.rpcCalls = 0;
});

describe("isLoginThrottled (durable layer)", () => {
  it("is open with no recorded failures", async () => {
    expect(await isLoginThrottled("ip:1")).toBe(false);
  });

  it("throttles at the failure ceiling inside the window", async () => {
    dbState.row = { failures: LOGIN_MAX_FAILURES, reset_at: future() };
    expect(await isLoginThrottled("ip:2")).toBe(true);
  });

  it("stays open below the ceiling", async () => {
    dbState.row = { failures: LOGIN_MAX_FAILURES - 1, reset_at: future() };
    expect(await isLoginThrottled("ip:3")).toBe(false);
  });

  it("ignores an expired window", async () => {
    dbState.row = { failures: LOGIN_MAX_FAILURES + 5, reset_at: past() };
    expect(await isLoginThrottled("ip:4")).toBe(false);
  });

  it("records failures through the atomic SQL function", async () => {
    await recordLoginFailure("ip:5");
    expect(dbState.rpcCalls).toBe(1);
  });
});

describe("database-down fallback", () => {
  it("falls back to the in-memory limiter when Postgres is unreachable", async () => {
    dbState.fail = true;
    const key = "ip:fallback";
    // Memory layer records even when the RPC throws.
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      await recordLoginFailure(key);
    }
    expect(await isLoginThrottled(key)).toBe(true);

    // Recovery: clearing wipes the memory layer too (DB delete still failing).
    await clearLoginFailures(key);
    expect(await isLoginThrottled(key)).toBe(false);
  });
});
