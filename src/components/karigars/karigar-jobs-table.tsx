import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatWeight, formatDateTime } from "@/lib/format";
import { PURITY_LABELS } from "@/types/gold";
import { ReceiveGoldDialog } from "@/components/karigars/receive-gold-dialog";
import type { KarigarGoldJobRow } from "@/services/karigar-job.service";

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  WITHIN_ALLOWANCE: "success",
  EXCESS_DIFFERENCE: "warning",
  SHORTAGE: "danger",
};

export function KarigarJobsTable({ rows }: { rows: KarigarGoldJobRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No gold jobs recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Given</TableHead>
          <TableHead>Purity</TableHead>
          <TableHead>Purpose / Reference</TableHead>
          <TableHead>Given Weight</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Difference</TableHead>
          <TableHead>Reconciliation</TableHead>
          <TableHead>Classification</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
            <TableCell>{PURITY_LABELS[row.purity]}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.purpose ?? "—"}
              {row.jobReference ? ` · ${row.jobReference}` : ""}
            </TableCell>
            <TableCell className="font-mono">{formatWeight(row.givenWeight)}</TableCell>
            <TableCell className="font-mono text-muted-foreground">
              {row.expectedWeight ? formatWeight(row.expectedWeight) : "—"}
            </TableCell>
            <TableCell className="font-mono">{row.receivedWeight ? formatWeight(row.receivedWeight) : "—"}</TableCell>
            <TableCell className="font-mono">
              {row.differenceWeight ? formatWeight(row.differenceWeight) : "—"}
            </TableCell>
            <TableCell>
              {row.reconciliationStatus ? (
                <Badge variant={STATUS_VARIANT[row.reconciliationStatus]}>
                  {row.reconciliationStatus.replace("_", " ")}
                </Badge>
              ) : (
                <Badge variant="neutral">Pending</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{row.classification ?? "—"}</TableCell>
            <TableCell className="text-right">
              {row.receivedWeight === null && (
                <ReceiveGoldDialog jobId={row.id} givenWeight={row.givenWeight} expectedWeight={row.expectedWeight} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
