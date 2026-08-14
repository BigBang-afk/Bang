import { supportedMarkets } from "@/lib/config/site";

export function SupportedMarkets() {
  return (
    <section id="markets" className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for more than one market
          </h2>
          <p className="mt-4 text-muted-foreground">
            Lumenex isn&apos;t wired around a single asset class — the platform is
            designed to expand across markets as you need them.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {supportedMarkets.map((market) => (
            <div
              key={market.key}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <p className="text-lg font-medium">{market.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{market.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
