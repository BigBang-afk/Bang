import { getCurrentGoldRates } from "@/lib/gold";
import { formatPkr, formatDateTime, purityLabel } from "@/lib/format";

export async function GoldRateBar({
  show24k = true,
  show21k = true,
  show18k = true,
}: {
  show24k?: boolean;
  show21k?: boolean;
  show18k?: boolean;
}) {
  const rates = await getCurrentGoldRates();
  const entries = [
    show24k && { purity: "K24" as const, rate: rates.K24, at: rates.effectiveAt.K24 },
    show21k && { purity: "K21" as const, rate: rates.K21, at: rates.effectiveAt.K21 },
    show18k && { purity: "K18" as const, rate: rates.K18, at: rates.effectiveAt.K18 },
  ].filter((e): e is { purity: "K24" | "K21" | "K18"; rate: number | null; at: Date | undefined } => Boolean(e));

  const latestUpdate = entries
    .map((e) => e.at)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <div className="bg-maroon text-cream">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-3 text-sm">
        {entries.map((e) => (
          <div key={e.purity} className="flex items-center gap-2">
            <span className="font-display text-gold">{purityLabel(e.purity)} Gold</span>
            <span className="font-medium">
              {e.rate != null ? `${formatPkr(e.rate, 0)} / g` : "Rate not set"}
            </span>
          </div>
        ))}
        {latestUpdate && (
          <span className="text-xs text-cream/60">Last updated: {formatDateTime(latestUpdate)}</span>
        )}
      </div>
    </div>
  );
}
