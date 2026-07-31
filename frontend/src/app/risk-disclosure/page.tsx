export default function RiskDisclosurePage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-gray-300">
      <h1 className="text-2xl font-bold text-gray-100">Risk Disclosure</h1>
      <p>
        Quotex Real Market AI Signals is an independent market-analysis and signal platform. It is not affiliated
        with, endorsed by, or operated on behalf of Quotex or any other trading platform.
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Signals are generated from an authorized independent market-data provider, not from Quotex directly.</li>
        <li>Prices shown may differ from the prices displayed on Quotex or any other trading platform.</li>
        <li>No signal, strategy, or AI Auto mode guarantees profit or 100% accuracy.</li>
        <li>Past performance, including any win rate shown on this platform, does not guarantee future results.</li>
        <li>Trading financial instruments carries a high level of risk and may not be suitable for all investors.</li>
        <li>You are solely responsible for any trade you choose to execute manually on any platform.</li>
        <li>This platform never places trades automatically and never requests your trading-platform credentials.</li>
      </ul>
      <p>Only trade with capital you can afford to lose, and consider seeking independent financial advice.</p>
    </main>
  );
}
