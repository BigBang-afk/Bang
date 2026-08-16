import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { GOLD_PURITIES, PURITY_LABELS } from "@/types/gold";
import type { GoldRateHistoryDay } from "@/services/gold-rate.service";

export function GoldRateHistoryTable({ days }: { days: GoldRateHistoryDay[] }) {
  if (days.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No gold rate history in this range.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {GOLD_PURITIES.map((purity) => (
            <TableHead key={purity}>{PURITY_LABELS[purity]}</TableHead>
          ))}
          <TableHead>Created By</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {days.map((day) => (
          <TableRow key={day.businessDate.toISOString()}>
            <TableCell className="font-medium">{formatDate(day.businessDate)}</TableCell>
            {GOLD_PURITIES.map((purity) => (
              <TableCell key={purity} className="text-muted-foreground">
                {day.rates[purity] ? formatCurrency(day.rates[purity]!) : "—"}
              </TableCell>
            ))}
            <TableCell>{day.updatedBy?.name ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">
              {day.updatedAt ? formatDateTime(day.updatedAt) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
