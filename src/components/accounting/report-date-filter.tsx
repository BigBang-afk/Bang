import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_DATE_PRESETS } from "@/lib/report-date-range";

const PRESET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_7_days: "Last 7 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  custom: "Custom Range",
};

/**
 * Shared server-side date-preset filter for every Phase 6 report — a plain
 * GET form (same pattern as every other filter in this app), so filtering
 * always re-renders on the server, never client-side. Extra filter fields
 * can be passed as children and will submit alongside preset/from/to.
 */
export function ReportDateFilter({
  values,
  basePath,
  children,
}: {
  values: Record<string, string | undefined>;
  basePath: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Period</Label>
            <Select name="preset" defaultValue={values.preset ?? "this_month"}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_DATE_PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRESET_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From (custom)</Label>
            <Input type="date" name="from" defaultValue={values.from} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To (custom)</Label>
            <Input type="date" name="to" defaultValue={values.to} />
          </div>
          {children}
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            <Button variant="ghost" asChild>
              <a href={basePath}>Reset</a>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
