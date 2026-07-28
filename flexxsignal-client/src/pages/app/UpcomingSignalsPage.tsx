import { useQuery } from "@tanstack/react-query";
import { SignalsApi } from "../../api/endpoints";
import { SignalCard } from "../../components/signals/SignalCard";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { useSignalRealtimeInvalidation } from "../../hooks/useSignalRealtimeInvalidation";

export default function UpcomingSignalsPage() {
  useSignalRealtimeInvalidation();
  const { data, isLoading } = useQuery({ queryKey: ["live-signals"], queryFn: SignalsApi.live, refetchInterval: 5000 });
  const upcoming = (data ?? []).filter((s) => s.status === 1 || s.status === 2).sort((a, b) => a.entryTimeUtc.localeCompare(b.entryTimeUtc));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading">Upcoming Signals</h1>
        <p className="text-slate-400 text-sm mt-1">Signals scheduled to enter soon, sorted by entry time.</p>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : upcoming.length === 0 ? (
        <EmptyState title="Nothing scheduled" description="Check back shortly — new signals appear here as soon as they're published." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcoming.map((s) => <SignalCard key={s.id} signal={s} />)}
        </div>
      )}
    </div>
  );
}
