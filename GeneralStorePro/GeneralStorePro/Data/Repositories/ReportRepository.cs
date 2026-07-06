using System;
using System.Collections.Generic;
using System.Linq;
using Dapper;

namespace GeneralStorePro.Data.Repositories;

public sealed record TodaySaleRow(DateTime SaleDate, string InvoiceNumber, string CustomerName, decimal TotalAmount);

public sealed record ProfitSummary(decimal Revenue, decimal Cost, decimal Profit);

public static class ReportRepository
{
    public static IReadOnlyList<TodaySaleRow> GetTodaySales()
    {
        using var connection = DbConnectionFactory.CreateConnection();

        var rows = connection.Query<RawSaleRow>(
            """
            SELECT s.SaleDate AS SaleDate, s.InvoiceNumber AS InvoiceNumber, COALESCE(c.Name, 'Walk-in Customer') AS CustomerName, s.TotalAmount AS TotalAmount
            FROM Sales s
            LEFT JOIN Customers c ON c.Id = s.CustomerId
            WHERE date(s.SaleDate) = date('now', 'localtime')
            ORDER BY s.SaleDate DESC;
            """);

        return rows.Select(r => new TodaySaleRow(r.SaleDate, r.InvoiceNumber, r.CustomerName, r.TotalAmount)).ToList();
    }

    public static decimal GetTodaySalesTotal()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        return connection.ExecuteScalar<decimal?>(
            "SELECT COALESCE(SUM(TotalAmount), 0) FROM Sales WHERE date(SaleDate) = date('now', 'localtime');") ?? 0m;
    }

    public static ProfitSummary GetTodayProfitSummary()
    {
        using var connection = DbConnectionFactory.CreateConnection();

        var row = connection.QuerySingle<RawProfitRow>(
            """
            SELECT
                COALESCE(SUM(si.TotalPrice), 0) AS Revenue,
                COALESCE(SUM(si.Quantity * p.PurchasePrice), 0) AS Cost
            FROM SaleItems si
            JOIN Sales s ON s.Id = si.SaleId
            JOIN Products p ON p.Id = si.ProductId
            WHERE date(s.SaleDate) = date('now', 'localtime');
            """);

        return new ProfitSummary(row.Revenue, row.Cost, row.Revenue - row.Cost);
    }

    private sealed class RawSaleRow
    {
        public DateTime SaleDate { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }

    private sealed class RawProfitRow
    {
        public decimal Revenue { get; set; }
        public decimal Cost { get; set; }
    }
}
