import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionsApi } from "../../api/endpoints";
import { LoadingSkeleton } from "../../components/ui/States";

export default function PricingPage() {
  const { data: plans, isLoading } = useQuery({ queryKey: ["public-plans"], queryFn: () => SubscriptionsApi.plans(true) });

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="page-heading mb-2 text-center">Pricing</h1>
      <p className="text-slate-400 mb-12 text-center max-w-xl mx-auto">
        Choose a plan based on how many signals, which pairs, and how much history and analytics you need.
      </p>

      {isLoading && <LoadingSkeleton rows={3} />}

      <div className="grid md:grid-cols-4 gap-6">
        {plans?.map((plan) => (
          <div key={plan.id} className={`glass-card p-6 flex flex-col ${plan.name === "Premium" ? "neon-border-cyan" : ""}`}>
            <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
            <p className="text-sm text-slate-400 mt-1 mb-4">{plan.description}</p>
            <p className="text-3xl font-extrabold text-cyan-400">
              {plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice}`}
              {plan.monthlyPrice > 0 && <span className="text-sm text-slate-500 font-normal">/mo</span>}
            </p>
            <ul className="text-sm text-slate-300 mt-6 space-y-2 flex-1">
              <li>• {plan.maxSignalsPerDay === 0 ? "Unlimited" : plan.maxSignalsPerDay} signals / day</li>
              <li>• {plan.allowAllPairs ? "All pairs" : "Selected pairs"}{plan.otcPairsAccess ? " incl. OTC" : ""}</li>
              <li>• {plan.signalDelaySeconds === 0 ? "Real-time" : `${plan.signalDelaySeconds}s delayed`} signals</li>
              <li>• {plan.signalHistoryDays}-day signal history</li>
              <li>• Analytics: {plan.analyticsAccess ? "Yes" : "No"}</li>
              <li>• Backtesting: {plan.backtestingAccess ? "Yes" : "No"}</li>
            </ul>
            <Link to="/register" className="btn-primary mt-6">Get Started</Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-10 text-center">
        Payments are reviewed manually by an administrator during this development phase — no third-party payment gateway is connected.
      </p>
    </div>
  );
}
