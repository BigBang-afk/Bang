import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DailyClosingDatePicker({ businessDate }: { businessDate: string }) {
  return (
    <form method="GET" className="flex items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Business Date</label>
        <Input type="date" name="businessDate" defaultValue={businessDate} />
      </div>
      <Button type="submit" variant="secondary">
        View
      </Button>
    </form>
  );
}
