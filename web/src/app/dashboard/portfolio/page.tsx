import { auth } from "@/auth";
import { Topbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Wallet, TrendingUp, PieChart } from "lucide-react";

const holdings = [
  { symbol: "BTC", name: "Bitcoin", qty: "1.24", price: "$67,240.10", value: "$83,377.72", change: "+3.2%", positive: true },
  { symbol: "ETH", name: "Ethereum", qty: "18.5", price: "$3,412.55", value: "$63,132.18", change: "+1.8%", positive: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", qty: "42", price: "$941.20", value: "$39,530.40", change: "-0.6%", positive: false },
  { symbol: "AAPL", name: "Apple Inc.", qty: "80", price: "$228.90", value: "$18,312.00", change: "+0.4%", positive: true },
  { symbol: "TSLA", name: "Tesla Inc.", qty: "35", price: "$246.10", value: "$8,613.50", change: "-1.2%", positive: false },
];

export default async function PortfolioPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <>
      <Topbar
        title="Portfolio"
        name={user.name ?? "Trader"}
        email={user.email ?? ""}
        role={user.role}
        avatarColor={user.avatarColor}
      />

      <main className="flex-1 space-y-6 p-6">
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning">
          Demo mode — holdings below are simulated for preview purposes.
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total portfolio value" value="$212,965.80" delta="+2.1% today" positive icon={Wallet} />
          <StatCard label="All-time return" value="+34.7%" delta="Since inception" positive icon={TrendingUp} />
          <StatCard label="Asset allocation" value="5 assets" icon={PieChart} />
        </div>

        <div className="glass-card overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-subtle bg-surface/50 text-xs text-foreground-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Quantity</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Value</th>
                <th className="px-5 py-3 font-medium">24h</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{h.symbol}</p>
                    <p className="text-xs text-foreground-muted">{h.name}</p>
                  </td>
                  <td className="px-5 py-4 text-foreground-muted">{h.qty}</td>
                  <td className="px-5 py-4 text-foreground-muted">{h.price}</td>
                  <td className="px-5 py-4 font-medium">{h.value}</td>
                  <td
                    className={`px-5 py-4 font-medium ${h.positive ? "text-brand-green" : "text-danger"}`}
                  >
                    {h.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
