import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client bound to the current request's cookies — used for reading
 * the logged-in admin's session (auth.getUser(), auth.signOut(), etc).
 * Still uses the anon key and is subject to RLS; it is NOT the privileged
 * client. For privileged reads/writes use lib/supabase/admin.ts instead.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can be called from a Server Component where cookies
            // are read-only; middleware.ts refreshes the session instead.
          }
        },
      },
    }
  );
}
