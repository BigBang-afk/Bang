import { Users, UserPlus, UserCheck, Crown, UserX, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerDashboardSummary } from "@/services/customer-analytics.service";

export function CustomerSummaryCards({ summary }: { summary: CustomerDashboardSummary }) {
  const cards = [
    { label: "Total Customers", value: summary.totalCustomers.toLocaleString(), icon: Users },
    { label: "New This Month", value: summary.newThisMonth.toLocaleString(), icon: UserPlus },
    { label: "Active", value: summary.active.toLocaleString(), icon: UserCheck },
    { label: "VIP", value: summary.vip.toLocaleString(), icon: Crown, highlight: true },
    { label: "Inactive", value: summary.inactive.toLocaleString(), icon: UserX },
    { label: "With Outstanding Balance", value: summary.withOutstandingBalance.toLocaleString(), icon: Wallet },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
