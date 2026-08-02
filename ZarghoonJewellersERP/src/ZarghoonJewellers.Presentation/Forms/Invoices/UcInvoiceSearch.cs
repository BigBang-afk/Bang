using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// Invoice History / Search: filter every invoice ever raised (Sale, Return, Exchange) by
/// number/customer name, date range and status, then view, reprint (thermal or A4) or
/// cancel/return against it - the searchable archive that complements the live POS cart.
/// </summary>
public class UcInvoiceSearch : UserControl, IAsyncLoadable
{
    private readonly IInvoiceService _invoiceService;
    private readonly ICustomerService _customerService;
    private readonly ICrudService<Setting> _settingService;

    private readonly Guna2TextBox _txtSearch;
    private readonly Guna2DateTimePicker _dtFrom;
    private readonly Guna2DateTimePicker _dtTo;
    private readonly Guna2CheckBox _chkUseDateRange;
    private readonly Guna2ComboBox _cmbStatus;
    private readonly Guna2ComboBox _cmbCustomer;
    private readonly DataGridView _grid;
    private readonly Label _lblCount;

    private IReadOnlyList<Invoice> _results = Array.Empty<Invoice>();
    private string _shopName = "Zarghoon Jewellers";
    private string _shopAddress = string.Empty;
    private string _shopPhone = string.Empty;

    public UcInvoiceSearch(IInvoiceService invoiceService, ICustomerService customerService, ICrudService<Setting> settingService)
    {
        _invoiceService = invoiceService;
        _customerService = customerService;
        _settingService = settingService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Invoice History / Search", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlFilters = new Guna2Panel { Dock = DockStyle.Top, Height = 120, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        Label MakeCaption(string text, int x, int yy = 8) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, yy), AutoSize = true };

        pnlFilters.Controls.Add(MakeCaption("INVOICE # OR CUSTOMER", 16));
        _txtSearch = new Guna2TextBox { Location = new Point(16, 26), Size = new Size(230, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        pnlFilters.Controls.Add(_txtSearch);

        _chkUseDateRange = new Guna2CheckBox { Text = "Filter by date", Location = new Point(262, 30), AutoSize = true, ForeColor = ThemeColors.TextSecondary };
        _chkUseDateRange.CheckedState.FillColor = ThemeColors.GoldPrimary;
        pnlFilters.Controls.Add(_chkUseDateRange);

        pnlFilters.Controls.Add(MakeCaption("FROM", 400));
        _dtFrom = new Guna2DateTimePicker { Location = new Point(400, 26), Size = new Size(150, 36), Value = DateTime.Now.AddMonths(-1) };
        pnlFilters.Controls.Add(_dtFrom);

        pnlFilters.Controls.Add(MakeCaption("TO", 566));
        _dtTo = new Guna2DateTimePicker { Location = new Point(566, 26), Size = new Size(150, 36), Value = DateTime.Now };
        pnlFilters.Controls.Add(_dtTo);

        pnlFilters.Controls.Add(MakeCaption("STATUS", 732));
        _cmbStatus = new Guna2ComboBox { Location = new Point(732, 26), Size = new Size(140, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbStatus.DataSource = new[] { "All", "Confirmed", "Held", "Cancelled" };
        pnlFilters.Controls.Add(_cmbStatus);

        pnlFilters.Controls.Add(MakeCaption("CUSTOMER", 16, 68));
        _cmbCustomer = new Guna2ComboBox { Location = new Point(16, 86), Size = new Size(280, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlFilters.Controls.Add(_cmbCustomer);

        var btnSearch = new Guna2Button { Text = "SEARCH", Location = new Point(732, 78), Size = new Size(140, 40), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold) };
        btnSearch.Click += async (_, _) => await RunSearchAsync();
        pnlFilters.Controls.Add(btnSearch);

        _lblCount = new Label { Location = new Point(900, 30), ForeColor = ThemeColors.TextMuted, AutoSize = true };
        pnlFilters.Controls.Add(_lblCount);

        var pnlActions = new Guna2Panel { Dock = DockStyle.Bottom, Height = 56, FillColor = ThemeColors.BackgroundDark, Margin = new Padding(0, 8, 0, 0) };
        var btnViewThermal = new Guna2Button { Text = "Print Thermal", Location = new Point(0, 8), Size = new Size(140, 40), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnViewThermal.Click += async (_, _) => await PrintSelectedAsync(thermal: true);
        pnlActions.Controls.Add(btnViewThermal);

        var btnViewA4 = new Guna2Button { Text = "Print A4", Location = new Point(150, 8), Size = new Size(120, 40), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnViewA4.Click += async (_, _) => await PrintSelectedAsync(thermal: false);
        pnlActions.Controls.Add(btnViewA4);

        var btnCancel = new Guna2Button { Text = "Cancel Invoice", Location = new Point(280, 8), Size = new Size(140, 40), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.Danger, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnCancel.Click += async (_, _) => await CancelSelectedAsync();
        pnlActions.Controls.Add(btnCancel);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, MultiSelect = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("InvoiceNumber", "Invoice #");
        _grid.Columns.Add("Type", "Type");
        _grid.Columns.Add("Customer", "Customer");
        _grid.Columns.Add("Date", "Date");
        _grid.Columns.Add("Total", "Total");
        _grid.Columns.Add("Paid", "Paid");
        _grid.Columns.Add("Balance", "Balance");
        _grid.Columns.Add("Status", "Status");

        Controls.Add(_grid);
        Controls.Add(pnlActions);
        Controls.Add(pnlFilters);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        var customers = await _customerService.GetAllAsync();
        var customerList = new List<Customer> { new() { CustomerId = 0, FullName = "All Customers" } };
        customerList.AddRange(customers.OrderBy(c => c.FullName));
        _cmbCustomer.DataSource = customerList;
        _cmbCustomer.DisplayMember = nameof(Customer.FullName);
        _cmbCustomer.ValueMember = nameof(Customer.CustomerId);
        _cmbCustomer.SelectedIndex = 0;

        _cmbStatus.SelectedIndex = 0;

        var settings = await _settingService.GetAllAsync();
        _shopName = settings.FirstOrDefault(s => s.SettingKey == "ShopName")?.SettingValue is { Length: > 0 } sn ? sn : _shopName;
        _shopAddress = settings.FirstOrDefault(s => s.SettingKey == "ShopAddress")?.SettingValue ?? string.Empty;
        _shopPhone = settings.FirstOrDefault(s => s.SettingKey == "ShopPhone")?.SettingValue ?? string.Empty;

        await RunSearchAsync();
    }

    private async Task RunSearchAsync()
    {
        var term = string.IsNullOrWhiteSpace(_txtSearch.Text) ? null : _txtSearch.Text.Trim();
        DateOnly? fromDate = _chkUseDateRange.Checked ? DateOnly.FromDateTime(_dtFrom.Value) : null;
        DateOnly? toDate = _chkUseDateRange.Checked ? DateOnly.FromDateTime(_dtTo.Value) : null;
        var status = _cmbStatus.SelectedItem?.ToString() is { } s && s != "All" ? s : null;
        int? customerId = _cmbCustomer.SelectedValue is int id && id > 0 ? id : null;

        _results = await _invoiceService.SearchInvoicesAsync(term, fromDate, toDate, status, customerId);

        _grid.Rows.Clear();
        foreach (var invoice in _results)
            _grid.Rows.Add(invoice.InvoiceNumber, invoice.InvoiceType, invoice.Customer.FullName, invoice.InvoiceDate.ToString("dd-MMM-yy HH:mm"),
                invoice.TotalAmount.ToString("N0"), invoice.PaidAmount.ToString("N0"), invoice.BalanceAmount.ToString("N0"), invoice.Status);

        _lblCount.Text = $"{_results.Count} invoice(s) found";
    }

    private Invoice? SelectedSummary => _grid.CurrentRow is not null && _grid.CurrentRow.Index < _results.Count
        ? _results[_grid.CurrentRow.Index]
        : null;

    private async Task PrintSelectedAsync(bool thermal)
    {
        var summary = SelectedSummary;
        if (summary is null)
        {
            MessageBox.Show(this, "Select an invoice first.", "Print", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var invoice = await _invoiceService.GetWithDetailsAsync(summary.InvoiceId);
        if (invoice is null) return;

        using System.Drawing.Printing.PrintDocument document = thermal
            ? new InvoiceThermalPrintDocument(invoice, _shopName, _shopAddress, _shopPhone)
            : new InvoiceA4PrintDocument(invoice, _shopName, _shopAddress, _shopPhone);

        using var preview = new PrintPreviewDialog { Document = document, Width = 900, Height = 700, StartPosition = FormStartPosition.CenterParent };
        preview.ShowDialog(this);
    }

    private async Task CancelSelectedAsync()
    {
        var summary = SelectedSummary;
        if (summary is null)
        {
            MessageBox.Show(this, "Select an invoice first.", "Cancel Invoice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (summary.Status == "Cancelled")
        {
            MessageBox.Show(this, "This invoice is already cancelled.", "Cancel Invoice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (MessageBox.Show(this, $"Cancel invoice {summary.InvoiceNumber}? Stock and the customer balance will be reversed.",
                "Cancel Invoice", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes)
            return;

        try
        {
            await _invoiceService.CancelInvoiceAsync(summary.InvoiceId);
            await RunSearchAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not cancel invoice", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
