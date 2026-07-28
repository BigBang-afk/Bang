import { useQuery } from "@tanstack/react-query";
import { AdminApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";
import { LoadingSkeleton } from "../../components/ui/States";

const PROVIDER_STATUS = ["Disconnected", "Connecting", "Connected", "Reconnecting", "Faulted"];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: AdminApi.dashboard, refetchInterval: 30000 });

  if (isLoading) return <LoadingSkeleton rows={2} />;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="page-heading">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users" value={data.totalUsers} />
        <StatCard label="Active subscriptions" value={data.activeSubscriptions} tone="up" />
        <StatCard label="Signals today" value={data.signalsToday} />
        <StatCard label="Today's win rate" value={`${data.todayWinRate.toFixed(1)}%`} tone="gold" />
        <StatCard label="Pending payments" value={data.pendingPayments} tone={data.pendingPayments > 0 ? "down" : "neutral"} />
        <StatCard label="Open support tickets" value={data.openSupportTickets} />
        <StatCard label="Active strategies" value={data.activeStrategies} />
        <StatCard label="Data provider" value={PROVIDER_STATUS[data.dataProviderStatus] ?? "Unknown"} tone={data.dataProviderStatus === 2 ? "up" : "down"} />
      </div>
    </div>
  );
}
