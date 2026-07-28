const FEATURES = [
  { title: "Real-time signal feed", body: "SignalR-powered live updates for new signals, countdowns, activation and results — no page refresh required." },
  { title: "7 rule-based strategies", body: "Momentum Continuation, Breakout & Retest, Liquidity Sweep Reversal, Trend Pullback, Support/Resistance Rejection, Candle Pressure Sequence, and Multi-Timeframe Confirmation." },
  { title: "Transparent confidence scoring", body: "Every signal shows its trend, structure, momentum, candle-pressure, support/resistance, breakout, volatility, data-quality and historical-performance scores." },
  { title: "Complete signal history", body: "Filter by pair, direction, result, strategy, confidence range and market condition. Export to CSV any time." },
  { title: "Backtesting without look-ahead bias", body: "Test strategies against historical data with strict no-look-ahead guarantees, walk-forward validation, and full equity/drawdown reporting." },
  { title: "OTC & regular market pairs", body: "Support for standard forex pairs and OTC symbols like EUR/USD OTC, USD/PKR OTC and more, each tracked with real payout data." },
  { title: "English & Urdu/Hinglish analysis", body: "Every signal's analysis explanation is available in English and Urdu/Hinglish." },
  { title: "Admin-configurable engine", body: "Confidence weights, no-trade filters, strategy parameters and provider settings are all tunable from the admin panel — never hardcoded." },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="page-heading mb-4">Platform Features</h1>
      <p className="text-slate-400 max-w-2xl mb-12">
        FlexX Signal is a signal and analysis platform only. We never automate trade execution and never store
        your trading-platform credentials.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card p-6">
            <h3 className="text-cyan-400 font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
