import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

/**
 * Use in server components/pages that require a logged-in user with a
 * completed first-time setup. Redirects to /login or /setup otherwise.
 */
export async function requireAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const account = user.tradingAccounts[0];
  if (!account || !user.settings || !user.settings.setupCompleted) {
    redirect("/setup");
  }

  return { user, account, settings: user.settings! };
}

/** Use on /login, /register, /setup: only requires a logged-in user, no account needed. */
export async function requireUserOnly() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
