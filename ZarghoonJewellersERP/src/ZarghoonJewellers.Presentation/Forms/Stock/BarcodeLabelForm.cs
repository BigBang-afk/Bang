using System.Drawing.Printing;
using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>Shows a Code128 barcode and a QR code for one stock item, either of which can be
/// printed as a small jewelry tag label via the standard Windows print dialog.</summary>
public class BarcodeLabelForm : Form
{
    private readonly string _itemName;
    private readonly string _itemCode;
    private readonly string _barcodeValue;
    private readonly PictureBox _picBarcode;
    private readonly PictureBox _picQr;

    public BarcodeLabelForm(string itemName, string itemCode, string barcodeValue)
    {
        _itemName = itemName;
        _itemCode = itemCode;
        _barcodeValue = barcodeValue;

        Text = "Barcode / QR Label";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(420, 420);
        Font = new Font("Segoe UI", 9.5f);

        var lblItem = new Label { Text = $"{itemName}  ({itemCode})", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI Semibold", 11F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true };
        Controls.Add(lblItem);

        _picBarcode = new PictureBox { Location = new Point(20, 60), Size = new Size(380, 120), SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
        _picBarcode.Image = BarcodeHelper.GenerateBarcode(barcodeValue, "Code128", 380, 120);
        Controls.Add(_picBarcode);

        _picQr = new PictureBox { Location = new Point(140, 200), Size = new Size(140, 140), SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
        _picQr.Image = BarcodeHelper.GenerateBarcode(barcodeValue, "QR", 140, 140);
        Controls.Add(_picQr);

        var btnPrintBarcode = new Guna2Button
        {
            Text = "PRINT BARCODE LABEL", Location = new Point(20, 360), Size = new Size(180, 40),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        btnPrintBarcode.Click += (_, _) => Print(_picBarcode);

        var btnPrintQr = new Guna2Button
        {
            Text = "PRINT QR LABEL", Location = new Point(210, 360), Size = new Size(190, 40),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold)
        };
        btnPrintQr.Click += (_, _) => Print(_picQr);

        Controls.Add(btnPrintBarcode);
        Controls.Add(btnPrintQr);
    }

    private void Print(PictureBox source)
    {
        var document = new PrintDocument();
        document.PrintPage += (_, e) =>
        {
            var graphics = e.Graphics!;
            var bounds = e.MarginBounds;
            using var titleFont = new Font("Segoe UI", 10, FontStyle.Bold);
            graphics.DrawString($"{_itemName} ({_itemCode})", titleFont, Brushes.Black, bounds.Left, bounds.Top);

            if (source.Image is not null)
                graphics.DrawImage(source.Image, bounds.Left, bounds.Top + 24, 250, source == _picBarcode ? 90 : 250);
        };

        using var preview = new PrintPreviewDialog { Document = document, Width = 700, Height = 600 };
        preview.ShowDialog(this);
    }
}
