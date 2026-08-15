import { auth } from "@/auth";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartPanel } from "@/components/dashboard/chart-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { TechnicalAnalysis } from "@/components/tradingview/symbol-overview";
import { Wallet, TrendingUp, Activity, BrainCircuit } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <>
      <Topbar
        title={`Welcome back, ${user.name?.split(" ")[0] ?? "Trader"}`}
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning">
          Demo mode — portfolio figures below are simulated for preview purposes.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Paper portfolio value"
            value="$128,430.52"
            delta="+2.4% today"
            positive
            icon={Wallet}
          />
          <StatCard
            label="Unrealized P&L"
            value="+$4,210.11"
            delta="+3.4%"
            positive
            icon={TrendingUp}
          />
          <StatCard label="Open positions" value="7" icon={Activity} />
          <StatCard
            label="AI signal accuracy (30d)"
            value="82%"
            delta="Bullish bias"
            positive
            icon={BrainCircuit}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartPanel />
          </div>
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground-muted">
                Technical Analysis — BTC/USD
              </h3>
              <TechnicalAnalysis symbol="BITSTAMP:BTCUSD" className="h-[360px] w-full" />
            </div>
            <WatchlistPanel />
          </div>
        </div>
      </main>
    </>
  );
}
