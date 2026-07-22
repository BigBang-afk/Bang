export default function Disclaimer() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-200/90">
      <strong className="text-amber-300">Risk note:</strong> 1-minute binary-option expiries are
      dominated by short-term noise, not by anything visible on a chart. This tool gives a
      structured technical read (candle patterns, support/resistance, momentum) with an honest
      confidence estimate — it is not a guarantee, and no chart-reading method can reliably predict
      where price will be in 60 seconds. Treat every scan as one opinion, never risk money you
      can&apos;t afford to lose, and expect losing streaks even when confidence is high.
    </div>
  );
}
