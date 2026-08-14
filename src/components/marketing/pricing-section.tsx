import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPlanPrice, getPublicPlans } from "@/lib/plans";
import type { PlanLimits } from "@/types/database";

export async function PricingSection({ id = "pricing" }: { id?: string }) {
  const plans = await getPublicPlans();

  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade when you need more markets, more AI analysis, or
          more room to track your trades.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isFeatured = plan.code === "pro";
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                isFeatured
                  ? "border-primary/60 bg-card shadow-lg shadow-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card",
              )}
            >
              {isFeatured && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-medium">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {formatPlanPrice(plan.price_monthly_cents, plan.currency)}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>

              {plan.trial_days > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.trial_days}-day free trial
                </p>
              )}

              <Button
                className="mt-6"
                variant={isFeatured ? "default" : "outline"}
                nativeButton={false}
                render={
                  <Link href="/register">
                    {plan.price_monthly_cents === 0
                      ? "Start free"
                      : "Start trial"}
                  </Link>
                }
              />

              <ul className="mt-6 space-y-2.5 text-sm">
                {planHighlights(plan.limits).map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {line}
                  </li>
                ))}
                {plan.features.map((feature) => (
                  <li
                    key={feature.id}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Prices shown in USD. Payment processing is not yet enabled —
        subscriptions ship in a later phase.
      </p>
    </section>
  );
}

function planHighlights(limits: PlanLimits): string[] {
  const lines: string[] = [];
  const { watchlists, alerts, ai_analyses_per_day: ai, markets } = limits;

  lines.push(
    watchlists
      ? `${watchlists} watchlist${watchlists === 1 ? "" : "s"}`
      : "Unlimited watchlists",
  );
  lines.push(alerts ? `${alerts} active alerts` : "Unlimited alerts");
  lines.push(ai ? `${ai} AI analyses / day` : "Unlimited AI analyses");
  if (markets?.length) {
    lines.push(`Markets: ${markets.join(", ")}`);
  }
  return lines;
}
