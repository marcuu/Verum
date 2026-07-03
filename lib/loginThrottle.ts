import { getSupabaseAdmin } from "@/lib/supabase";
import {
  clearFailures,
  isRateLimited,
  recordFailure,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_SECONDS,
} from "@/lib/rateLimit";

// Durable login throttle (TD-6). Counters live in Postgres
// (verum_login_throttle + the atomic verum_login_failure function), so the
// limit holds across serverless cold starts and instances. The in-memory
// limiter in lib/rateLimit.ts is kept in lockstep as the fallback layer: if
// the database is unreachable, the warm-instance limit still applies.

const T_LOGIN_THROTTLE = "verum_login_throttle";

export async function isLoginThrottled(key: string): Promise<boolean> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from(T_LOGIN_THROTTLE)
      .select("failures, reset_at")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (data && new Date(data.reset_at).getTime() > Date.now()) {
      return data.failures >= LOGIN_MAX_FAILURES;
    }
    return false;
  } catch (err) {
    console.error("[verum] loginThrottle.check:", err);
    return isRateLimited(key);
  }
}

export async function recordLoginFailure(key: string): Promise<void> {
  recordFailure(key); // fallback layer stays in lockstep
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.rpc("verum_login_failure", {
      p_key: key,
      p_window_seconds: LOGIN_WINDOW_SECONDS,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[verum] loginThrottle.record:", err);
  }
}

export async function clearLoginFailures(key: string): Promise<void> {
  clearFailures(key);
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from(T_LOGIN_THROTTLE).delete().eq("key", key);
    if (error) throw error;
  } catch (err) {
    console.error("[verum] loginThrottle.clear:", err);
  }
}
