import { dashboardNav } from "@/lib/config/nav";

const bars = [42, 58, 39, 65, 71, 54, 80, 62, 88, 74, 91, 68, 77, 95, 83];

export function DashboardPreview() {
  const previewNav = dashboardNav.slice(0, 7);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-chart-4/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs text-muted-foreground">app.lumenex.io/dashboard</span>
        </div>

        <div className="grid grid-cols-[auto_1fr] text-xs">
          <div className="hidden w-44 shrink-0 border-r border-border bg-sidebar p-3 sm:block">
            {previewNav.map((item, i) => (
              <div
                key={item.href}
                className={`mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 ${
                  i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-3.5" />
                {item.title}
              </div>
            ))}
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">BTC / USD</p>
                <p className="text-muted-foreground">4H · AI confidence 74%</p>
              </div>
              <span className="rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">
                BUY setup
              </span>
            </div>

            <div className="flex h-32 items-end gap-1 rounded-lg border border-border/60 bg-background/40 p-3 sm:h-40">
              {bars.map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${
                    i % 3 === 0 ? "bg-danger/60" : "bg-success/60"
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-muted-foreground">Entry</p>
                <p className="mt-1 font-medium text-foreground">64,220</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-muted-foreground">Stop-loss</p>
                <p className="mt-1 font-medium text-danger">62,900</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="text-muted-foreground">Take-profit</p>
                <p className="mt-1 font-medium text-success">67,400</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Illustrative preview of the Lumenex dashboard interface. Prices and setups are
        for design purposes only.
      </p>
    </section>
  );
}
