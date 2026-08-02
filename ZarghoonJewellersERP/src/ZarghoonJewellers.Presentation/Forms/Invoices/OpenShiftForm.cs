using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>Opens a new till session for the current cashier with a starting cash float.</summary>
public class OpenShiftForm : Form
{
    private readonly IShiftService _shiftService;
    private readonly int _cashierUserId;
    private readonly Guna2TextBox _txtOpeningCash;

    public Shift? OpenedShift { get; private set; }

    public OpenShiftForm(IShiftService shiftService, int cashierUserId)
    {
        _shiftService = shiftService;
        _cashierUserId = cashierUserId;

        Text = "Open Shift";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(340, 180);
        Font = new Font("Segoe UI", 9.5f);

        Controls.Add(new Label { Text = "OPENING CASH FLOAT", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 20), AutoSize = true });
        _txtOpeningCash = new Guna2TextBox { Text = "0", Location = new Point(20, 40), Size = new Size(300, 38), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        Controls.Add(_txtOpeningCash);

        var btnOpen = new Guna2Button
        {
            Text = "OPEN SHIFT", Location = new Point(20, 100), Size = new Size(300, 44),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10.5F, FontStyle.Bold)
        };
        btnOpen.Click += async (_, _) => await OpenAsync();
        Controls.Add(btnOpen);
        AcceptButton = btnOpen;
    }

    private async Task OpenAsync()
    {
        var openingCash = decimal.TryParse(_txtOpeningCash.Text, out var v) ? v : 0;

        try
        {
            OpenedShift = await _shiftService.OpenShiftAsync(_cashierUserId, openingCash);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not open shift", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
