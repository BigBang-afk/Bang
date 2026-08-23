using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using ZarghoonJewellers.App.Helpers;
using ZarghoonJewellers.App.Models;

namespace ZarghoonJewellers.App.Services
{
    /// <summary>Builds professional, print-ready A4 FlowDocuments for the Karigar Ledger and Reports
    /// screens, and sends them to the Windows print dialog. Choosing the "Microsoft Print to PDF"
    /// printer in that dialog is how users export a report to PDF - no extra library required.</summary>
    public class ReportPrintService
    {
        private static readonly SolidColorBrush TextBrush = new(Color.FromRgb(0x2B, 0x26, 0x20));
        private static readonly SolidColorBrush MutedBrush = new(Color.FromRgb(0x7A, 0x73, 0x64));
        private static readonly SolidColorBrush HeaderBg = new(Color.FromRgb(0x24, 0x1E, 0x14));
        private static readonly SolidColorBrush AltRowBg = new(Color.FromRgb(0xFA, 0xF8, 0xF2));
        private static readonly SolidColorBrush BorderColor = new(Color.FromRgb(0xC9, 0xC2, 0xAC));

        public bool PrintDocument(FlowDocument document, string title)
        {
            var printDialog = new PrintDialog();
            if (printDialog.ShowDialog() != true)
                return false;

            document.PageHeight = printDialog.PrintableAreaHeight;
            document.PageWidth = printDialog.PrintableAreaWidth;
            document.PagePadding = new Thickness(36);
            document.ColumnWidth = printDialog.PrintableAreaWidth;
            document.FontFamily = new FontFamily("Segoe UI");

            IDocumentPaginatorSource paginatorSource = document;
            printDialog.PrintDocument(paginatorSource.DocumentPaginator, title);
            return true;
        }

        public FlowDocument BuildKarigarLedgerDocument(
            AppSettings settings,
            Karigar karigar,
            DateTime? from,
            DateTime? to,
            KarigarSummary summary,
            List<LedgerEntry> entries)
        {
            var doc = NewDocument();

            AddShopHeader(doc, settings);
            AddDivider(doc);

            doc.Blocks.Add(Title("Karigar Ledger Report", 17));
            doc.Blocks.Add(KeyValueLine("Karigar", karigar.Name, "Date Range", DateRangeText(from, to)));
            if (!string.IsNullOrWhiteSpace(karigar.Mobile))
                doc.Blocks.Add(KeyValueLine("Mobile", karigar.Mobile, "Printed On", DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt")));

            doc.Blocks.Add(BuildSummaryTable(summary));

            doc.Blocks.Add(Title("Transaction Details", 13));
            doc.Blocks.Add(BuildLedgerTable(entries));

            doc.Blocks.Add(BuildFinalBalanceParagraph(summary));

            AddDivider(doc);
            AddFooter(doc, settings);

            return doc;
        }

        public FlowDocument BuildKarigarsReportDocument(
            AppSettings settings,
            DateTime? from,
            DateTime? to,
            List<KarigarSummary> summaries)
        {
            var doc = NewDocument();

            AddShopHeader(doc, settings);
            AddDivider(doc);

            doc.Blocks.Add(Title("Karigar Reports - All Karigars", 17));
            doc.Blocks.Add(KeyValueLine("Date Range", DateRangeText(from, to), "Printed On", DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt")));
            doc.Blocks.Add(KeyValueLine("Total Karigars", summaries.Count.ToString(CultureInfo.InvariantCulture), "", ""));

            doc.Blocks.Add(BuildKarigarsTable(summaries));

            AddDivider(doc);
            AddFooter(doc, settings);

            return doc;
        }

        // ===================== building blocks =====================

        private static FlowDocument NewDocument()
        {
            return new FlowDocument
            {
                FontFamily = new FontFamily("Segoe UI"),
                FontSize = 12,
                Foreground = TextBrush,
                TextAlignment = TextAlignment.Left,
            };
        }

        private static void AddShopHeader(FlowDocument doc, AppSettings settings)
        {
            var shopName = new Paragraph(new Run(settings.ShopName?.ToUpperInvariant() ?? "ZARGHOON JEWELLERS"))
            {
                FontSize = 24,
                FontWeight = FontWeights.Bold,
                TextAlignment = TextAlignment.Center,
                Margin = new Thickness(0, 0, 0, 2),
            };
            doc.Blocks.Add(shopName);

            var addressLine = string.Join("   |   ", new[] { settings.ShopAddress, settings.PhoneNumber }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(addressLine))
            {
                doc.Blocks.Add(new Paragraph(new Run(addressLine))
                {
                    FontSize = 11,
                    Foreground = MutedBrush,
                    TextAlignment = TextAlignment.Center,
                    Margin = new Thickness(0, 0, 0, 2),
                });
            }

            if (!string.IsNullOrWhiteSpace(settings.ReportHeader))
            {
                doc.Blocks.Add(new Paragraph(new Run(settings.ReportHeader))
                {
                    FontSize = 10,
                    FontStyle = FontStyles.Italic,
                    Foreground = MutedBrush,
                    TextAlignment = TextAlignment.Center,
                });
            }
        }

        private static void AddFooter(FlowDocument doc, AppSettings settings)
        {
            if (!string.IsNullOrWhiteSpace(settings.ReportFooter))
            {
                doc.Blocks.Add(new Paragraph(new Run(settings.ReportFooter))
                {
                    FontSize = 10,
                    FontStyle = FontStyles.Italic,
                    Foreground = MutedBrush,
                    TextAlignment = TextAlignment.Center,
                    Margin = new Thickness(0, 8, 0, 0),
                });
            }
        }

        private static void AddDivider(FlowDocument doc)
        {
            var border = new Border
            {
                BorderBrush = BorderColor,
                BorderThickness = new Thickness(0, 1, 0, 0),
                Margin = new Thickness(0, 6, 0, 10),
            };
            doc.Blocks.Add(new BlockUIContainer(border));
        }

        private static Paragraph Title(string text, double size)
        {
            return new Paragraph(new Run(text))
            {
                FontSize = size,
                FontWeight = FontWeights.Bold,
                Margin = new Thickness(0, 6, 0, 8),
            };
        }

        private static Paragraph KeyValueLine(string label1, string value1, string label2, string value2)
        {
            var p = new Paragraph { Margin = new Thickness(0, 0, 0, 4), FontSize = 11 };
            p.Inlines.Add(new Run(label1 + ": ") { FontWeight = FontWeights.SemiBold });
            p.Inlines.Add(new Run(value1));
            if (!string.IsNullOrEmpty(label2))
            {
                p.Inlines.Add(new Run("      "));
                p.Inlines.Add(new Run(label2 + ": ") { FontWeight = FontWeights.SemiBold });
                p.Inlines.Add(new Run(value2));
            }
            return p;
        }

        private static string DateRangeText(DateTime? from, DateTime? to)
        {
            if (from == null && to == null) return "All Time";
            string f = from?.ToString("dd-MMM-yyyy") ?? "Beginning";
            string t = to?.ToString("dd-MMM-yyyy") ?? "Today";
            return $"{f}  to  {t}";
        }

        private static Table BuildSummaryTable(KarigarSummary s)
        {
            var table = NewTable(new[] { 1.0, 1.0, 1.0, 1.0 });
            var group = new TableRowGroup();
            table.RowGroups.Add(group);

            var labelsRow = new TableRow();
            labelsRow.Cells.Add(SummaryHeaderCell("Gold Payable"));
            labelsRow.Cells.Add(SummaryHeaderCell("Gold Receivable"));
            labelsRow.Cells.Add(SummaryHeaderCell("Cash Payable"));
            labelsRow.Cells.Add(SummaryHeaderCell("Cash Receivable"));
            group.Rows.Add(labelsRow);

            var valuesRow = new TableRow();
            valuesRow.Cells.Add(SummaryValueCell(Formatting.Gold(s.GoldPayable)));
            valuesRow.Cells.Add(SummaryValueCell(Formatting.Gold(s.GoldReceivable)));
            valuesRow.Cells.Add(SummaryValueCell(Formatting.Cash(s.CashPayable)));
            valuesRow.Cells.Add(SummaryValueCell(Formatting.Cash(s.CashReceivable)));
            group.Rows.Add(valuesRow);

            table.Margin = new Thickness(0, 0, 0, 14);
            return table;
        }

        private static TableCell SummaryHeaderCell(string text)
        {
            var cell = new TableCell(new Paragraph(new Run(text)) { FontSize = 10, FontWeight = FontWeights.SemiBold, Foreground = MutedBrush })
            {
                Padding = new Thickness(8, 6, 8, 2),
                BorderBrush = BorderColor,
                BorderThickness = new Thickness(1, 1, 1, 0),
            };
            return cell;
        }

        private static TableCell SummaryValueCell(string text)
        {
            var cell = new TableCell(new Paragraph(new Run(text)) { FontSize = 15, FontWeight = FontWeights.Bold })
            {
                Padding = new Thickness(8, 0, 8, 8),
                BorderBrush = BorderColor,
                BorderThickness = new Thickness(1, 0, 1, 1),
            };
            return cell;
        }

        private static Table BuildLedgerTable(List<LedgerEntry> entries)
        {
            var widths = new[] { 0.9, 1.1, 2.2, 0.9, 0.9, 1.0, 1.0, 1.0, 1.1, 1.6 };
            var table = NewTable(widths);
            var group = new TableRowGroup();
            table.RowGroups.Add(group);

            group.Rows.Add(HeaderRow("Date", "Type", "Description", "Gold In", "Gold Out", "Gold Bal", "Cash In", "Cash Out", "Cash Bal", "Notes"));

            bool alt = false;
            foreach (var e in entries)
            {
                var row = new TableRow { Background = alt ? AltRowBg : Brushes.White };
                alt = !alt;

                row.Cells.Add(BodyCell(e.Date.ToString("dd-MMM-yy")));
                row.Cells.Add(BodyCell(e.TransactionType));
                row.Cells.Add(BodyCell(e.Description));
                row.Cells.Add(BodyCell(e.GoldIn > 0 ? Formatting.GoldPlain(e.GoldIn) : "-", TextAlignment.Right));
                row.Cells.Add(BodyCell(e.GoldOut > 0 ? Formatting.GoldPlain(e.GoldOut) : "-", TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.GoldPlain(e.GoldBalance), TextAlignment.Right));
                row.Cells.Add(BodyCell(e.CashIn > 0 ? Formatting.Cash(e.CashIn) : "-", TextAlignment.Right));
                row.Cells.Add(BodyCell(e.CashOut > 0 ? Formatting.Cash(e.CashOut) : "-", TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.Cash(e.CashBalance), TextAlignment.Right));
                row.Cells.Add(BodyCell(e.Notes));

                group.Rows.Add(row);
            }

            if (entries.Count == 0)
            {
                var row = new TableRow();
                var cell = new TableCell(new Paragraph(new Run("No transactions found for the selected date range.")) { FontSize = 10, FontStyle = FontStyles.Italic, Foreground = MutedBrush })
                {
                    ColumnSpan = 10,
                    Padding = new Thickness(8),
                    BorderBrush = BorderColor,
                    BorderThickness = new Thickness(1),
                };
                row.Cells.Add(cell);
                group.Rows.Add(row);
            }

            return table;
        }

        private static Table BuildKarigarsTable(List<KarigarSummary> summaries)
        {
            var widths = new[] { 2.0, 1.2, 1.2, 1.1, 1.2, 1.2, 1.1 };
            var table = NewTable(widths);
            var group = new TableRowGroup();
            table.RowGroups.Add(group);

            group.Rows.Add(HeaderRow("Karigar Name", "Gold Payable", "Gold Receivable", "Net Gold", "Cash Payable", "Cash Receivable", "Net Cash"));

            bool alt = false;
            decimal totalGoldPayable = 0, totalGoldReceivable = 0, totalNetGold = 0;
            decimal totalCashPayable = 0, totalCashReceivable = 0, totalNetCash = 0;

            foreach (var s in summaries)
            {
                var row = new TableRow { Background = alt ? AltRowBg : Brushes.White };
                alt = !alt;

                row.Cells.Add(BodyCell(s.KarigarName));
                row.Cells.Add(BodyCell(Formatting.GoldPlain(s.GoldPayable), TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.GoldPlain(s.GoldReceivable), TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.GoldPlain(s.NetGoldBalance), TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.Cash(s.CashPayable), TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.Cash(s.CashReceivable), TextAlignment.Right));
                row.Cells.Add(BodyCell(Formatting.Cash(s.NetCashBalance), TextAlignment.Right));

                group.Rows.Add(row);

                totalGoldPayable += s.GoldPayable;
                totalGoldReceivable += s.GoldReceivable;
                totalNetGold += s.NetGoldBalance;
                totalCashPayable += s.CashPayable;
                totalCashReceivable += s.CashReceivable;
                totalNetCash += s.NetCashBalance;
            }

            var totalsRow = new TableRow { Background = new SolidColorBrush(Color.FromRgb(0xF0, 0xE9, 0xD2)) };
            totalsRow.Cells.Add(BodyCell("GRAND TOTAL", TextAlignment.Left, true));
            totalsRow.Cells.Add(BodyCell(Formatting.GoldPlain(totalGoldPayable), TextAlignment.Right, true));
            totalsRow.Cells.Add(BodyCell(Formatting.GoldPlain(totalGoldReceivable), TextAlignment.Right, true));
            totalsRow.Cells.Add(BodyCell(Formatting.GoldPlain(totalNetGold), TextAlignment.Right, true));
            totalsRow.Cells.Add(BodyCell(Formatting.Cash(totalCashPayable), TextAlignment.Right, true));
            totalsRow.Cells.Add(BodyCell(Formatting.Cash(totalCashReceivable), TextAlignment.Right, true));
            totalsRow.Cells.Add(BodyCell(Formatting.Cash(totalNetCash), TextAlignment.Right, true));
            group.Rows.Add(totalsRow);

            return table;
        }

        private static Paragraph BuildFinalBalanceParagraph(KarigarSummary s)
        {
            string goldLabel = s.NetGoldBalance >= 0 ? "Receivable (Karigar owes Shop)" : "Payable (Shop owes Karigar)";
            string cashLabel = s.NetCashBalance >= 0 ? "Receivable (Karigar owes Shop)" : "Payable (Shop owes Karigar)";

            var p = new Paragraph { Margin = new Thickness(0, 12, 0, 0), FontSize = 12 };
            p.Inlines.Add(new Run("Final Gold Balance: ") { FontWeight = FontWeights.Bold });
            p.Inlines.Add(new Run($"{Formatting.Gold(Math.Abs(s.NetGoldBalance))} - {goldLabel}"));
            p.Inlines.Add(new LineBreak());
            p.Inlines.Add(new Run("Final Cash Balance: ") { FontWeight = FontWeights.Bold });
            p.Inlines.Add(new Run($"{Formatting.Cash(Math.Abs(s.NetCashBalance))} - {cashLabel}"));
            return p;
        }

        private static TableRow HeaderRow(params string[] headers)
        {
            var row = new TableRow { Background = HeaderBg };
            foreach (var h in headers)
            {
                row.Cells.Add(new TableCell(new Paragraph(new Run(h)) { FontSize = 9.5, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White })
                {
                    Padding = new Thickness(6, 5, 6, 5),
                    BorderBrush = BorderColor,
                    BorderThickness = new Thickness(0.5),
                });
            }
            return row;
        }

        private static TableCell BodyCell(string text, TextAlignment align = TextAlignment.Left, bool bold = false)
        {
            return new TableCell(new Paragraph(new Run(text ?? string.Empty))
            {
                FontSize = 9.5,
                TextAlignment = align,
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal,
            })
            {
                Padding = new Thickness(6, 4, 6, 4),
                BorderBrush = BorderColor,
                BorderThickness = new Thickness(0.5),
            };
        }

        private static Table NewTable(double[] proportionalWidths)
        {
            var table = new Table { CellSpacing = 0, Margin = new Thickness(0, 0, 0, 10) };
            foreach (var w in proportionalWidths)
                table.Columns.Add(new TableColumn { Width = new GridLength(w, GridUnitType.Star) });
            return table;
        }
    }
}
