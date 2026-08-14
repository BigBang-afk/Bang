import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/session";
import { formatPlanPrice, getPublicPlans } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { PlanRow, SubscriptionRow } from "@/types/database";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  const profile = await requireUser("/dashboard/subscription");
  const supabase = await createClient();

  const [{ data: subscription }, plans] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("user_id", profile.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle(),
    getPublicPlans(),
  ]);

  const current = subscription as unknown as (SubscriptionRow & { plans: PlanRow }) | null;

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Payment processing isn't enabled yet — plan changes will be available in a later phase."
      />

      <Card className="mb-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-sm">Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {current ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{current.plans.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPlanPrice(current.plans.price_monthly_cents, current.plans.currency)}/month
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {current.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active subscription found. You&apos;re on the Free plan by default.
            </p>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-4 text-sm font-medium text-muted-foreground">Available plans</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = current?.plans.code === plan.code;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary/50" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  {plan.name}
                  {isCurrent && (
                    <Badge className="gap-1">
                      <Check className="size-3" />
                      Current
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatPlanPrice(plan.price_monthly_cents, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? "outline" : "secondary"}
                  disabled
                >
                  {isCurrent ? "Current plan" : "Coming soon"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Questions about billing? See the full{" "}
        <Link href="/pricing" className="text-foreground underline underline-offset-4">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}
