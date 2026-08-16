import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SystemStatusItem = {
  label: string;
  operational: boolean;
  detail: string;
};

export function SystemStatus({ items }: { items: SystemStatusItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <Badge variant={item.operational ? "success" : "danger"}>
              {item.operational ? "Operational" : "Down"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
