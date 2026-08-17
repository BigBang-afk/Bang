import { Card, CardContent } from "@/components/ui/card";

export function KarigarSummaryCards({
  summary,
}: {
  summary: { total: number; active: number; inactive: number; blocked: number };
}) {
  const cards = [
    { label: "Total Karigars", value: summary.total },
    { label: "Active", value: summary.active },
    { label: "Inactive", value: summary.inactive },
    { label: "Blocked", value: summary.blocked },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
