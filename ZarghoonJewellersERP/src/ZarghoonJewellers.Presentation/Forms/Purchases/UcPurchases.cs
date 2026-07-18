using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Purchases;

/// <summary>
/// Purchase entry screen: pick a supplier, add lines (restocking existing items or
/// introducing new ones), and check out through <see cref="IPurchaseService.CreatePurchaseAsync"/>,
/// which creates/updates the stock rows and the supplier's running balance atomically.
/// </summary>
public class UcPurchases : UserControl, IAsyncLoadable
{
    private readonly IPurchaseService _purchaseService;
    private readonly IStockService _stockService;
    private readonly ISupplierService _supplierService;
    private readonly ICrudService<StockCategory> _categoryService;
    private readonly IGoldRateService _goldRateService;
    private readonly CurrentSession _session;

    private readonly Guna2ComboBox _cmbSupplier;
    private readonly Guna2ComboBox _cmbExistingStock;
    private readonly DataGridView _gridCart;
    private readonly Label _lblTotal;
    private readonly Guna2TextBox _txtPaidAmount;
    private readonly DataGridView _gridRecent;

    private readonly List<PurchaseLineRequest> _cart = new();
    private IReadOnlyList<Domain.Entities.Stock> _stockList = Array.Empty<Domain.Entities.Stock>();
    private IReadOnlyList<StockCategory> _categories = Array.Empty<StockCategory>();
    private decimal _currentGoldRate;

    public UcPurchases(IPurchaseService purchaseService, IStockService stockService, ISupplierService supplierService,
        ICrudService<StockCategory> categoryService, IGoldRateService goldRateService, CurrentSession session)
    {
        _purchaseService = purchaseService;
        _stockService = stockService;
        _supplierService = supplierService;
        _categoryService = categoryService;
        _goldRateService = goldRateService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Purchases", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlHeader = new Guna2Panel { Dock = DockStyle.Top, Height = 92, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };
        Label MakeCaption(string text, int x) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, 8), AutoSize = true };

        pnlHeader.Controls.Add(MakeCaption("SUPPLIER", 16));
        _cmbSupplier = new Guna2ComboBox { Location = new Point(16, 28), Size = new Size(300, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbSupplier);

        pnlHeader.Controls.Add(MakeCaption("RESTOCK EXISTING ITEM (OPTIONAL)", 332));
        _cmbExistingStock = new Guna2ComboBox { Location = new Point(332, 28), Size = new Size(340, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbExistingStock);

        var btnAddLine = new Guna2Button { Text = "+ Add Line", Location = new Point(688, 28), Size = new Size(130, 36), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 6, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnAddLine.Click += (_, _) => AddLine();
        pnlHeader.Controls.Add(btnAddLine);

        _gridCart = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ColumnHeadersHeight = 34, RowTemplate = { Height = 30 }
        };
        _gridCart.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridCart.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridCart.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridCart.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridCart.Columns.Add("Item", "Item");
        _gridCart.Columns.Add("Purity", "Purity");
        _gridCart.Columns.Add("Net", "Net (g)");
        _gridCart.Columns.Add("Rate", "Rate");
        _gridCart.Columns.Add("Qty", "Qty");
        _gridCart.Columns.Add("Amount", "Amount");
        var removeColumn = new DataGridViewButtonColumn { HeaderText = "", Text = "Remove", UseColumnTextForButtonValue = true, Name = "Remove", Width = 90 };
        _gridCart.Columns.Add(removeColumn);
        _gridCart.CellContentClick += (_, e) =>
        {
            if (e.RowIndex < 0 || _gridCart.Columns[e.ColumnIndex].Name != "Remove") return;
            _cart.RemoveAt(e.RowIndex);
            RefreshCartGrid();
        };

        var pnlTotals = new Guna2Panel { Dock = DockStyle.Bottom, Height = 130, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 0), Padding = new Padding(16) };
        pnlTotals.Controls.Add(MakeCaption("TOTAL AMOUNT", 16));
        _lblTotal = new Label { Text = "0", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 18F, FontStyle.Bold), Location = new Point(16, 26), AutoSize = true };
        pnlTotals.Controls.Add(_lblTotal);

        pnlTotals.Controls.Add(MakeCaption("PAID AMOUNT", 260));
        _txtPaidAmount = new Guna2TextBox { Text = "0", Location = new Point(260, 26), Size = new Size(150, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        pnlTotals.Controls.Add(_txtPaidAmount);

        var btnCheckout = new Guna2Button
        {
            Text = "SAVE PURCHASE", Location = new Point(620, 20), Size = new Size(200, 46),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 11F, FontStyle.Bold)
        };
        btnCheckout.Click += async (_, _) => await CheckoutAsync();
        pnlTotals.Controls.Add(btnCheckout);

        var lblRecentTitle = new Label { Text = "RECENT PURCHASES", Dock = DockStyle.Top, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _gridRecent = new DataGridView
        {
            Dock = DockStyle.Top, Height = 140, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 30
        };
        _gridRecent.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridRecent.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridRecent.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridRecent.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridRecent.Columns.Add("PurchaseNumber", "Purchase #");
        _gridRecent.Columns.Add("Supplier", "Supplier");
        _gridRecent.Columns.Add("Date", "Date");
        _gridRecent.Columns.Add("Total", "Total");

        Controls.Add(_gridCart);
        Controls.Add(pnlTotals);
        Controls.Add(_gridRecent);
        Controls.Add(lblRecentTitle);
        Controls.Add(pnlHeader);
        Controls.Add(titleLabel);
    }

    public async Task LoadAsync()
    {
        var suppliers = await _supplierService.GetAllAsync();
        _cmbSupplier.DataSource = suppliers.Where(s => s.IsActive).OrderBy(s => s.CompanyName).ToList();
        _cmbSupplier.DisplayMember = nameof(Supplier.CompanyName);
        _cmbSupplier.ValueMember = nameof(Supplier.SupplierId);

        _stockList = await _stockService.GetAllAsync();
        var stockOptions = new List<StockPickerItem> { new(null, "— New item —") };
        stockOptions.AddRange(_stockList.Where(s => s.IsActive).Select(s => new StockPickerItem(s, s.ItemName)));
        _cmbExistingStock.DataSource = stockOptions;
        _cmbExistingStock.DisplayMember = nameof(StockPickerItem.Display);
        _cmbExistingStock.SelectedIndex = 0;

        _categories = await _categoryService.GetAllAsync();

        var rate = await _goldRateService.GetLatestAsync();
        _currentGoldRate = rate?.Rate22K ?? 0;

        var recent = await _purchaseService.GetRecentAsync(10);
        _gridRecent.Rows.Clear();
        foreach (var purchase in recent)
            _gridRecent.Rows.Add(purchase.PurchaseNumber, purchase.Supplier.CompanyName, purchase.PurchaseDate.ToString("d"), purchase.TotalAmount.ToString("C0"));

        _cart.Clear();
        RefreshCartGrid();
    }

    private void AddLine()
    {
        var selectedStock = (_cmbExistingStock.SelectedItem as StockPickerItem)?.Stock;
        var line = new PurchaseLineRequest { Rate = _currentGoldRate };

        using var dialog = new PurchaseLineEditForm(line, _categories, selectedStock);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        _cart.Add(dialog.Line);
        RefreshCartGrid();
    }

    private void RefreshCartGrid()
    {
        _gridCart.Rows.Clear();
        foreach (var line in _cart)
            _gridCart.Rows.Add(line.ItemName, line.Purity, line.NetWeight.ToString("N3"), line.Rate.ToString("N0"), line.Quantity, line.Amount.ToString("N0"), "Remove");

        _lblTotal.Text = _cart.Sum(l => l.Amount).ToString("C0");
    }

    private async Task CheckoutAsync()
    {
        if (_cmbSupplier.SelectedValue is not int supplierId)
        {
            MessageBox.Show(this, "Select a supplier first.", "Purchases", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (_cart.Count == 0)
        {
            MessageBox.Show(this, "Add at least one line first.", "Purchases", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var request = new CreatePurchaseRequest
        {
            SupplierId = supplierId,
            GoldRateAtPurchase = _currentGoldRate,
            PaidAmount = decimal.TryParse(_txtPaidAmount.Text, out var paid) ? paid : 0,
            CreatedBy = _session.UserId,
            Lines = _cart
        };

        try
        {
            var result = await _purchaseService.CreatePurchaseAsync(request);
            MessageBox.Show(this, $"Purchase {result.PurchaseNumber} saved.\nTotal: {result.TotalAmount:C0}\nBalance: {result.BalanceAmount:C0}",
                "Purchase Saved", MessageBoxButtons.OK, MessageBoxIcon.Information);

            _txtPaidAmount.Text = "0";
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save purchase", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    /// <summary>Display wrapper for the "restock existing item" combo box: lets a plain sentinel
    /// ("New item") and real <see cref="Domain.Entities.Stock"/> rows share one DataSource with a
    /// readable label, instead of relying on Stock's (non-existent) ToString() override.</summary>
    private sealed record StockPickerItem(Domain.Entities.Stock? Stock, string Display);
}
