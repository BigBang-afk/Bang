import { useQuery } from "@tanstack/react-query";
import { SignalsApi } from "../../api/endpoints";
import { SignalCard } from "../../components/signals/SignalCard";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { useSignalRealtimeInvalidation } from "../../hooks/useSignalRealtimeInvalidation";

export default function LiveSignalsPage() {
  useSignalRealtimeInvalidation();
  const { data, isLoading } = useQuery({ queryKey: ["live-signals"], queryFn: SignalsApi.live, refetchInterval: 10000 });

  const active = data?.filter((s) => s.status === 3) ?? [];
  const upcoming = data?.filter((s) => s.status !== 3) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Live Signals</h1>
        <p className="text-slate-400 text-sm mt-1">Updates in real time via SignalR as signals are created, activated and resolved.</p>
      </div>

      {isLoading && <LoadingSkeleton rows={4} />}

      {!isLoading && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Active now</h2>
            {active.length === 0 ? (
              <EmptyState title="No active trades" description="Signals move here the moment their entry time arrives." />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((s) => <SignalCard key={s.id} signal={s} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Waiting for entry</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="No upcoming signals" description="The engine only publishes when confidence and no-trade filters genuinely allow it." />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((s) => <SignalCard key={s.id} signal={s} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
