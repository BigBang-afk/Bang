import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { FilterPanel, FilterField } from "../../components/ui/FilterPanel";
import type { AuditLogDto } from "../../types/domain";

const ACTIONS = ["Create", "Update", "Delete", "Login", "Logout", "Manual Result Correction", "Security Event", "Configuration Change"];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityName, setEntityName] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityName],
    queryFn: () => AdminApi.auditLogs({ page, pageSize: 30, entityName: entityName || undefined }),
  });

  const columns: Column<AuditLogDto>[] = [
    { header: "When", render: (a) => new Date(a.occurredAtUtc).toLocaleString() },
    { header: "Actor", render: (a) => a.actorDisplayName },
    { header: "Action", render: (a) => ACTIONS[a.action] ?? a.action },
    { header: "Entity", render: (a) => `${a.entityName}${a.entityId ? ` #${a.entityId.slice(0, 8)}` : ""}` },
    { header: "Reason", render: (a) => a.reason ?? "—" },
    { header: "IP", render: (a) => a.ipAddress },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Audit Logs</h1>
      <FilterPanel>
        <FilterField label="Entity name">
          <input className="input-field" placeholder="e.g. Signal, TradingPair" value={entityName} onChange={(e) => { setEntityName(e.target.value); setPage(1); }} />
        </FilterField>
      </FilterPanel>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} keyOf={(a) => a.id} />
          <div className="flex justify-between text-sm text-slate-400">
            <span>Page {data?.page} of {data?.totalPages}</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary" disabled={!data || page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
