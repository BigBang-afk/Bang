import { SITE_NAME } from "@/lib/constants";

/**
 * Shown instead of crashing when the database isn't reachable yet (e.g. the
 * app has been deployed but Supabase env vars are still placeholders). Once
 * NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY point at a real,
 * migrated Supabase project, this page disappears automatically — no code
 * change needed.
 */
export function SetupPending() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-4 text-center text-ivory">
      <p className="font-serif text-2xl tracking-wide">{SITE_NAME}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gold">Website Setup In Progress</p>
      <p className="mt-6 max-w-md text-sm text-ivory/70">
        This site is deployed but not yet connected to its database. Once the Supabase project is
        configured with real credentials, this page will automatically be replaced by the live site.
      </p>
      <p className="mt-6 max-w-md text-xs text-ivory/40">
        Admin: see <code className="rounded bg-white/10 px-1.5 py-0.5">README.md §6</code> in the
        repository for Supabase setup instructions.
      </p>
    </div>
  );
}
