const stats = [
  { value: "$2.4B+", label: "Trading volume analyzed daily" },
  { value: "180K+", label: "Active traders worldwide" },
  { value: "99.98%", label: "Platform uptime" },
  { value: "40ms", label: "Average data latency" },
];

export function Stats() {
  return (
    <section className="border-y border-border-subtle bg-background-elevated">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center gap-1.5">
            <span className="font-display text-3xl font-bold gradient-text sm:text-4xl">
              {s.value}
            </span>
            <span className="text-xs text-foreground-muted sm:text-sm">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
