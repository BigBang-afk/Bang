using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>Small popup used when adding a stock item to the invoice cart: lets the cashier
/// confirm/adjust the weight, rate, making charge and stone value that were pre-filled from
/// the selected stock item before it is added as an <see cref="InvoiceLineRequest"/>.</summary>
public class InvoiceLineEditForm : Form
{
    private readonly Guna2TextBox _txtGrossWeight;
    private readonly Guna2TextBox _txtStoneWeight;
    private readonly Guna2TextBox _txtRate;
    private readonly Guna2TextBox _txtMakingCharge;
    private readonly Guna2TextBox _txtStoneValue;
    private readonly Guna2TextBox _txtQuantity;

    public InvoiceLineRequest Line { get; }

    public InvoiceLineEditForm(string itemName, InvoiceLineRequest line)
    {
        Line = line;

        Text = $"Add: {itemName}";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(360, 420);
        Font = new Font("Segoe UI", 9.5f);

        int y = 20;
        _txtGrossWeight = AddField("Gross Weight (g)", line.GrossWeight.ToString("0.000"), ref y);
        _txtStoneWeight = AddField("Stone Weight (g)", line.StoneWeight.ToString("0.000"), ref y);
        _txtRate = AddField("Rate (per gram)", line.Rate.ToString("0.00"), ref y);
        _txtMakingCharge = AddField("Making Charge", line.MakingCharge.ToString("0.00"), ref y);
        _txtStoneValue = AddField("Stone Value", line.StoneValue.ToString("0.00"), ref y);
        _txtQuantity = AddField("Quantity", line.Quantity.ToString(), ref y);

        var btnOk = new Guna2Button
        {
            Text = "ADD TO CART", Location = new Point(60, y + 16), Size = new Size(240, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        btnOk.Click += (_, _) => ApplyValues();
        Controls.Add(btnOk);
        AcceptButton = btnOk;
        ClientSize = new Size(360, y + 76);
    }

    private Guna2TextBox AddField(string label, string value, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(20, y + 18), Size = new Size(320, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = value
        };
        textBox.FocusedState.BorderColor = ThemeColors.GoldPrimary;
        Controls.Add(textBox);
        y += 56;
        return textBox;
    }

    private void ApplyValues()
    {
        Line.GrossWeight = Parse(_txtGrossWeight.Text);
        Line.StoneWeight = Parse(_txtStoneWeight.Text);
        Line.Rate = Parse(_txtRate.Text);
        Line.MakingCharge = Parse(_txtMakingCharge.Text);
        Line.StoneValue = Parse(_txtStoneValue.Text);
        Line.Quantity = int.TryParse(_txtQuantity.Text, out var qty) && qty > 0 ? qty : 1;
    }

    private static decimal Parse(string text) => decimal.TryParse(text, out var value) ? value : 0;
}
