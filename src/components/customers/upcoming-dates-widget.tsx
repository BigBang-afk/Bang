import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpcomingDateEntry } from "@/services/customer-analytics.service";

export function UpcomingDatesWidget({
  icon: Icon,
  title,
  entries,
  emptyMessage,
}: {
  icon: LucideIcon;
  title: string;
  entries: UpcomingDateEntry[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className="size-4 text-gold" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          entries.slice(0, 8).map((entry) => (
            <Link
              key={entry.id}
              href={`/customers/${entry.id}`}
              className="flex items-center justify-between p-3 text-sm hover:bg-surface-hover"
            >
              <div>
                <p className="font-medium text-foreground">{entry.name}</p>
                <p className="text-xs text-muted-foreground">{entry.phone}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {entry.daysAway === 0 ? "Today" : entry.daysAway === 1 ? "Tomorrow" : `In ${entry.daysAway} days`}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
