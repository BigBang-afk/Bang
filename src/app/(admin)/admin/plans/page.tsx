import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { formatPlanPrice, getPublicPlans } from "@/lib/plans";

export const metadata: Metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  await requireAdmin();
  const plans = await getPublicPlans();

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Pricing plans are stored in the database (public.plans), not hard-coded in the app. In-app editing ships in a later phase — for now, update rows directly via the Supabase dashboard or SQL."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{plan.name}</CardTitle>
              <Badge variant={plan.is_active ? "default" : "secondary"}>
                {plan.is_active ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-2xl font-semibold">
                {formatPlanPrice(plan.price_monthly_cents, plan.currency)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-muted-foreground">{plan.description}</p>
              <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                <span>Trial</span>
                <span>{plan.trial_days > 0 ? `${plan.trial_days} days` : "None"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Code</span>
                <span className="font-mono">{plan.code}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
