using System.Globalization;
using CsvHelper;
using TradingPortfolioDashboard.Models;

namespace TradingPortfolioDashboard.Services;

/// <summary>
/// Imports trades from broker/exchange CSV exports. Column names vary a lot between brokers,
/// so headers are matched case-insensitively against a set of known aliases instead of a fixed schema.
/// </summary>
public static class CsvImportService
{
    private static readonly string[] SymbolAliases = { "symbol", "ticker", "asset", "pair", "instrument" };
    private static readonly string[] SideAliases = { "side", "action", "type", "direction", "buy/sell" };
    private static readonly string[] QuantityAliases = { "quantity", "qty", "shares", "amount", "size" };
    private static readonly string[] PriceAliases = { "price", "unit price", "avg price", "fill price", "execution price" };
    private static readonly string[] FeesAliases = { "fees", "fee", "commission", "commissions" };
    private static readonly string[] DateAliases = { "date", "trade date", "time", "datetime", "executed at" };
    private static readonly string[] NotesAliases = { "notes", "note", "description", "memo" };

    public static List<Trade> Import(string filePath)
    {
        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? Array.Empty<string>();

        var symbolCol = FindColumn(headers, SymbolAliases);
        var sideCol = FindColumn(headers, SideAliases);
        var qtyCol = FindColumn(headers, QuantityAliases);
        var priceCol = FindColumn(headers, PriceAliases);
        var feesCol = FindColumn(headers, FeesAliases);
        var dateCol = FindColumn(headers, DateAliases);
        var notesCol = FindColumn(headers, NotesAliases);

        if (symbolCol is null || qtyCol is null || priceCol is null)
        {
            throw new InvalidOperationException(
                "Couldn't find Symbol, Quantity and Price columns in this CSV. " +
                "Expected header names like Symbol/Ticker, Quantity/Qty, Price.");
        }

        var trades = new List<Trade>();

        while (csv.Read())
        {
            var symbol = csv.GetField(symbolCol)?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(symbol))
            {
                continue;
            }

            var quantity = ParseDecimal(csv.GetField(qtyCol));
            var price = ParseDecimal(csv.GetField(priceCol));
            var fees = feesCol is not null ? ParseDecimal(csv.GetField(feesCol)) : 0m;
            var side = sideCol is not null ? ParseSide(csv.GetField(sideCol)) : TradeSide.Buy;
            var date = dateCol is not null ? ParseDate(csv.GetField(dateCol)) : DateTime.Now;
            var notes = notesCol is not null ? csv.GetField(notesCol) : null;

            if (quantity <= 0 || price <= 0)
            {
                continue;
            }

            trades.Add(new Trade
            {
                Symbol = symbol,
                Side = side,
                Quantity = Math.Abs(quantity),
                Price = price,
                Fees = fees,
                Date = date,
                Notes = notes
            });
        }

        return trades;
    }

    private static string? FindColumn(string[] headers, string[] aliases)
    {
        foreach (var alias in aliases)
        {
            var match = headers.FirstOrDefault(h => string.Equals(h.Trim(), alias, StringComparison.OrdinalIgnoreCase));
            if (match is not null)
            {
                return match;
            }
        }

        return null;
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0m;
        }

        var cleaned = value.Replace("$", "").Replace(",", "").Replace("(", "-").Replace(")", "").Trim();
        return decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var result) ? result : 0m;
    }

    private static DateTime ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DateTime.Now;
        }

        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result)
            ? result
            : DateTime.Now;
    }

    private static TradeSide ParseSide(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return TradeSide.Buy;
        }

        var normalized = value.Trim().ToUpperInvariant();
        return normalized.Contains("SELL") || normalized.Contains("SHORT") || normalized == "S"
            ? TradeSide.Sell
            : TradeSide.Buy;
    }
}
