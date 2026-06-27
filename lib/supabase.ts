import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service-role key.
// RLS is enabled with no policies on verum_* tables, so the service-role key
// (which bypasses RLS) is required. This key must NEVER be exposed to the browser.
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}
