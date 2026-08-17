"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acknowledgeAlertAction, resolveAlertAction, dismissAlertAction } from "@/lib/actions/alerts.actions";
import { formatDateTime } from "@/lib/format";

type AlertRow = {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  createdAt: Date;
  resolvedBy: { id: string; name: string } | null;
};

const SEVERITY_VARIANT = { INFO: "neutral", WARNING: "warning", HIGH: "danger", CRITICAL: "danger" } as const;

function AlertActions({ alertId, status }: { alertId: string; status: AlertRow["status"] }) {
  const [pending, startTransition] = useTransition();

  function run(action: (input: unknown) => Promise<{ ok: boolean; error?: string }>, label: string) {
    startTransition(async () => {
      const result = await action({ alertId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Alert ${label}.`);
    });
  }

  if (status === "RESOLVED" || status === "DISMISSED") return null;

  return (
    <div className="flex gap-2">
      {status === "OPEN" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(acknowledgeAlertAction, "acknowledged")}>
          Acknowledge
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(resolveAlertAction, "resolved")}>
        Resolve
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(dismissAlertAction, "dismissed")}>
        Dismiss
      </Button>
    </div>
  );
}

export function AlertsList({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No alerts match this filter.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SEVERITY_VARIANT[alert.severity]}>{alert.severity}</Badge>
                <Badge variant="neutral">{alert.status}</Badge>
                <span className="text-xs text-muted-foreground">{alert.type}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDateTime(alert.createdAt)}
                {alert.resolvedBy ? ` · Actioned by ${alert.resolvedBy.name}` : ""}
              </p>
            </div>
            <AlertActions alertId={alert.id} status={alert.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
