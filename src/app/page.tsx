import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const hasAccount = user.tradingAccounts.length > 0 && user.settings?.setupCompleted;
  redirect(hasAccount ? "/dashboard" : "/setup");
}
