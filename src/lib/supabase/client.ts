import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Supabase client for use in Client Components. Relies on the public,
 * row-level-security-protected anon key — never the service role key.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
