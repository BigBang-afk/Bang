import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Check, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getUsageSummary, getUserPlan } from "@/lib/entitlements";
import { requireUser } from "@/lib/auth/session";
import { formatPlanPrice, getPublicPlans } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { CountedLimitKey, DailyLimitKey } from "@/lib/entitlements";

export const metadata: Metadata = { title: "Subscription" };

const usageLabels: Record<CountedLimitKey | DailyLimitKey, string> = {
  watchlists: "Watchlists",
  watchlist_items: "Watchlist assets",
  alerts: "Alerts",
  saved_setups: "Saved setups",
  journal_entries: "Journal entries",
  ai_analyses_per_day: "AI analyses today",
  scanner_requests_per_day: "Scanner requests today",
};

export default async function SubscriptionPage() {
  const profile = await requireUser("/dashboard/subscription");
  const supabase = await createClient();

  const [{ subscription, plan, isFallback }, usage, plans, { data: payments }] =
    await Promise.all([
      getUserPlan(profile.id),
      getUsageSummary(profile.id),
      getPublicPlans(),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const currentFeatures = plans.find((p) => p.id === plan.id)?.features ?? [];

  const renewalLabel = subscription?.trial_ends_at
    ? `Trial ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
    : subscription?.current_period_end
      ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
      : "No renewal — Free plan";

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Subscription"
        description="Payment processing isn't enabled yet — plan changes will be available in a later phase."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPlanPrice(plan.price_monthly_cents, plan.currency)}/month
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {isFallback ? "active" : subscription?.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{renewalLabel}</p>

            {currentFeatures.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Included on your plan
                </p>
                <ul className="space-y-1.5">
                  {currentFeatures.map((feature) => (
                    <li key={feature.id} className="flex items-center gap-2 text-sm">
                      <Check className="size-3.5 shrink-0 text-primary" />
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usage.map((row) => {
              const percent = row.limit ? Math.min(100, (row.used / row.limit) * 100) : 0;
              return (
                <div key={row.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{usageLabels[row.key]}</span>
                    <span className="tabular-nums text-foreground">
                      {row.used}
                      {row.limit !== null ? ` / ${row.limit}` : " · unlimited"}
                    </span>
                  </div>
                  {row.limit !== null && (
                    <Progress
                      value={percent}
                      className={
                        percent >= 100
                          ? "[&_[data-slot=progress-indicator]]:bg-danger"
                          : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Change plan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = p.code === plan.code;
            const direction =
              p.price_monthly_cents > plan.price_monthly_cents
                ? "up"
                : p.price_monthly_cents < plan.price_monthly_cents
                  ? "down"
                  : null;
            return (
              <Card key={p.id} className={isCurrent ? "border-primary/50" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    {p.name}
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
                    {formatPlanPrice(p.price_monthly_cents, p.currency)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant={isCurrent ? "outline" : "secondary"}
                    disabled
                  >
                    {isCurrent ? (
                      "Current plan"
                    ) : direction === "up" ? (
                      <>
                        <ArrowUp className="size-3.5" />
                        Upgrade — coming soon
                      </>
                    ) : direction === "down" ? (
                      <>
                        <ArrowDown className="size-3.5" />
                        Downgrade — coming soon
                      </>
                    ) : (
                      "Coming soon"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Billing history</h2>
        <Card>
          <CardContent className={payments && payments.length > 0 ? "p-0" : undefined}>
            {!payments || payments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No billing history yet"
                description="Invoices and receipts will appear here once payment processing is enabled."
                className="border-none"
              />
            ) : (
              <ul>
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </span>
                    <span>{formatPlanPrice(payment.amount_cents, payment.currency)}</span>
                    <Badge variant="secondary" className="capitalize">
                      {payment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Questions about billing? See the full{" "}
        <Link href="/pricing" className="text-foreground underline underline-offset-4">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}
