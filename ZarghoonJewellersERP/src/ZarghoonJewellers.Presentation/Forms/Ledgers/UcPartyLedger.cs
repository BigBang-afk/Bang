using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Ledgers;

/// <summary>
/// One screen serving Customer Ledger, Supplier Ledger and Karigar Ledger: pick the party type
/// and the specific party, and see its combined cash + gold movement history side by side
/// (a jewelry shop settles in either currency or gold weight against the same account).
/// </summary>
public class UcPartyLedger : UserControl, IAsyncLoadable
{
    private readonly ILedgerService _ledgerService;
    private readonly ICustomerService _customerService;
    private readonly ISupplierService _supplierService;
    private readonly ICrudService<Karigar> _karigarService;

    private readonly Guna2ComboBox _cmbEntityType;
    private readonly Guna2ComboBox _cmbEntity;
    private readonly Guna2DateTimePicker _dtFrom;
    private readonly Guna2DateTimePicker _dtTo;
    private readonly Guna2CheckBox _chkUseDateRange;
    private readonly Label _lblCashBalance;
    private readonly Label _lblGoldBalance;
    private readonly DataGridView _gridCash;
    private readonly DataGridView _gridGold;

    private IReadOnlyList<Customer> _customers = Array.Empty<Customer>();
    private IReadOnlyList<Supplier> _suppliers = Array.Empty<Supplier>();
    private IReadOnlyList<Karigar> _karigars = Array.Empty<Karigar>();

    public UcPartyLedger(ILedgerService ledgerService, ICustomerService customerService, ISupplierService supplierService, ICrudService<Karigar> karigarService)
    {
        _ledgerService = ledgerService;
        _customerService = customerService;
        _supplierService = supplierService;
        _karigarService = karigarService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Customer / Supplier / Karigar Ledger", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlFilters = new Guna2Panel { Dock = DockStyle.Top, Height = 100, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        Label MakeCaption(string text, int x) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, 8), AutoSize = true };

        pnlFilters.Controls.Add(MakeCaption("PARTY TYPE", 16));
        _cmbEntityType = new Guna2ComboBox { Location = new Point(16, 26), Size = new Size(160, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbEntityType.DataSource = new[] { "Customer", "Supplier", "Karigar" };
        _cmbEntityType.SelectedIndexChanged += (_, _) => PopulateEntityCombo();
        pnlFilters.Controls.Add(_cmbEntityType);

        pnlFilters.Controls.Add(MakeCaption("PARTY", 192));
        _cmbEntity = new Guna2ComboBox { Location = new Point(192, 26), Size = new Size(300, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlFilters.Controls.Add(_cmbEntity);

        _chkUseDateRange = new Guna2CheckBox { Text = "Filter by date", Location = new Point(510, 32), AutoSize = true, ForeColor = ThemeColors.TextSecondary };
        _chkUseDateRange.CheckedState.FillColor = ThemeColors.GoldPrimary;
        pnlFilters.Controls.Add(_chkUseDateRange);

        pnlFilters.Controls.Add(MakeCaption("FROM", 650));
        _dtFrom = new Guna2DateTimePicker { Location = new Point(650, 26), Size = new Size(140, 36), Value = DateTime.Now.AddMonths(-1) };
        pnlFilters.Controls.Add(_dtFrom);

        pnlFilters.Controls.Add(MakeCaption("TO", 800));
        _dtTo = new Guna2DateTimePicker { Location = new Point(800, 26), Size = new Size(140, 36), Value = DateTime.Now };
        pnlFilters.Controls.Add(_dtTo);

        var btnLoad = new Guna2Button { Text = "LOAD LEDGER", Location = new Point(950, 24), Size = new Size(150, 40), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold) };
        btnLoad.Click += async (_, _) => await LoadLedgerAsync();
        pnlFilters.Controls.Add(btnLoad);

        pnlFilters.Controls.Add(MakeCaption("CASH BALANCE", 16, 62));
        _lblCashBalance = new Label { Text = "—", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 14F, FontStyle.Bold), Location = new Point(16, 62), AutoSize = true };
        pnlFilters.Controls.Add(_lblCashBalance);

        _lblGoldBalance = new Label { Text = "—", ForeColor = ThemeColors.GoldLight, Font = new Font("Segoe UI Semibold", 14F, FontStyle.Bold), Location = new Point(220, 62), AutoSize = true };
        pnlFilters.Controls.Add(_lblGoldBalance);

        var pnlGrids = new SplitContainer
        {
            Dock = DockStyle.Fill, Orientation = Orientation.Vertical, BackColor = ThemeColors.BackgroundDark,
            SplitterWidth = 8, SplitterDistance = 600
        };

        var lblCashTitle = new Label { Text = "CASH MOVEMENTS", Dock = DockStyle.Top, Height = 24, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold) };
        _gridCash = BuildGrid();
        _gridCash.Columns.Add("Date", "Date");
        _gridCash.Columns.Add("Type", "Type");
        _gridCash.Columns.Add("Reference", "Reference");
        _gridCash.Columns.Add("Amount", "Amount");
        _gridCash.Columns.Add("Mode", "Mode");
        _gridCash.Columns.Add("Balance", "Balance");
        _gridCash.Columns.Add("Description", "Description");
        pnlGrids.Panel1.Controls.Add(_gridCash);
        pnlGrids.Panel1.Controls.Add(lblCashTitle);

        var lblGoldTitle = new Label { Text = "GOLD MOVEMENTS (g)", Dock = DockStyle.Top, Height = 24, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold) };
        _gridGold = BuildGrid();
        _gridGold.Columns.Add("Date", "Date");
        _gridGold.Columns.Add("Type", "Type");
        _gridGold.Columns.Add("Purity", "Purity");
        _gridGold.Columns.Add("Weight", "Weight (g)");
        _gridGold.Columns.Add("Balance", "Balance (g)");
        _gridGold.Columns.Add("Description", "Description");
        pnlGrids.Panel2.Controls.Add(_gridGold);
        pnlGrids.Panel2.Controls.Add(lblGoldTitle);

        Controls.Add(pnlGrids);
        Controls.Add(pnlFilters);
        Controls.Add(titleLabel);
    }

    private static DataGridView BuildGrid()
    {
        var grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 32
        };
        grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        return grid;
    }

    public async Task LoadAsync()
    {
        _customers = await _customerService.GetAllAsync();
        _suppliers = await _supplierService.GetAllAsync();
        _karigars = await _karigarService.GetAllAsync();

        _cmbEntityType.SelectedIndex = 0;
        PopulateEntityCombo();
    }

    private void PopulateEntityCombo()
    {
        switch (_cmbEntityType.SelectedItem?.ToString())
        {
            case "Supplier":
                _cmbEntity.DataSource = _suppliers.OrderBy(s => s.CompanyName).ToList();
                _cmbEntity.DisplayMember = nameof(Supplier.CompanyName);
                _cmbEntity.ValueMember = nameof(Supplier.SupplierId);
                break;
            case "Karigar":
                _cmbEntity.DataSource = _karigars.OrderBy(k => k.FullName).ToList();
                _cmbEntity.DisplayMember = nameof(Karigar.FullName);
                _cmbEntity.ValueMember = nameof(Karigar.KarigarId);
                break;
            default:
                _cmbEntity.DataSource = _customers.OrderBy(c => c.FullName).ToList();
                _cmbEntity.DisplayMember = nameof(Customer.FullName);
                _cmbEntity.ValueMember = nameof(Customer.CustomerId);
                break;
        }
    }

    private async Task LoadLedgerAsync()
    {
        if (_cmbEntity.SelectedValue is not int entityId)
        {
            MessageBox.Show(this, "Select a party first.", "Ledger", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        DateOnly? fromDate = _chkUseDateRange.Checked ? DateOnly.FromDateTime(_dtFrom.Value) : null;
        DateOnly? toDate = _chkUseDateRange.Checked ? DateOnly.FromDateTime(_dtTo.Value) : null;

        var ledger = _cmbEntityType.SelectedItem?.ToString() switch
        {
            "Supplier" => await _ledgerService.GetSupplierLedgerAsync(entityId, fromDate, toDate),
            "Karigar" => await _ledgerService.GetKarigarLedgerAsync(entityId, fromDate, toDate),
            _ => await _ledgerService.GetCustomerLedgerAsync(entityId, fromDate, toDate)
        };

        _lblCashBalance.Text = $"Cash: {ledger.CurrentCashBalance:C0}";
        _lblGoldBalance.Text = $"Gold: {ledger.CurrentGoldBalance:N2} g";

        _gridCash.Rows.Clear();
        foreach (var entry in ledger.CashMovements)
            _gridCash.Rows.Add(entry.TransactionDate.ToString("g"), entry.TransactionType, entry.ReferenceType,
                entry.Amount.ToString("N0"), entry.PaymentMode, entry.RunningBalance.ToString("N0"), entry.Description);

        _gridGold.Rows.Clear();
        foreach (var entry in ledger.GoldMovements)
            _gridGold.Rows.Add(entry.TransactionDate.ToString("g"), entry.TransactionType, entry.Purity,
                entry.Weight.ToString("N3"), entry.RunningBalance.ToString("N3"), entry.Description);
    }
}
