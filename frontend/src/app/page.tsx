import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  { title: "Live Market Data", body: "Realtime forex, gold and crypto prices from an authorized independent data provider." },
  { title: "10 Professional Strategies", body: "EMA trend, momentum, S/R rejection, breakout/retest, liquidity sweeps, divergence, squeeze breakout and more." },
  { title: "AI Strategy Selector", body: "Evaluates every enabled strategy and only signals when multiple strategies genuinely agree." },
  { title: "Synchronized Countdown", body: "Server-time-anchored timers that survive refreshes and reconnects without drifting." },
  { title: "Transparent Performance", body: "Every signal - win, loss or draw - is stored permanently and never hidden from statistics." },
  { title: "Manual Execution", body: "You choose when and where to act. This platform never places trades automatically." },
];

export default function LandingPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
          Quotex Real Market <span className="text-terminal-accent">AI Signals</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-400">
          An independent market-analysis platform generating CALL / PUT / NO TRADE signals from live forex, gold
          and crypto data - for you to execute manually on Quotex or any trading platform you choose.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Create Free Account</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary">
              View Live Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <h3 className="font-semibold text-gray-100">{feature.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{feature.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-16 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200">
        <p className="font-semibold">Important disclosures</p>
        <p className="mt-2">
          Prices are supplied by an independent market-data provider and may differ from prices on third-party
          trading platforms, including Quotex. Past performance does not guarantee future results. No signal,
          strategy or AI mode offered on this platform guarantees profit or 100% accuracy. This platform never
          places trades automatically and never requests your Quotex password, session ID or cookies.
        </p>
        <Link href="/risk-disclosure" className="mt-3 inline-block underline">
          Read the full risk disclosure
        </Link>
      </section>
    </main>
  );
}
