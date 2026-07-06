using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using GeneralStorePro.Data.Repositories;
using GeneralStorePro.Models;

namespace GeneralStorePro.Services;

public sealed record ReportsSnapshot(
    IReadOnlyList<TodaySaleRow> TodaySales,
    decimal TodaySalesTotal,
    decimal TodayRevenue,
    decimal TodayCost,
    decimal TodayProfit,
    IReadOnlyList<Product> StockLevels,
    IReadOnlyList<Product> LowStockProducts,
    IReadOnlyList<Customer> CustomerBalances,
    IReadOnlyList<Supplier> SupplierBalances,
    IReadOnlyList<Expense> Expenses,
    decimal TotalExpenses);

/// <summary>
/// Exports the full report pack to CSV (opens directly in Excel) or to PDF via the
/// Windows print pipeline ("Microsoft Print to PDF"), avoiding any new NuGet dependency.
/// </summary>
public static class ReportExporter
{
    public static void ExportToCsv(ReportsSnapshot data, string path)
    {
        using var writer = new StreamWriter(path, false, Encoding.UTF8);

        writer.WriteLine("Today Sales");
        writer.WriteLine("Time,Invoice,Customer,Total");
        foreach (var sale in data.TodaySales)
        {
            writer.WriteLine($"{sale.SaleDate:g},{Csv(sale.InvoiceNumber)},{Csv(sale.CustomerName)},{sale.TotalAmount}");
        }

        writer.WriteLine($"Total,,,{data.TodaySalesTotal}");
        writer.WriteLine();

        writer.WriteLine("Profit (Today)");
        writer.WriteLine("Revenue,Cost,Profit");
        writer.WriteLine($"{data.TodayRevenue},{data.TodayCost},{data.TodayProfit}");
        writer.WriteLine();

        writer.WriteLine("Stock");
        writer.WriteLine("Product,SKU,Stock,ReorderLevel");
        foreach (var product in data.StockLevels)
        {
            writer.WriteLine($"{Csv(product.Name)},{Csv(product.Sku ?? string.Empty)},{product.StockQuantity},{product.ReorderLevel}");
        }

        writer.WriteLine();

        writer.WriteLine("Low Stock");
        writer.WriteLine("Product,SKU,Stock,ReorderLevel");
        foreach (var product in data.LowStockProducts)
        {
            writer.WriteLine($"{Csv(product.Name)},{Csv(product.Sku ?? string.Empty)},{product.StockQuantity},{product.ReorderLevel}");
        }

        writer.WriteLine();

        writer.WriteLine("Customer Balance");
        writer.WriteLine("Customer,Phone,BalanceDue");
        foreach (var customer in data.CustomerBalances)
        {
            writer.WriteLine($"{Csv(customer.Name)},{Csv(customer.Phone ?? string.Empty)},{customer.CurrentBalance}");
        }

        writer.WriteLine();

        writer.WriteLine("Supplier Balance");
        writer.WriteLine("Supplier,Phone,BalanceDue");
        foreach (var supplier in data.SupplierBalances)
        {
            writer.WriteLine($"{Csv(supplier.Name)},{Csv(supplier.Phone ?? string.Empty)},{supplier.CurrentBalance}");
        }

        writer.WriteLine();

        writer.WriteLine("Expenses");
        writer.WriteLine("Date,Category,Description,Amount");
        foreach (var expense in data.Expenses)
        {
            writer.WriteLine($"{expense.ExpenseDate:d},{Csv(expense.Category)},{Csv(expense.Description ?? string.Empty)},{expense.Amount}");
        }

        writer.WriteLine($"Total,,,{data.TotalExpenses}");
    }

    private static string Csv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    public static void PrintToPdf(ReportsSnapshot data)
    {
        var printDialog = new PrintDialog();
        if (printDialog.ShowDialog() != true)
        {
            return;
        }

        var document = BuildDocument(data);
        document.PageWidth = printDialog.PrintableAreaWidth;
        document.ColumnWidth = printDialog.PrintableAreaWidth;

        IDocumentPaginatorSource paginatorSource = document;
        printDialog.PrintDocument(paginatorSource.DocumentPaginator, "Reports");
    }

    private static FlowDocument BuildDocument(ReportsSnapshot data)
    {
        var document = new FlowDocument
        {
            FontFamily = new FontFamily("Consolas"),
            FontSize = 11,
            PagePadding = new Thickness(16)
        };

        void AddLine(string text, bool bold = false)
        {
            document.Blocks.Add(new Paragraph(new Run(text))
            {
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal,
                Margin = new Thickness(0)
            });
        }

        void AddHeading(string text)
        {
            document.Blocks.Add(new Paragraph(new Run(text))
            {
                FontWeight = FontWeights.Bold,
                FontSize = 14,
                Margin = new Thickness(0, 16, 0, 6)
            });
        }

        AddLine("Store Reports", bold: true);
        AddLine($"Generated: {DateTime.Now:g}");

        AddHeading("Today Sales");
        foreach (var sale in data.TodaySales)
        {
            AddLine($"{sale.SaleDate:t}  {sale.InvoiceNumber,-12}{sale.CustomerName,-24}{sale.TotalAmount,10:C}");
        }

        AddLine($"Total: {data.TodaySalesTotal:C}", bold: true);

        AddHeading("Profit (Today)");
        AddLine($"Revenue: {data.TodayRevenue:C}   Cost: {data.TodayCost:C}   Profit: {data.TodayProfit:C}");

        AddHeading("Stock");
        foreach (var product in data.StockLevels)
        {
            AddLine($"{product.Name,-28}{product.StockQuantity,8}   (reorder at {product.ReorderLevel})");
        }

        AddHeading("Low Stock");
        foreach (var product in data.LowStockProducts)
        {
            AddLine($"{product.Name,-28}{product.StockQuantity,8}   (reorder at {product.ReorderLevel})");
        }

        AddHeading("Customer Balance");
        foreach (var customer in data.CustomerBalances)
        {
            AddLine($"{customer.Name,-28}{customer.CurrentBalance,12:C}");
        }

        AddHeading("Supplier Balance");
        foreach (var supplier in data.SupplierBalances)
        {
            AddLine($"{supplier.Name,-28}{supplier.CurrentBalance,12:C}");
        }

        AddHeading("Expenses");
        foreach (var expense in data.Expenses)
        {
            AddLine($"{expense.ExpenseDate:d}  {expense.Category,-16}{expense.Amount,10:C}");
        }

        AddLine($"Total: {data.TotalExpenses:C}", bold: true);

        return document;
    }
}
