import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  suffix,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "gold" | "warn" | "danger";
  suffix?: string;
}) {
  const toneClasses = {
    default: "text-charcoal bg-charcoal/5",
    gold: "text-gold-dark bg-gold/10",
    warn: "text-amber-700 bg-amber-50",
    danger: "text-red-700 bg-red-50",
  } as const;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal/50">{label}</p>
          <p className="mt-2 font-serif text-2xl text-charcoal">
            {value}
            {suffix && <span className="ml-1 text-sm font-sans text-charcoal/50">{suffix}</span>}
          </p>
        </div>
        <div className={cn("rounded-full p-2.5", toneClasses[tone])}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </Card>
  );
}
