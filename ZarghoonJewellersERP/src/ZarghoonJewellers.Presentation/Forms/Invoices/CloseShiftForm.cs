using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// Daily/Shift Closing: the cashier counts the physical cash drawer and enters it here. The
/// expected cash (opening float + cash receipts - cash payments over the shift) and any
/// over/short difference are computed server-side by <see cref="IShiftService.CloseShiftAsync"/>
/// and shown in the confirmation summary once the shift is closed.
/// </summary>
public class CloseShiftForm : Form
{
    private readonly IShiftService _shiftService;
    private readonly int _shiftId;
    private readonly Guna2TextBox _txtCountedCash;
    private readonly Guna2TextBox _txtNotes;

    public CloseShiftForm(IShiftService shiftService, int shiftId)
    {
        _shiftService = shiftService;
        _shiftId = shiftId;

        Text = "Close Shift";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(400, 340);
        Font = new Font("Segoe UI", 9.5f);

        Controls.Add(new Label { Text = "Count the physical cash drawer and enter the total below.\nExpected cash and any difference are shown after closing.", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F), Location = new Point(20, 16), AutoSize = true });

        Controls.Add(new Label { Text = "CASH COUNTED (physical)", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 80), AutoSize = true });
        _txtCountedCash = new Guna2TextBox { Text = "0", Location = new Point(20, 98), Size = new Size(360, 40), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Font = new Font("Segoe UI", 12F) };
        Controls.Add(_txtCountedCash);

        Controls.Add(new Label { Text = "NOTES (optional)", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 150), AutoSize = true });
        _txtNotes = new Guna2TextBox { Location = new Point(20, 168), Size = new Size(360, 60), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Multiline = true };
        Controls.Add(_txtNotes);

        var btnClose = new Guna2Button
        {
            Text = "CLOSE SHIFT", Location = new Point(20, 270), Size = new Size(360, 46),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10.5F, FontStyle.Bold)
        };
        btnClose.Click += async (_, _) => await CloseShiftAsync();
        Controls.Add(btnClose);
        AcceptButton = btnClose;
    }

    private async Task CloseShiftAsync()
    {
        var counted = decimal.TryParse(_txtCountedCash.Text, out var v) ? v : 0;

        try
        {
            var summary = await _shiftService.CloseShiftAsync(_shiftId, counted, string.IsNullOrWhiteSpace(_txtNotes.Text) ? null : _txtNotes.Text.Trim());

            MessageBox.Show(this,
                $"Shift closed.\n\nOpening Cash: {summary.OpeningCash:C0}\nCash Receipts: {summary.CashReceipts:C0}\nCash Payments: {summary.CashPayments:C0}\n" +
                $"Expected Cash: {summary.ExpectedCash:C0}\nCounted Cash: {summary.ClosingCashCounted:C0}\nDifference: {summary.CashDifference:C0}\n\n" +
                $"Invoices: {summary.InvoiceCount}\nTotal Sales: {summary.TotalSales:C0}",
                "Shift Closed", MessageBoxButtons.OK, MessageBoxIcon.Information);

            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not close shift", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
