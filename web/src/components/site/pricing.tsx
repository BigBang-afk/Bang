import { SectionHeading } from "./section-heading";
import { ButtonLink } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/forever",
    description: "For traders getting started with live markets.",
    features: [
      "Real-time TradingView charts",
      "1 watchlist, up to 10 symbols",
      "Daily AI market summary",
      "Community support",
    ],
    cta: "Create free account",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For active traders who need an edge.",
    features: [
      "Everything in Starter",
      "Unlimited watchlists & alerts",
      "Live AI signal scoring",
      "Advanced risk & position tools",
      "Priority support",
    ],
    cta: "Start Pro trial",
    highlighted: true,
  },
  {
    name: "Institutional",
    price: "Custom",
    period: "",
    description: "For funds and trading desks at scale.",
    features: [
      "Everything in Pro",
      "Dedicated data infrastructure",
      "Team seats & admin controls",
      "Custom AI model tuning",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple plans that scale with your trading"
        description="Start free. Upgrade the moment you need deeper AI insight."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative flex flex-col rounded-2xl p-8",
              plan.highlighted
                ? "glass-card glow-green border-brand-green/40"
                : "glass-card",
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-brand-green to-brand-cyan px-3 py-1 text-xs font-bold text-[#05070d]">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{plan.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{plan.price}</span>
              <span className="text-sm text-foreground-muted">{plan.period}</span>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span className="text-foreground-muted">{f}</span>
                </li>
              ))}
            </ul>

            <ButtonLink
              href="/register"
              variant={plan.highlighted ? "primary" : "secondary"}
              className="mt-8 w-full"
            >
              {plan.cta}
            </ButtonLink>
          </div>
        ))}
      </div>
    </section>
  );
}
