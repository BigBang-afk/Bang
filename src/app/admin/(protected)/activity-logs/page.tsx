import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { AdminPagination } from "@/components/admin/pagination";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog } from "@/types/database";

export const metadata: Metadata = { title: "Activity Logs" };

const PAGE_SIZE = 40;

export default async function ActivityLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? "1", 10) || 1;
  const db = createAdminClient();

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await db
    .from("activity_logs")
    .select("*, admin_profiles(full_name)")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const logs = (data ?? []) as unknown as (ActivityLog & { admin_profiles: { full_name: string } | null })[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Activity Logs</h1>
        <p className="text-sm text-charcoal/60">Audit trail of admin actions and key system events.</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState message="No activity recorded yet." />
      ) : (
        <Table>
          <Thead><Th>When</Th><Th>User</Th><Th>Action</Th><Th>Entity</Th><Th>Description</Th></Thead>
          <Tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(log.created_at)}</Td>
                <Td className="text-xs">{log.admin_profiles?.full_name ?? "System / Public"}</Td>
                <Td className="text-xs"><code className="rounded bg-ivory-dark px-1.5 py-0.5">{log.action}</code></Td>
                <Td className="text-xs">{log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}</Td>
                <Td className="max-w-[300px] text-xs text-charcoal/60"><p className="line-clamp-2">{log.description}</p></Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}

      <AdminPagination page={page} totalPages={totalPages} baseUrl="/admin/activity-logs" />
    </div>
  );
}
