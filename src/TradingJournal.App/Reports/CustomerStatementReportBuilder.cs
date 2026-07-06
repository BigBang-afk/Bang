using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using TradingJournal.App.ViewModels;
using TradingJournal.Core.Models;

namespace TradingJournal.App.Reports;

/// <summary>
/// Builds a printable FlowDocument statement for a single customer's ledger entries.
/// </summary>
public static class CustomerStatementReportBuilder
{
    public static FlowDocument Build(
        Customer customer,
        IReadOnlyList<LedgerEntryRow> rows,
        decimal totalProfitPkr,
        decimal totalLossPkr,
        decimal netPkr,
        decimal netGold,
        string goldUnitLabel)
    {
        var doc = new FlowDocument
        {
            FontFamily = new FontFamily("Segoe UI"),
            FontSize = 12,
            PagePadding = new Thickness(40),
            ColumnWidth = double.PositiveInfinity
        };

        doc.Blocks.Add(new Paragraph(new Run("Trading Journal — Customer Statement"))
        {
            FontSize = 20,
            FontWeight = FontWeights.Bold,
            Margin = new Thickness(0, 0, 0, 4)
        });

        var infoParagraph = new Paragraph { Margin = new Thickness(0, 0, 0, 16), FontSize = 12 };
        infoParagraph.Inlines.Add(new Bold(new Run($"Customer: {customer.Name}")));
        if (!string.IsNullOrWhiteSpace(customer.Phone))
            infoParagraph.Inlines.Add(new Run($"    Phone: {customer.Phone}"));
        infoParagraph.Inlines.Add(new LineBreak());
        infoParagraph.Inlines.Add(new Run($"Generated: {DateTime.Now:dd-MMM-yyyy HH:mm}"));
        doc.Blocks.Add(infoParagraph);

        doc.Blocks.Add(BuildEntriesTable(rows));

        var totals = new Paragraph { Margin = new Thickness(0, 16, 0, 0), FontSize = 12 };
        totals.Inlines.Add(new Bold(new Run("Total Profit (PKR): ")));
        totals.Inlines.Add(new Run($"Rs {totalProfitPkr:N2}"));
        totals.Inlines.Add(new LineBreak());
        totals.Inlines.Add(new Bold(new Run("Total Loss (PKR): ")));
        totals.Inlines.Add(new Run($"Rs {totalLossPkr:N2}"));
        totals.Inlines.Add(new LineBreak());
        totals.Inlines.Add(new Bold(new Run("Net Balance (PKR): ")));
        totals.Inlines.Add(new Run($"Rs {netPkr:N2}"));
        totals.Inlines.Add(new LineBreak());
        totals.Inlines.Add(new Bold(new Run("Net (Gold equivalent): ")));
        totals.Inlines.Add(new Run($"{netGold:N4} {goldUnitLabel}"));
        doc.Blocks.Add(totals);

        return doc;
    }

    private static Table BuildEntriesTable(IReadOnlyList<LedgerEntryRow> rows)
    {
        var table = new Table { CellSpacing = 0 };

        string[] headers = { "Date", "Type", "USD", "PKR", "Gold", "Running (PKR)", "Notes" };
        double[] widths = { 80, 55, 70, 90, 70, 90, 140 };

        foreach (var width in widths)
            table.Columns.Add(new TableColumn { Width = new GridLength(width) });

        var headerGroup = new TableRowGroup();
        var headerRow = new TableRow { Background = Brushes.WhiteSmoke, FontWeight = FontWeights.Bold };
        foreach (var header in headers)
            headerRow.Cells.Add(MakeCell(header));
        headerGroup.Rows.Add(headerRow);
        table.RowGroups.Add(headerGroup);

        var bodyGroup = new TableRowGroup();
        foreach (var row in rows)
        {
            var entry = row.Entry;
            var tableRow = new TableRow();
            tableRow.Cells.Add(MakeCell(entry.Date.ToString("dd-MMM-yyyy")));
            tableRow.Cells.Add(MakeCell(entry.Type.ToString()));
            tableRow.Cells.Add(MakeCell($"${entry.AmountUsd:N2}"));
            tableRow.Cells.Add(MakeCell($"Rs {entry.AmountPkr:N2}"));
            tableRow.Cells.Add(MakeCell($"{entry.AmountGold:N4}"));
            tableRow.Cells.Add(MakeCell($"Rs {row.RunningBalancePkr:N2}"));
            tableRow.Cells.Add(MakeCell(entry.Notes ?? string.Empty));
            bodyGroup.Rows.Add(tableRow);
        }

        table.RowGroups.Add(bodyGroup);
        return table;
    }

    private static TableCell MakeCell(string text)
    {
        return new TableCell(new Paragraph(new Run(text)) { Margin = new Thickness(4) })
        {
            BorderBrush = Brushes.LightGray,
            BorderThickness = new Thickness(0, 0, 0, 1)
        };
    }
}
