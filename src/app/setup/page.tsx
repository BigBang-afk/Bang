import { redirect } from "next/navigation";
import { requireUserOnly } from "@/lib/require-auth";
import { SetupWizard } from "./setup-wizard";

export default async function SetupPage() {
  const user = await requireUserOnly();
  if (user.tradingAccounts.length > 0 && user.settings?.setupCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-accent text-lg font-bold text-black">
            B
          </div>
          <h1 className="text-xl font-semibold">Let&apos;s set up your trading command center</h1>
          <p className="text-sm text-muted">This only takes a minute. You can change everything later in Settings.</p>
        </div>
        <SetupWizard defaultTraderName={user.traderName} />
      </div>
    </div>
  );
}
