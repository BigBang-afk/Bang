import { auth } from "@/auth";
import { Topbar } from "@/components/dashboard/topbar";
import { SignalWorkbench } from "@/components/signals/signal-workbench";
import { SignalHistory } from "@/components/signals/signal-history";
import { CONFIRMATION_RULES } from "@/lib/signals/strategies";

export default async function SignalsPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <>
      <Topbar
        title="AI Signals"
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning">
          Educational tool, not financial advice. Signals are generated from live market data using
          rule-based technical strategies — a confirmed signal requires at least{" "}
          {CONFIRMATION_RULES.minAgreeing} of 7 independent strategies to agree with{" "}
          {CONFIRMATION_RULES.minConfidence}%+ combined confidence. Backtested win rates are historical and
          don&apos;t guarantee future results.
        </div>

        <SignalWorkbench />
        <SignalHistory />
      </main>
    </>
  );
}
