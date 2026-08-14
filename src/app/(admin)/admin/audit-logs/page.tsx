import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminAuditLogsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="Sensitive actions — role changes, plan edits, admin access — are recorded here server-side and can't be altered from the app."
      />

      {!logs || logs.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No audit events yet"
          description="Actions like role changes will appear here as they happen."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor role</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entity_type}
                      {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {log.actor_role ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
