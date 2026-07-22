import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged, service-role Supabase client. Bypasses Row Level Security.
 *
 * SECURITY: this file is guarded by the `server-only` package — importing it
 * from a Client Component fails the build. Never pass this client, or the
 * service role key, to the browser. Use only inside Server Actions, Route
 * Handlers, and Server Components that need admin-level catalog/content
 * access (all admin panel data fetching goes through this client since the
 * admin panel itself never talks to the browser-exposed anon key for
 * mutations).
 */
let cached: SupabaseClient | undefined;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
