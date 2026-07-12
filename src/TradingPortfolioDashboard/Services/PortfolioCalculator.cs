using TradingPortfolioDashboard.Models;

namespace TradingPortfolioDashboard.Services;

/// <summary>
/// Turns a raw trade log into open positions and an equity curve using FIFO cost-basis matching.
/// </summary>
public static class PortfolioCalculator
{
    private class Lot
    {
        public decimal Quantity;
        public decimal UnitCost;
    }

    public static List<Position> BuildPositions(IEnumerable<Trade> trades, IReadOnlyDictionary<string, decimal> lastPrices)
    {
        var positions = new List<Position>();

        foreach (var group in trades.GroupBy(t => t.Symbol, StringComparer.OrdinalIgnoreCase))
        {
            var lots = new Queue<Lot>();
            decimal realizedPnL = 0m;

            foreach (var trade in group.OrderBy(t => t.Date))
            {
                if (trade.Quantity <= 0)
                {
                    continue;
                }

                if (trade.Side == TradeSide.Buy)
                {
                    var unitCost = trade.Price + trade.Fees / trade.Quantity;
                    lots.Enqueue(new Lot { Quantity = trade.Quantity, UnitCost = unitCost });
                }
                else
                {
                    var unitProceeds = trade.Price - trade.Fees / trade.Quantity;
                    var remaining = trade.Quantity;

                    while (remaining > 0 && lots.Count > 0)
                    {
                        var lot = lots.Peek();
                        var matched = Math.Min(lot.Quantity, remaining);

                        realizedPnL += matched * (unitProceeds - lot.UnitCost);

                        lot.Quantity -= matched;
                        remaining -= matched;

                        if (lot.Quantity <= 0)
                        {
                            lots.Dequeue();
                        }
                    }

                    if (remaining > 0)
                    {
                        // Sold more than currently held: treat the excess as a short lot.
                        lots.Enqueue(new Lot { Quantity = -remaining, UnitCost = unitProceeds });
                    }
                }
            }

            var netQuantity = lots.Sum(l => l.Quantity);
            var totalCost = lots.Sum(l => l.Quantity * l.UnitCost);
            var avgCost = netQuantity != 0 ? totalCost / netQuantity : 0m;

            if (Math.Abs(netQuantity) < 0.0000001m && realizedPnL == 0m)
            {
                continue;
            }

            var symbol = group.Key;
            lastPrices.TryGetValue(symbol, out var lastPrice);

            positions.Add(new Position
            {
                Symbol = symbol,
                Quantity = netQuantity,
                AvgCost = avgCost,
                RealizedPnL = realizedPnL,
                CurrentPrice = lastPrice > 0 ? lastPrice : avgCost
            });
        }

        var totalMarketValue = positions.Sum(p => p.MarketValue);
        foreach (var position in positions)
        {
            position.AllocationPct = totalMarketValue != 0
                ? (double)(position.MarketValue / totalMarketValue)
                : 0;
        }

        return positions.OrderByDescending(p => p.MarketValue).ToList();
    }

    public static List<EquityPoint> BuildEquityCurve(IEnumerable<Trade> trades)
    {
        var points = new List<EquityPoint> { new() { Date = DateTime.Now.Date.AddDays(-1), CumulativeRealizedPnL = 0m } };
        var lotsBySymbol = new Dictionary<string, Queue<Lot>>(StringComparer.OrdinalIgnoreCase);
        decimal cumulative = 0m;

        foreach (var trade in trades.OrderBy(t => t.Date))
        {
            if (trade.Quantity <= 0)
            {
                continue;
            }

            if (!lotsBySymbol.TryGetValue(trade.Symbol, out var lots))
            {
                lots = new Queue<Lot>();
                lotsBySymbol[trade.Symbol] = lots;
            }

            if (trade.Side == TradeSide.Buy)
            {
                var unitCost = trade.Price + trade.Fees / trade.Quantity;
                lots.Enqueue(new Lot { Quantity = trade.Quantity, UnitCost = unitCost });
                continue;
            }

            var unitProceeds = trade.Price - trade.Fees / trade.Quantity;
            var remaining = trade.Quantity;
            var tradeRealized = 0m;

            while (remaining > 0 && lots.Count > 0)
            {
                var lot = lots.Peek();
                var matched = Math.Min(lot.Quantity, remaining);

                tradeRealized += matched * (unitProceeds - lot.UnitCost);

                lot.Quantity -= matched;
                remaining -= matched;

                if (lot.Quantity <= 0)
                {
                    lots.Dequeue();
                }
            }

            if (tradeRealized != 0m)
            {
                cumulative += tradeRealized;
                points.Add(new EquityPoint { Date = trade.Date, CumulativeRealizedPnL = cumulative });
            }
        }

        return points;
    }
}
