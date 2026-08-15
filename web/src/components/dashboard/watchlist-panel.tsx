import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addWatchlistSymbol, removeWatchlistSymbol } from "@/app/dashboard/actions";
import { MiniSymbolOverview } from "@/components/tradingview/symbol-overview";
import { Plus, X, Star } from "lucide-react";

function toTradingViewSymbol(symbol: string) {
  return symbol.includes(":") ? symbol : `NASDAQ:${symbol}`;
}

export async function WatchlistPanel() {
  const session = await auth();
  if (!session?.user) return null;

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Star className="h-4 w-4 text-brand-green" />
          Your watchlist
        </h3>
        <span className="text-xs text-foreground-muted">{items.length} symbols</span>
      </div>

      <form action={addWatchlistSymbol} className="mb-4 flex gap-2">
        <input
          name="symbol"
          placeholder="e.g. AAPL or BINANCE:SOLUSD"
          className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-brand-green/60"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center rounded-lg bg-brand-green/10 px-3 text-brand-green hover:bg-brand-green/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-sm text-foreground-muted">
          No symbols yet. Add your first one above.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{item.symbol}</span>
                <form action={removeWatchlistSymbol}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="text-foreground-muted hover:text-danger cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
              <MiniSymbolOverview
                symbol={toTradingViewSymbol(item.symbol)}
                className="h-[120px] w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
