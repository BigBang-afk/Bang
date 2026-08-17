import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FutureMetricCard({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-xl font-semibold text-muted-foreground/60">—</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Available in upcoming phase</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-surface-elevated">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
