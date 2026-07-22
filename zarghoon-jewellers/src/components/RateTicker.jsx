import { formatRate, getTodayRates } from "../data/goldRates";

const dateFormatter = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function TrendArrow({ trend }) {
  if (trend === "up") return <span className="text-emerald-400">▲</span>;
  if (trend === "down") return <span className="text-rose-400">▼</span>;
  return <span className="text-cream/40">•</span>;
}

function RateItem({ rate }) {
  return (
    <span className="mx-4 inline-flex items-center gap-2 whitespace-nowrap text-xs text-cream/80">
      <span className="uppercase tracking-wide text-gold">{rate.label}</span>
      <span>{formatRate(rate.price)}</span>
      <span className="text-[10px]">/ {rate.unit.replace("per ", "")}</span>
      <TrendArrow trend={rate.trend} />
    </span>
  );
}

export default function RateTicker() {
  const { asOf, rates, indicative } = getTodayRates();

  const track = (
    <>
      <span className="mx-4 inline-flex items-center whitespace-nowrap text-xs font-medium text-gold">
        Today's Rates — {dateFormatter.format(asOf)}
        <span className="ml-1.5 text-[10px] font-normal text-cream/40">(indicative)</span>
      </span>
      {rates.map((rate) => (
        <RateItem key={rate.label} rate={rate} />
      ))}
    </>
  );

  return (
    <div className="overflow-hidden border-b border-gold/15 bg-ink py-2">
      <div className="flex w-max animate-ticker">
        <div className="flex shrink-0">{track}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {track}
        </div>
      </div>
      {indicative && (
        <p className="sr-only">
          Rates shown are indicative reference rates, not live pricing.
        </p>
      )}
    </div>
  );
}
