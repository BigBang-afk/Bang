using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Ledgers;

/// <summary>Cash position screen: current balance, a form to post a free-standing manual
/// receipt/payment, and the running transaction history (invoices/purchases post here too).</summary>
public class UcCashLedger : UserControl, IAsyncLoadable
{
    private readonly ICashLedgerService _cashLedgerService;
    private readonly CurrentSession _session;

    private readonly Label _lblBalance;
    private readonly Guna2ComboBox _cmbType;
    private readonly Guna2TextBox _txtAmount;
    private readonly Guna2ComboBox _cmbPaymentMode;
    private readonly Guna2TextBox _txtDescription;
    private readonly DataGridView _grid;

    public UcCashLedger(ICashLedgerService cashLedgerService, CurrentSession session)
    {
        _cashLedgerService = cashLedgerService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Cash Ledger", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlEntry = new Guna2Panel { Dock = DockStyle.Top, Height = 110, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        pnlEntry.Controls.Add(new Label { Text = "CASH IN HAND", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(16, 8), AutoSize = true });
        _lblBalance = new Label { Text = "—", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 18F, FontStyle.Bold), Location = new Point(16, 26), AutoSize = true };
        pnlEntry.Controls.Add(_lblBalance);

        pnlEntry.Controls.Add(new Label { Text = "TYPE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(230, 8), AutoSize = true });
        _cmbType = new Guna2ComboBox { Location = new Point(230, 26), Size = new Size(110, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbType.DataSource = new[] { "Receipt", "Payment" };
        pnlEntry.Controls.Add(_cmbType);

        pnlEntry.Controls.Add(new Label { Text = "AMOUNT", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(354, 8), AutoSize = true });
        _txtAmount = new Guna2TextBox { Location = new Point(354, 26), Size = new Size(120, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = "0" };
        pnlEntry.Controls.Add(_txtAmount);

        pnlEntry.Controls.Add(new Label { Text = "PAYMENT MODE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(488, 8), AutoSize = true });
        _cmbPaymentMode = new Guna2ComboBox { Location = new Point(488, 26), Size = new Size(120, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbPaymentMode.DataSource = new[] { "Cash", "Bank", "Cheque" };
        pnlEntry.Controls.Add(_cmbPaymentMode);

        pnlEntry.Controls.Add(new Label { Text = "DESCRIPTION", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(622, 8), AutoSize = true });
        _txtDescription = new Guna2TextBox { Location = new Point(622, 26), Size = new Size(220, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        pnlEntry.Controls.Add(_txtDescription);

        var btnPost = new Guna2Button
        {
            Text = "POST ENTRY", Location = new Point(860, 24), Size = new Size(140, 38),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold)
        };
        btnPost.Click += async (_, _) => await PostEntryAsync();
        pnlEntry.Controls.Add(btnPost);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("Date", "Date");
        _grid.Columns.Add("Type", "Type");
        _grid.Columns.Add("Reference", "Reference");
        _grid.Columns.Add("Amount", "Amount");
        _grid.Columns.Add("Mode", "Mode");
        _grid.Columns.Add("Balance", "Running Balance");
        _grid.Columns.Add("Description", "Description");

        Controls.Add(_grid);
        Controls.Add(pnlEntry);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        var balance = await _cashLedgerService.GetCurrentBalanceAsync();
        _lblBalance.Text = balance.ToString("C0");

        var recent = await _cashLedgerService.GetRecentAsync(100);
        _grid.Rows.Clear();
        foreach (var entry in recent)
            _grid.Rows.Add(entry.TransactionDate.ToString("g"), entry.TransactionType, entry.ReferenceType,
                entry.Amount.ToString("N0"), entry.PaymentMode, entry.RunningBalance.ToString("N0"), entry.Description);
    }

    private async Task PostEntryAsync()
    {
        var amount = decimal.TryParse(_txtAmount.Text, out var a) ? a : 0;
        if (amount <= 0)
        {
            MessageBox.Show(this, "Enter a valid amount.", "Cash Ledger", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            await _cashLedgerService.PostManualEntryAsync(
                _cmbType.SelectedItem?.ToString() ?? "Receipt", amount,
                _cmbPaymentMode.SelectedItem?.ToString() ?? "Cash", null,
                _txtDescription.Text.Trim(), _session.UserId);

            _txtAmount.Text = "0";
            _txtDescription.Text = string.Empty;
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not post entry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
