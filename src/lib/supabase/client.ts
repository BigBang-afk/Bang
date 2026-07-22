import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — uses the public anon key only. Subject to Row Level
 * Security; can never see rows the RLS policies don't allow. Safe to import
 * in Client Components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
