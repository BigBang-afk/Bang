import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { goldRateHistoryFilterSchema } from "@/lib/validation/gold-rate";
import { getGoldRateHistory, toBusinessDate } from "@/services/gold-rate.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoldRateHistoryTable } from "@/components/gold-rate/gold-rate-history-table";

export const metadata = {
  title: "Gold Rate History | Zarghoon Jewellers",
};

const DEFAULT_RANGE_DAYS = 30;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function GoldRateHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.GOLD_RATE_READ);

  const params = await searchParams;
  const parsed = goldRateHistoryFilterSchema.safeParse({
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
  });

  const today = toBusinessDate();
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - DEFAULT_RANGE_DAYS);

  const from = parsed.success && parsed.data.from ? toBusinessDate(new Date(parsed.data.from)) : defaultFrom;
  const to = parsed.success && parsed.data.to ? toBusinessDate(new Date(parsed.data.to)) : today;

  const days = await getGoldRateHistory({ from, to });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Gold Rate History
          </h1>
          <p className="text-sm text-muted-foreground">
            Every rate ever recorded — historical entries are never edited or deleted.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={toDateInputValue(from)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={toDateInputValue(to)} />
            </div>
            <Button type="submit">Apply Filter</Button>
            <Button variant="ghost" asChild>
              <Link href="/settings/gold-rates/history">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <GoldRateHistoryTable days={days} />
        </CardContent>
      </Card>
    </div>
  );
}
