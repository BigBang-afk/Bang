import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getSegmentCounts,
  listCustomersInSegment,
  SEGMENTS,
  SEGMENT_LABELS,
  type Segment,
} from "@/services/customer-analytics.service";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentCustomerTable } from "@/components/customers/segment-customer-table";

export const metadata = { title: "Customer Segments | Zarghoon Jewellers" };

export default async function CustomerSegmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_SEGMENTS);

  const rawParams = await searchParams;
  const requested = typeof rawParams.segment === "string" ? rawParams.segment : undefined;
  const activeSegment: Segment = SEGMENTS.includes(requested as Segment) ? (requested as Segment) : "VIP";

  const [counts, rows] = await Promise.all([getSegmentCounts(), listCustomersInSegment(activeSegment)]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Customer Segments</h1>
        <p className="text-sm text-muted-foreground">
          Rule-based segments, computed live — a customer can belong to more than one at once.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {SEGMENTS.map((segment) => (
          <Link
            key={segment}
            href={`/customers/segments?segment=${segment}`}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              segment === activeSegment
                ? "border-gold-muted/40 bg-gold-soft"
                : "border-border bg-surface hover:bg-surface-hover",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {SEGMENT_LABELS[segment]}
            </p>
            <p className={cn("mt-1.5 text-lg font-semibold", segment === activeSegment ? "text-gold" : "text-foreground")}>
              {counts[segment]}
            </p>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{SEGMENT_LABELS[activeSegment]}</p>
          </div>
          <SegmentCustomerTable rows={rows} emptyMessage="No customers in this segment yet." />
        </CardContent>
      </Card>
    </div>
  );
}
