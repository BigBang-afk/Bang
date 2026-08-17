import { formatCurrency } from "@/lib/format";

/**
 * Small, dependency-free chart primitives for the Financial Dashboard — no
 * charting library is installed in this codebase (see package.json), and
 * adding one for a handful of simple visualizations wasn't worth the
 * bundle-size/dependency-risk tradeoff. Both render real, server-computed
 * data passed in as props — never placeholder/demo values.
 */

export function BarChartList({
  items,
  valueFormatter = formatCurrency,
}: {
  items: { label: string; value: number }[];
  valueFormatter?: (value: number) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for this period yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-muted-foreground">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  points,
  height = 120,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for this period yet.</p>;
  }

  const width = 600;
  const padding = 8;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((p.value - min) / span) * (height - padding * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <path d={areaPath} fill="var(--color-gold-soft)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-gold)" strokeWidth={2} />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r={2.5} fill="var(--color-gold)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
