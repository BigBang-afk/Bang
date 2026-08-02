using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Ledgers;

/// <summary>
/// Customer Statement (every customer's running position) with an "Outstanding only" toggle
/// for the Outstanding Report - who owes the shop money right now, sorted highest balance first.
/// </summary>
public class UcCustomerStatement : UserControl, IAsyncLoadable
{
    private readonly ILedgerService _ledgerService;
    private readonly Guna2CheckBox _chkOutstandingOnly;
    private readonly Label _lblTotalOutstanding;
    private readonly DataGridView _grid;

    private IReadOnlyList<CustomerStatementDto> _statements = Array.Empty<CustomerStatementDto>();

    public UcCustomerStatement(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Customer Statement / Outstanding Report", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlToolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        _chkOutstandingOnly = new Guna2CheckBox { Text = "Outstanding balances only", Location = new Point(16, 14), AutoSize = true, ForeColor = ThemeColors.TextSecondary };
        _chkOutstandingOnly.CheckedState.FillColor = ThemeColors.GoldPrimary;
        _chkOutstandingOnly.CheckedChanged += (_, _) => RefreshGrid();
        pnlToolbar.Controls.Add(_chkOutstandingOnly);

        var btnRefresh = new Guna2Button { Text = "Refresh", Location = new Point(260, 8), Size = new Size(100, 38), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnRefresh.Click += async (_, _) => await LoadAsync();
        pnlToolbar.Controls.Add(btnRefresh);

        var btnPrint = new Guna2Button { Text = "Print", Location = new Point(370, 8), Size = new Size(100, 38), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnPrint.Click += (_, _) => PrintGrid();
        pnlToolbar.Controls.Add(btnPrint);

        _lblTotalOutstanding = new Label { Text = "Total Outstanding: —", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 12F, FontStyle.Bold), Location = new Point(500, 16), AutoSize = true };
        pnlToolbar.Controls.Add(_lblTotalOutstanding);

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
        _grid.Columns.Add("Code", "Code");
        _grid.Columns.Add("Name", "Customer");
        _grid.Columns.Add("Phone", "Phone");
        _grid.Columns.Add("Opening", "Opening Balance");
        _grid.Columns.Add("Current", "Current Balance");
        _grid.Columns.Add("Gold", "Gold Balance (g)");
        _grid.Columns.Add("LastInvoice", "Last Invoice");

        Controls.Add(_grid);
        Controls.Add(pnlToolbar);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        _statements = await _ledgerService.GetCustomerStatementsAsync();
        RefreshGrid();
    }

    private void RefreshGrid()
    {
        var rows = _chkOutstandingOnly.Checked ? _statements.Where(s => s.CurrentBalance != 0).ToList() : _statements.ToList();

        _grid.Rows.Clear();
        foreach (var s in rows)
            _grid.Rows.Add(s.CustomerCode, s.FullName, s.Phone, s.OpeningBalance.ToString("N0"), s.CurrentBalance.ToString("N0"),
                s.CurrentGoldBalance.ToString("N2"), s.LastInvoiceDate?.ToString("d") ?? "—");

        _lblTotalOutstanding.Text = $"Total Outstanding: {rows.Sum(s => s.CurrentBalance):C0}";
    }

    private void PrintGrid()
    {
        var rows = _chkOutstandingOnly.Checked ? _statements.Where(s => s.CurrentBalance != 0).ToList() : _statements.ToList();
        var headers = new List<string> { "Code", "Customer", "Phone", "Opening Balance", "Current Balance", "Gold Balance (g)", "Last Invoice" };
        var tableRows = rows.Select(s => new[]
        {
            s.CustomerCode, s.FullName, s.Phone ?? string.Empty, s.OpeningBalance.ToString("N0"), s.CurrentBalance.ToString("N0"),
            s.CurrentGoldBalance.ToString("N2"), s.LastInvoiceDate?.ToString("d") ?? "—"
        }).ToList();

        var document = new TablePrintDocument(_chkOutstandingOnly.Checked ? "Outstanding Report" : "Customer Statement", headers, tableRows);
        using var preview = new PrintPreviewDialog { Document = document, Width = 900, Height = 700 };
        preview.ShowDialog(this);
    }
}
