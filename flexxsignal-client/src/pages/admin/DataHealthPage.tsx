import { useQuery } from "@tanstack/react-query";
import { MarketDataApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import type { DataHealthDto } from "../../types/domain";

const STATUS = ["Disconnected", "Connecting", "Connected", "Reconnecting", "Faulted"];
const QUALITY = ["Good", "Delayed", "Incomplete", "Invalid", "Stale"];

export default function DataHealthPage() {
  const { data, isLoading } = useQuery({ queryKey: ["data-health"], queryFn: () => MarketDataApi.health(100), refetchInterval: 15000 });

  const columns: Column<DataHealthDto>[] = [
    { header: "Provider", render: (h) => h.providerName },
    { header: "Status", render: (h) => <span className={h.connectionStatus === 2 ? "badge-up" : "badge-down"}>{STATUS[h.connectionStatus]}</span> },
    { header: "Data quality", render: (h) => <span className={h.dataQuality === 0 ? "badge-up" : "badge-neutral"}>{QUALITY[h.dataQuality]}</span> },
    { header: "Latency (ms)", render: (h) => h.latencyMs },
    { header: "Message", render: (h) => h.message ?? "—" },
    { header: "Recorded", render: (h) => new Date(h.recordedAtUtc).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Data Health Monitoring</h1>
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No health records yet" />
      ) : (
        <DataTable columns={columns} rows={data} keyOf={(h) => h.recordedAtUtc + h.providerName} />
      )}
    </div>
  );
}
