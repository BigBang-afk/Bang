using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;

namespace GeneralStorePro.Services;

public sealed record ReceiptLine(string ProductName, double Quantity, decimal UnitPrice, decimal LineTotal);

public sealed record ReceiptData(
    string StoreName,
    string StoreAddress,
    string StorePhone,
    string InvoiceNumber,
    DateTime SaleDate,
    string CashierName,
    string? CustomerName,
    IReadOnlyList<ReceiptLine> Items,
    decimal SubTotal,
    decimal Discount,
    decimal Total,
    decimal PaidAmount,
    decimal DueAmount,
    string PaymentMethod);

/// <summary>
/// Builds a printable receipt and hands it to the Windows print dialog.
/// </summary>
public static class ReceiptPrinter
{
    public static void Print(ReceiptData data)
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
        printDialog.PrintDocument(paginatorSource.DocumentPaginator, $"Receipt {data.InvoiceNumber}");
    }

    private static FlowDocument BuildDocument(ReceiptData data)
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

        const int ruleWidth = 42;
        const int labelWidth = 30;

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
        AddLine($"Invoice:  {data.InvoiceNumber}");
        AddLine($"Date:     {data.SaleDate:g}");
        AddLine($"Cashier:  {data.CashierName}");
        if (!string.IsNullOrWhiteSpace(data.CustomerName))
        {
            AddLine($"Customer: {data.CustomerName}");
        }

        AddLine(new string('-', ruleWidth));

        foreach (var item in data.Items)
        {
            AddLine(item.ProductName);
            var qtyPrice = $"  {item.Quantity} x {item.UnitPrice:C}";
            var total = item.LineTotal.ToString("C");
            AddLine(qtyPrice.PadRight(labelWidth) + total.PadLeft(ruleWidth - labelWidth));
        }

        AddLine(new string('-', ruleWidth));
        AddLine("Subtotal:".PadRight(labelWidth) + data.SubTotal.ToString("C").PadLeft(ruleWidth - labelWidth));
        AddLine("Discount:".PadRight(labelWidth) + data.Discount.ToString("C").PadLeft(ruleWidth - labelWidth));
        AddLine("Total:".PadRight(labelWidth) + data.Total.ToString("C").PadLeft(ruleWidth - labelWidth), bold: true);
        AddLine($"Paid ({data.PaymentMethod}):".PadRight(labelWidth) + data.PaidAmount.ToString("C").PadLeft(ruleWidth - labelWidth));
        AddLine("Due:".PadRight(labelWidth) + data.DueAmount.ToString("C").PadLeft(ruleWidth - labelWidth));
        AddLine(new string('-', ruleWidth));
        AddLine("Thank you for shopping with us!", alignment: TextAlignment.Center);

        return document;
    }
}
