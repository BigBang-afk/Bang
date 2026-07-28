import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SignalsApi } from "../../api/endpoints";
import { StatCard } from "../../components/ui/StatCard";

export default function LandingPage() {
  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: SignalsApi.statistics });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(34,211,238,0.15),transparent_50%),radial-gradient(circle_at_80%_10%,rgba(250,204,21,0.08),transparent_40%)]" />
        <div className="relative max-w-5xl mx-auto px-4 py-24 text-center">
          <span className="badge-gold mb-6 inline-flex">High Confidence Signals · Not Guaranteed Wins</span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-50 leading-tight">
            Real-time binary-options <span className="text-cyan-400">signal analysis</span>,<br />
            built on transparent statistics.
          </h1>
          <p className="text-slate-400 mt-6 max-w-2xl mx-auto">
            FlexX Signal analyzes market structure, momentum, candle patterns and multi-timeframe confirmation to
            surface high-confidence UP/DOWN signals — with full transparency on wins, losses, ties and canceled trades.
            We never execute trades and never guarantee profits.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base px-8 py-3">Get Started Free</Link>
            <Link to="/performance" className="btn-secondary text-base px-8 py-3">View Live Performance</Link>
          </div>
        </div>
      </section>

      {stats && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="7-Day Win Rate" value={`${stats.sevenDayWinRate.toFixed(1)}%`} tone="up" />
            <StatCard label="Last 100 Signals" value={`${stats.last100WinRate.toFixed(1)}%`} tone="gold" />
            <StatCard label="Today's Signals" value={stats.todaySignals} />
            <StatCard label="Avg. Confidence" value={`${stats.averageConfidence.toFixed(1)}%`} tone="up" />
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Live statistics computed from every recorded signal, wins and losses alike. Nothing here is fabricated or hidden.
          </p>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="page-heading text-center mb-10">How FlexX Signal works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Multi-factor analysis", body: "Trend, market structure, candle pressure, momentum, support/resistance, breakout quality, volatility and multi-timeframe agreement are each scored and weighted." },
            { title: "Calibrated confidence", body: "Confidence is a deterministic weighted score, calibrated against each strategy's real recorded win rate — never a random percentage." },
            { title: "No-trade discipline", body: "Signals are withheld on incomplete data, extreme volatility, unclear structure, or when confidence falls below the admin threshold." },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6">
              <h3 className="text-cyan-400 font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
