import { auth } from "@/auth";
import { Topbar } from "@/components/dashboard/topbar";
import { MarketOverview } from "@/components/tradingview/market-overview";
import { CryptoHeatmap } from "@/components/tradingview/heatmap";
import { ChartPanel } from "@/components/dashboard/chart-panel";

export default async function MarketsPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <>
      <Topbar
        title="Markets"
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 space-y-6 p-6">
        <ChartPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground-muted">
              Market Overview
            </h3>
            <MarketOverview className="h-[420px] w-full" />
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground-muted">
              Crypto Heatmap
            </h3>
            <CryptoHeatmap className="h-[420px] w-full" />
          </div>
        </div>
      </main>
    </>
  );
}
