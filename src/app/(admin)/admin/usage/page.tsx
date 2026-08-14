import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UsageType } from "@/types/database";

export const metadata: Metadata = { title: "Usage Stats" };

const usageLabels: Record<UsageType, string> = {
  ai_analysis: "AI analyses",
  scanner_run: "Scanner runs",
  alert_created: "Alerts created",
  api_call: "API calls",
};

export default async function AdminUsagePage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from("usage_tracking").select("usage_type, quantity");

  const totals = (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.usage_type] = (acc[row.usage_type] ?? 0) + row.quantity;
    return acc;
  }, {});

  const hasUsage = Object.keys(totals).length > 0;

  return (
    <div>
      <PageHeader
        title="Usage statistics"
        description="Aggregated from usage_tracking. Populated once scanning, AI analysis and alerts go live in later phases."
      />

      {!hasUsage ? (
        <EmptyState
          icon={BarChart3}
          title="No usage recorded yet"
          description="Usage events will appear here once feature-metered actions (AI analysis, scanner runs, alerts) start writing to usage_tracking."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(usageLabels) as UsageType[]).map((type) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {usageLabels[type]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{totals[type] ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
