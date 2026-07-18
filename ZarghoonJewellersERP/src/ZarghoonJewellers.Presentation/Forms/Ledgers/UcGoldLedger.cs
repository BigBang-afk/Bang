using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Ledgers;

/// <summary>Gold movement screen: post a Given/Received entry against a Customer, Supplier or
/// Karigar and browse that entity's gold history. Posting keeps the entity's CurrentGoldBalance
/// in sync via <see cref="IGoldLedgerService.PostEntryAsync"/>.</summary>
public class UcGoldLedger : UserControl, IAsyncLoadable
{
    private readonly IGoldLedgerService _goldLedgerService;
    private readonly ICustomerService _customerService;
    private readonly ISupplierService _supplierService;
    private readonly ICrudService<Karigar> _karigarService;
    private readonly CurrentSession _session;

    private readonly Guna2ComboBox _cmbEntityType;
    private readonly Guna2ComboBox _cmbEntity;
    private readonly Guna2ComboBox _cmbTransactionType;
    private readonly Guna2ComboBox _cmbPurity;
    private readonly Guna2TextBox _txtWeight;
    private readonly Guna2TextBox _txtDescription;
    private readonly DataGridView _grid;

    public UcGoldLedger(IGoldLedgerService goldLedgerService, ICustomerService customerService,
        ISupplierService supplierService, ICrudService<Karigar> karigarService, CurrentSession session)
    {
        _goldLedgerService = goldLedgerService;
        _customerService = customerService;
        _supplierService = supplierService;
        _karigarService = karigarService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Gold Ledger", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlEntry = new Guna2Panel { Dock = DockStyle.Top, Height = 110, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        pnlEntry.Controls.Add(new Label { Text = "ENTITY TYPE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(16, 8), AutoSize = true });
        _cmbEntityType = new Guna2ComboBox { Location = new Point(16, 26), Size = new Size(130, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbEntityType.DataSource = new[] { "Customer", "Supplier", "Karigar" };
        _cmbEntityType.SelectedIndexChanged += async (_, _) => await RefreshEntityListAsync();
        pnlEntry.Controls.Add(_cmbEntityType);

        pnlEntry.Controls.Add(new Label { Text = "ENTITY", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(160, 8), AutoSize = true });
        _cmbEntity = new Guna2ComboBox { Location = new Point(160, 26), Size = new Size(230, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbEntity.SelectedIndexChanged += async (_, _) => await RefreshHistoryAsync();
        pnlEntry.Controls.Add(_cmbEntity);

        pnlEntry.Controls.Add(new Label { Text = "TYPE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(404, 8), AutoSize = true });
        _cmbTransactionType = new Guna2ComboBox { Location = new Point(404, 26), Size = new Size(110, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbTransactionType.DataSource = new[] { "Given", "Received" };
        pnlEntry.Controls.Add(_cmbTransactionType);

        pnlEntry.Controls.Add(new Label { Text = "PURITY", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(528, 8), AutoSize = true });
        _cmbPurity = new Guna2ComboBox { Location = new Point(528, 26), Size = new Size(90, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbPurity.DataSource = new[] { "24K", "22K", "21K", "18K" };
        pnlEntry.Controls.Add(_cmbPurity);

        pnlEntry.Controls.Add(new Label { Text = "WEIGHT (g)", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(632, 8), AutoSize = true });
        _txtWeight = new Guna2TextBox { Location = new Point(632, 26), Size = new Size(100, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = "0" };
        pnlEntry.Controls.Add(_txtWeight);

        pnlEntry.Controls.Add(new Label { Text = "NOTE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(748, 8), AutoSize = true });
        _txtDescription = new Guna2TextBox { Location = new Point(748, 26), Size = new Size(140, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        pnlEntry.Controls.Add(_txtDescription);

        var btnPost = new Guna2Button
        {
            Text = "POST", Location = new Point(900, 24), Size = new Size(100, 38),
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
        _grid.Columns.Add("Purity", "Purity");
        _grid.Columns.Add("Weight", "Weight (g)");
        _grid.Columns.Add("Balance", "Running Balance (g)");
        _grid.Columns.Add("Description", "Note");

        Controls.Add(_grid);
        Controls.Add(pnlEntry);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync() => await RefreshEntityListAsync();

    private async Task RefreshEntityListAsync()
    {
        switch (_cmbEntityType.SelectedItem?.ToString())
        {
            case "Customer":
                var customers = await _customerService.GetAllAsync();
                _cmbEntity.DataSource = customers.Where(c => c.IsActive).OrderBy(c => c.FullName).ToList();
                _cmbEntity.DisplayMember = nameof(Customer.FullName);
                _cmbEntity.ValueMember = nameof(Customer.CustomerId);
                break;
            case "Supplier":
                var suppliers = await _supplierService.GetAllAsync();
                _cmbEntity.DataSource = suppliers.Where(s => s.IsActive).OrderBy(s => s.CompanyName).ToList();
                _cmbEntity.DisplayMember = nameof(Supplier.CompanyName);
                _cmbEntity.ValueMember = nameof(Supplier.SupplierId);
                break;
            default:
                var karigars = await _karigarService.GetAllAsync();
                _cmbEntity.DataSource = karigars.Where(k => k.IsActive).OrderBy(k => k.FullName).ToList();
                _cmbEntity.DisplayMember = nameof(Karigar.FullName);
                _cmbEntity.ValueMember = nameof(Karigar.KarigarId);
                break;
        }

        await RefreshHistoryAsync();
    }

    private async Task RefreshHistoryAsync()
    {
        _grid.Rows.Clear();
        if (_cmbEntity.SelectedValue is not int entityId) return;

        var entityType = _cmbEntityType.SelectedItem?.ToString() ?? "Customer";
        var history = await _goldLedgerService.GetHistoryForEntityAsync(entityType, entityId);
        foreach (var entry in history)
            _grid.Rows.Add(entry.TransactionDate.ToString("g"), entry.TransactionType, entry.Purity,
                entry.Weight.ToString("N3"), entry.RunningBalance.ToString("N3"), entry.Description);
    }

    private async Task PostEntryAsync()
    {
        if (_cmbEntity.SelectedValue is not int entityId)
        {
            MessageBox.Show(this, "Select an entity first.", "Gold Ledger", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var weight = decimal.TryParse(_txtWeight.Text, out var w) ? w : 0;
        if (weight <= 0)
        {
            MessageBox.Show(this, "Enter a valid weight.", "Gold Ledger", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            await _goldLedgerService.PostEntryAsync(
                _cmbEntityType.SelectedItem?.ToString() ?? "Customer", entityId,
                _cmbTransactionType.SelectedItem?.ToString() ?? "Given",
                _cmbPurity.SelectedItem?.ToString() ?? "24K", weight, "Manual", null,
                _txtDescription.Text.Trim(), _session.UserId);

            _txtWeight.Text = "0";
            _txtDescription.Text = string.Empty;
            await RefreshHistoryAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not post entry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
