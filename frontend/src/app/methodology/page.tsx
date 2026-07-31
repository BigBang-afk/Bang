export default function MethodologyPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-gray-300">
      <h1 className="text-2xl font-bold text-gray-100">Methodology</h1>
      <p>
        Every signal passes through a strict pipeline: live ticks are aggregated into candles, a feature engine
        computes trend/momentum/volatility/price-action/context features, a market-condition classifier determines
        whether the current environment suits the selected strategy, and only then does the chosen strategy (or the
        AI Strategy Selector) evaluate its entry and rejection conditions.
      </p>
      <p>
        A confirmed CALL or PUT signal is written to the database, with its entry price, timing and reasoning,
        before it is broadcast to any client - so a signal can never be generated after its outcome is already
        known. Results are checked automatically at expiry using the same independent market-data provider and are
        never editable by users.
      </p>
      <p>
        Confidence is either rule-based (a weighted combination of trend alignment, momentum, price action,
        support/resistance location, volatility suitability, multi-timeframe agreement and data quality) or, when a
        validated calibrated machine-learning model is active for that asset/strategy pair, a calibrated
        probability. Confidence is never fabricated and a signal below the configured threshold is always NO TRADE.
      </p>
    </main>
  );
}
