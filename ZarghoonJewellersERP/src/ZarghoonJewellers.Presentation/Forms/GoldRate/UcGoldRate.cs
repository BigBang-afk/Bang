using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.GoldRate;

/// <summary>Daily gold/USD rate entry screen. Only one rate row exists per calendar day -
/// saving today updates the existing row in place (see <see cref="IGoldRateService.SetTodaysRateAsync"/>).</summary>
public class UcGoldRate : UserControl, IAsyncLoadable
{
    private readonly IGoldRateService _goldRateService;
    private readonly CurrentSession _session;

    private readonly Guna2TextBox _txt24K;
    private readonly Guna2TextBox _txt22K;
    private readonly Guna2TextBox _txt21K;
    private readonly Guna2TextBox _txt18K;
    private readonly Guna2TextBox _txtUsdOunce;
    private readonly Guna2TextBox _txtUsdPkr;
    private readonly DataGridView _gridHistory;

    public UcGoldRate(IGoldRateService goldRateService, CurrentSession session)
    {
        _goldRateService = goldRateService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Daily Gold Rate", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlEntry = new Guna2Panel { Dock = DockStyle.Top, Height = 160, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        _txt24K = AddField(pnlEntry, "24K (per gram)", 16);
        _txt22K = AddField(pnlEntry, "22K (per gram)", 190);
        _txt21K = AddField(pnlEntry, "21K (per gram)", 364);
        _txt18K = AddField(pnlEntry, "18K (per gram)", 538);
        _txtUsdOunce = AddField(pnlEntry, "USD per Ounce", 16, secondRow: true);
        _txtUsdPkr = AddField(pnlEntry, "USD to PKR", 190, secondRow: true);

        var btnSave = new Guna2Button
        {
            Text = "SAVE TODAY'S RATE", Location = new Point(538, 96), Size = new Size(200, 40),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold)
        };
        btnSave.Click += async (_, _) => await SaveAsync();
        pnlEntry.Controls.Add(btnSave);

        var lblHistoryTitle = new Label { Text = "RATE HISTORY", Dock = DockStyle.Top, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _gridHistory = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _gridHistory.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridHistory.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridHistory.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridHistory.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridHistory.Columns.Add("Date", "Date");
        _gridHistory.Columns.Add("R24K", "24K");
        _gridHistory.Columns.Add("R22K", "22K");
        _gridHistory.Columns.Add("R21K", "21K");
        _gridHistory.Columns.Add("R18K", "18K");
        _gridHistory.Columns.Add("Usd", "USD/PKR");

        Controls.Add(_gridHistory);
        Controls.Add(lblHistoryTitle);
        Controls.Add(pnlEntry);
        Controls.Add(titleLabel);
    }

    private static Guna2TextBox AddField(Guna2Panel parent, string label, int x, bool secondRow = false)
    {
        int y = secondRow ? 60 : 8;
        parent.Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(x, y + 18), Size = new Size(160, 34),
            FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = "0"
        };
        parent.Controls.Add(textBox);
        return textBox;
    }

    public async Task LoadAsync()
    {
        var latest = await _goldRateService.GetLatestAsync();
        if (latest is not null)
        {
            _txt24K.Text = latest.Rate24K.ToString("0.00");
            _txt22K.Text = latest.Rate22K.ToString("0.00");
            _txt21K.Text = latest.Rate21K.ToString("0.00");
            _txt18K.Text = latest.Rate18K.ToString("0.00");
            _txtUsdOunce.Text = latest.UsdPerOunce.ToString("0.00");
            _txtUsdPkr.Text = latest.UsdToPkr.ToString("0.0000");
        }

        var history = await _goldRateService.GetHistoryAsync();
        _gridHistory.Rows.Clear();
        foreach (var rate in history)
            _gridHistory.Rows.Add(rate.RateDate.ToString("d"), rate.Rate24K.ToString("N0"), rate.Rate22K.ToString("N0"), rate.Rate21K.ToString("N0"), rate.Rate18K.ToString("N0"), rate.UsdToPkr.ToString("N2"));
    }

    private async Task SaveAsync()
    {
        try
        {
            await _goldRateService.SetTodaysRateAsync(
                Parse(_txt24K.Text), Parse(_txt22K.Text), Parse(_txt21K.Text), Parse(_txt18K.Text),
                Parse(_txtUsdOunce.Text), Parse(_txtUsdPkr.Text), _session.UserId);

            MessageBox.Show(this, "Today's gold rate has been saved.", "Gold Rate", MessageBoxButtons.OK, MessageBoxIcon.Information);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private static decimal Parse(string text) => decimal.TryParse(text, out var value) ? value : 0;
}
