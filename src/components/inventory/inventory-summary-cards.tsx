import { Boxes, PackageCheck, Clock3, CheckCircle2, Wallet, TrendingUp, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { InventorySummary } from "@/services/inventory-item.service";

export function InventorySummaryCards({ summary }: { summary: InventorySummary }) {
  const cards = [
    { label: "Total Items", value: summary.totalItems.toLocaleString(), icon: Boxes },
    { label: "In Stock", value: summary.inStock.toLocaleString(), icon: PackageCheck },
    { label: "Reserved", value: summary.reserved.toLocaleString(), icon: Clock3 },
    { label: "Sold", value: summary.sold.toLocaleString(), icon: CheckCircle2 },
    { label: "Total Cost Value", value: formatCurrency(summary.totalCostValue), icon: Landmark },
    { label: "Total Selling Value", value: formatCurrency(summary.totalSellingValue), icon: Wallet },
    {
      label: "Expected Gross Profit",
      value: formatCurrency(summary.expectedGrossProfit),
      icon: TrendingUp,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p
                className={`mt-1.5 truncate text-lg font-semibold ${card.highlight ? "text-gold" : "text-foreground"}`}
              >
                {card.value}
              </p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-elevated">
              <card.icon className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
