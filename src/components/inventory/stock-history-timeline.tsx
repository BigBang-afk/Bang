import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { StockMovementRow } from "@/services/stock-movement.service";
import type { StockMovementType } from "@/generated/prisma/client";

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  STOCK_CREATED: "Stock created",
  STOCK_UPDATED: "Stock updated",
  STOCK_RESERVED: "Marked as reserved",
  STOCK_SOLD: "Marked as sold",
  STOCK_RETURNED: "Marked as returned",
  STOCK_ADJUSTED: "Status adjusted",
  STOCK_DAMAGED: "Marked as damaged",
  STOCK_LOST: "Marked as lost",
  STOCK_ARCHIVED: "Archived",
};

type FieldChange = { before: string; after: string };

function isChangeMetadata(value: unknown): value is { changes: Record<string, FieldChange> } {
  return typeof value === "object" && value !== null && "changes" in value;
}

export function StockHistoryTimeline({ movements }: { movements: StockMovementRow[] }) {
  return (
    <Card id="history">
      <CardHeader>
        <CardTitle>Stock History</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
        ) : (
          <ol className="space-y-5">
            {movements.map((movement) => (
              <li key={movement.id} className="relative border-l border-border pl-4">
                <div className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-gold" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {MOVEMENT_LABELS[movement.movementType]}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {movement.user ? movement.user.name : "System"}
                  {movement.previousStatus && movement.newStatus && movement.previousStatus !== movement.newStatus
                    ? ` · ${movement.previousStatus} → ${movement.newStatus}`
                    : null}
                </p>
                {movement.notes && <p className="mt-1 text-sm text-foreground/90">{movement.notes}</p>}
                {isChangeMetadata(movement.metadata) && (
                  <div className="mt-2 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-elevated text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">Field</th>
                          <th className="px-2 py-1 text-left font-medium">Before</th>
                          <th className="px-2 py-1 text-left font-medium">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(movement.metadata.changes).map(([field, change]) => (
                          <tr key={field}>
                            <td className="px-2 py-1 text-muted-foreground">{field}</td>
                            <td className="px-2 py-1 text-danger">{change.before || "—"}</td>
                            <td className="px-2 py-1 text-success">{change.after || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
