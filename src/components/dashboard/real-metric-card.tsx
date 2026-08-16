import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function RealMetricCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Card className="transition-colors hover:border-gold-muted/50">
      <CardContent className="flex items-center justify-between py-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 truncate text-xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-soft">
          <Icon className="size-4 text-gold" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
