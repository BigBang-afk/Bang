import { Card } from "@/components/ui/card";

const PLANS = [
  { name: "Free", price: "$0", features: ["1 manual strategy", "Delayed statistics", "Community support"] },
  { name: "Pro", price: "$29/mo", features: ["All 10 strategies", "AI Auto mode", "Full backtesting", "Priority support"] },
  { name: "Elite", price: "$79/mo", features: ["Everything in Pro", "ML-calibrated confidence", "API access", "1:1 onboarding"] },
];

export default function PricingPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-center text-3xl font-bold text-gray-100">Pricing</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.name}>
            <h3 className="text-lg font-semibold text-gray-100">{plan.name}</h3>
            <p className="mt-1 text-2xl font-bold text-terminal-accent">{plan.price}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-400">
              {plan.features.map((f) => (
                <li key={f}>&bull; {f}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
