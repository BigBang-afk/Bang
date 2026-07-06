using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using GeneralStorePro.Models;

namespace GeneralStorePro.Services;

public sealed record CustomerStatementData(
    string StoreName,
    string StoreAddress,
    string StorePhone,
    string CustomerName,
    string? CustomerPhone,
    DateTime PrintedAt,
    IReadOnlyList<CustomerLedgerEntry> Ledger,
    decimal CurrentBalance);

/// <summary>
/// Builds a printable customer ledger/statement and hands it to the Windows print dialog.
/// </summary>
public static class StatementPrinter
{
    public static void PrintCustomerStatement(CustomerStatementData data)
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
        printDialog.PrintDocument(paginatorSource.DocumentPaginator, $"Statement - {data.CustomerName}");
    }

    private static FlowDocument BuildDocument(CustomerStatementData data)
    {
        var document = new FlowDocument
        {
            FontFamily = new FontFamily("Consolas"),
            FontSize = 12,
            PagePadding = new Thickness(16)
        };

        void AddLine(string text, bool bold = false, TextAlignment alignment = TextAlignment.Left)
        {
            document.Blocks.Add(new Paragraph(new Run(text))
            {
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal,
                TextAlignment = alignment,
                Margin = new Thickness(0)
            });
        }

        const int ruleWidth = 78;

        AddLine(data.StoreName, bold: true, alignment: TextAlignment.Center);
        if (!string.IsNullOrWhiteSpace(data.StoreAddress))
        {
            AddLine(data.StoreAddress, alignment: TextAlignment.Center);
        }

        if (!string.IsNullOrWhiteSpace(data.StorePhone))
        {
            AddLine(data.StorePhone, alignment: TextAlignment.Center);
        }

        AddLine(new string('-', ruleWidth));
        AddLine("Customer Statement", bold: true);
        AddLine($"Customer: {data.CustomerName}");
        if (!string.IsNullOrWhiteSpace(data.CustomerPhone))
        {
            AddLine($"Phone:    {data.CustomerPhone}");
        }

        AddLine($"Printed:  {data.PrintedAt:g}");
        AddLine(new string('-', ruleWidth));

        AddLine(
            "Date".PadRight(12) +
            "Type".PadRight(16) +
            "Reference".PadRight(12) +
            "Debit".PadLeft(10) +
            "Credit".PadLeft(10) +
            "Balance".PadLeft(12),
            bold: true);
        AddLine(new string('-', ruleWidth));

        foreach (var entry in data.Ledger)
        {
            var dateText = entry.Date == DateTime.MinValue ? string.Empty : entry.Date.ToString("d");
            var debitText = entry.Debit == 0 ? string.Empty : entry.Debit.ToString("C");
            var creditText = entry.Credit == 0 ? string.Empty : entry.Credit.ToString("C");

            AddLine(
                dateText.PadRight(12) +
                entry.Type.PadRight(16) +
                entry.Reference.PadRight(12) +
                debitText.PadLeft(10) +
                creditText.PadLeft(10) +
                entry.RunningBalance.ToString("C").PadLeft(12));
        }

        AddLine(new string('-', ruleWidth));
        AddLine($"Current Balance: {data.CurrentBalance:C}", bold: true, alignment: TextAlignment.Right);

        return document;
    }
}
