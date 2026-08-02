using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// The point-of-sale screen: pick a customer, add stock items to a running cart (by combo pick
/// or barcode scan), adjust discount/tax/payment, and check out. Also hosts Hold/Recall,
/// Return/Exchange, Split Payment, Shift open/close and receipt printing - everything the
/// cashier needs without leaving this one screen. Checkout goes through
/// <see cref="IInvoiceService.CreateInvoiceAsync"/> (or <see cref="IInvoiceService.CompleteHeldInvoiceAsync"/>
/// when finishing a recalled cart) which atomically persists the invoice, decrements stock,
/// updates the customer's balance and posts the ledger entries.
/// </summary>
public class UcInvoices : UserControl, IAsyncLoadable
{
    private readonly IInvoiceService _invoiceService;
    private readonly IStockService _stockService;
    private readonly ICustomerService _customerService;
    private readonly IGoldRateService _goldRateService;
    private readonly IShiftService _shiftService;
    private readonly ICrudService<BankAccount> _bankAccountService;
    private readonly ICrudService<Setting> _settingService;
    private readonly CurrentSession _session;

    private readonly Guna2ComboBox _cmbCustomer;
    private readonly Guna2ComboBox _cmbStockItem;
    private readonly Guna2TextBox _txtBarcode;
    private readonly Label _lblGoldRate;
    private readonly Label _lblShiftStatus;
    private readonly Guna2Button _btnOpenShift;
    private readonly Guna2Button _btnCloseShift;
    private readonly DataGridView _gridCart;
    private readonly Label _lblSubTotal;
    private readonly Label _lblMakingTotal;
    private readonly Guna2TextBox _txtDiscount;
    private readonly Guna2TextBox _txtDiscountPercent;
    private readonly Guna2TextBox _txtTax;
    private readonly Guna2TextBox _txtTaxPercent;
    private readonly Label _lblTotal;
    private readonly Label _lblBalanceDue;
    private readonly Guna2TextBox _txtPaidAmount;
    private readonly Guna2ComboBox _cmbPaymentMode;
    private readonly Guna2TextBox _txtOldGoldWeight;
    private readonly Label _lblSplitStatus;
    private readonly DataGridView _gridRecent;

    private readonly List<(Stock Stock, InvoiceLineRequest Line)> _cart = new();
    private IReadOnlyList<Stock> _availableStock = Array.Empty<Stock>();
    private IReadOnlyList<BankAccount> _bankAccounts = Array.Empty<BankAccount>();
    private IReadOnlyList<Invoice> _recentInvoices = Array.Empty<Invoice>();
    private List<PaymentLineRequest> _splitPayments = new();
    private Shift? _currentShift;
    private Invoice? _lastInvoice;
    private int? _recalledInvoiceId;
    private decimal _currentGoldRate;
    private string _shopName = "Zarghoon Jewellers";
    private string _shopAddress = string.Empty;
    private string _shopPhone = string.Empty;

    public UcInvoices(IInvoiceService invoiceService, IStockService stockService, ICustomerService customerService,
        IGoldRateService goldRateService, IShiftService shiftService, ICrudService<BankAccount> bankAccountService,
        ICrudService<Setting> settingService, CurrentSession session)
    {
        _invoiceService = invoiceService;
        _stockService = stockService;
        _customerService = customerService;
        _goldRateService = goldRateService;
        _shiftService = shiftService;
        _bankAccountService = bankAccountService;
        _settingService = settingService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Invoices / Point of Sale", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlHeader = new Guna2Panel { Dock = DockStyle.Top, Height = 140, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        Label MakeCaption(string text, int x, int yy = 8) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, yy), AutoSize = true };

        pnlHeader.Controls.Add(MakeCaption("CUSTOMER", 16));
        _cmbCustomer = new Guna2ComboBox { Location = new Point(16, 28), Size = new Size(260, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbCustomer);

        pnlHeader.Controls.Add(MakeCaption("ADD ITEM", 292));
        _cmbStockItem = new Guna2ComboBox { Location = new Point(292, 28), Size = new Size(260, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbStockItem);

        var btnAddToCart = new Guna2Button { Text = "+ Add", Location = new Point(558, 28), Size = new Size(80, 36), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 6, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnAddToCart.Click += (_, _) => AddSelectedItemToCart();
        pnlHeader.Controls.Add(btnAddToCart);

        pnlHeader.Controls.Add(MakeCaption("BARCODE SCAN (press Enter)", 654));
        _txtBarcode = new Guna2TextBox { Location = new Point(654, 28), Size = new Size(210, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        _txtBarcode.KeyDown += TxtBarcode_KeyDown;
        pnlHeader.Controls.Add(_txtBarcode);

        _lblGoldRate = new Label { Text = "Gold Rate (22K): —", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI", 10F, FontStyle.Bold), Location = new Point(880, 34), AutoSize = true };
        pnlHeader.Controls.Add(_lblGoldRate);

        // ---- Row 2: shift status + hold/recall/return-exchange toolbar
        _lblShiftStatus = new Label { Text = "Shift: —", ForeColor = ThemeColors.TextSecondary, Font = new Font("Segoe UI", 9F, FontStyle.Bold), Location = new Point(16, 78), AutoSize = true };
        pnlHeader.Controls.Add(_lblShiftStatus);

        _btnOpenShift = new Guna2Button { Text = "Open Shift", Location = new Point(16, 98), Size = new Size(110, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.Success, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _btnOpenShift.Click += async (_, _) => await OpenShiftAsync();
        pnlHeader.Controls.Add(_btnOpenShift);

        _btnCloseShift = new Guna2Button { Text = "Close Shift", Location = new Point(132, 98), Size = new Size(110, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.Danger, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _btnCloseShift.Click += async (_, _) => await CloseShiftAsync();
        pnlHeader.Controls.Add(_btnCloseShift);

        var btnHold = new Guna2Button { Text = "Hold Invoice", Location = new Point(262, 98), Size = new Size(120, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.Warning, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnHold.Click += async (_, _) => await HoldCurrentCartAsync();
        pnlHeader.Controls.Add(btnHold);

        var btnRecall = new Guna2Button { Text = "Recall Invoice", Location = new Point(394, 98), Size = new Size(120, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.Info, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnRecall.Click += async (_, _) => await RecallInvoiceAsync();
        pnlHeader.Controls.Add(btnRecall);

        var btnReturnExchange = new Guna2Button { Text = "Return / Exchange", Location = new Point(526, 98), Size = new Size(150, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnReturnExchange.Click += async (_, _) => await OpenReturnExchangeAsync();
        pnlHeader.Controls.Add(btnReturnExchange);

        var btnPrintThermal = new Guna2Button { Text = "Print Thermal", Location = new Point(688, 98), Size = new Size(120, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnPrintThermal.Click += async (_, _) => await PrintInvoiceAsync(thermal: true);
        pnlHeader.Controls.Add(btnPrintThermal);

        var btnPrintA4 = new Guna2Button { Text = "Print A4", Location = new Point(820, 98), Size = new Size(100, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnPrintA4.Click += async (_, _) => await PrintInvoiceAsync(thermal: false);
        pnlHeader.Controls.Add(btnPrintA4);

        _gridCart = new DataGridView
        {
            Dock = DockStyle.Fill, Height = 260, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, AllowUserToDeleteRows = false, ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ColumnHeadersHeight = 34, RowTemplate = { Height = 30 }
        };
        _gridCart.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridCart.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridCart.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridCart.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridCart.Columns.Add("Item", "Item");
        _gridCart.Columns.Add("Purity", "Purity");
        _gridCart.Columns.Add("Gross", "Gross (g)");
        _gridCart.Columns.Add("Net", "Net (g)");
        _gridCart.Columns.Add("Rate", "Rate");
        _gridCart.Columns.Add("Making", "Making");
        _gridCart.Columns.Add("Qty", "Qty");
        _gridCart.Columns.Add("LineTotal", "Line Total");
        var removeColumn = new DataGridViewButtonColumn { HeaderText = "", Text = "Remove", UseColumnTextForButtonValue = true, Name = "Remove", Width = 90 };
        _gridCart.Columns.Add(removeColumn);
        _gridCart.CellContentClick += GridCart_CellContentClick;

        var pnlTotals = new Guna2Panel { Dock = DockStyle.Bottom, Height = 230, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 0), Padding = new Padding(16) };
        BuildTotalsPanel(pnlTotals, out _lblSubTotal, out _lblMakingTotal, out _txtDiscount, out _txtDiscountPercent,
            out _txtTax, out _txtTaxPercent, out _lblTotal, out _lblBalanceDue, out _txtPaidAmount, out _cmbPaymentMode,
            out _txtOldGoldWeight, out _lblSplitStatus);

        var lblRecentTitle = new Label { Text = "RECENT INVOICES (select a row, then Print, to reprint)", Dock = DockStyle.Top, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _gridRecent = new DataGridView
        {
            Dock = DockStyle.Top, Height = 150, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, MultiSelect = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 30
        };
        _gridRecent.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridRecent.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridRecent.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridRecent.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridRecent.Columns.Add("InvoiceNumber", "Invoice #");
        _gridRecent.Columns.Add("Customer", "Customer");
        _gridRecent.Columns.Add("Date", "Date");
        _gridRecent.Columns.Add("Total", "Total");
        _gridRecent.Columns.Add("Status", "Status");

        Controls.Add(_gridCart);
        Controls.Add(pnlTotals);
        Controls.Add(_gridRecent);
        Controls.Add(lblRecentTitle);
        Controls.Add(pnlHeader);
        Controls.Add(titleLabel);
    }

    private void BuildTotalsPanel(Guna2Panel panel, out Label subTotal, out Label makingTotal, out Guna2TextBox discount,
        out Guna2TextBox discountPercent, out Guna2TextBox tax, out Guna2TextBox taxPercent, out Label total,
        out Label balanceDue, out Guna2TextBox paidAmount, out Guna2ComboBox paymentMode, out Guna2TextBox oldGoldWeight,
        out Label splitStatus)
    {
        Label MakeCaption(string text, int x, int yy) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, yy), AutoSize = true };

        panel.Controls.Add(MakeCaption("SUBTOTAL", 16, 8));
        subTotal = new Label { Text = "0", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI", 11F, FontStyle.Bold), Location = new Point(16, 26), AutoSize = true };
        panel.Controls.Add(subTotal);

        panel.Controls.Add(MakeCaption("MAKING", 150, 8));
        makingTotal = new Label { Text = "0", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI", 11F, FontStyle.Bold), Location = new Point(150, 26), AutoSize = true };
        panel.Controls.Add(makingTotal);

        panel.Controls.Add(MakeCaption("DISCOUNT AMT", 270, 8));
        discount = new Guna2TextBox { Text = "0", Location = new Point(270, 24), Size = new Size(90, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        discount.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(discount);

        panel.Controls.Add(MakeCaption("DISC %", 368, 8));
        discountPercent = new Guna2TextBox { Text = "0", Location = new Point(368, 24), Size = new Size(60, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        discountPercent.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(discountPercent);

        panel.Controls.Add(MakeCaption("TAX/GST AMT", 436, 8));
        tax = new Guna2TextBox { Text = "0", Location = new Point(436, 24), Size = new Size(90, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        tax.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(tax);

        panel.Controls.Add(MakeCaption("TAX/GST %", 534, 8));
        taxPercent = new Guna2TextBox { Text = "0", Location = new Point(534, 24), Size = new Size(60, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        taxPercent.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(taxPercent);

        panel.Controls.Add(MakeCaption("TOTAL", 616, 8));
        total = new Label { Text = "0", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 15F, FontStyle.Bold), Location = new Point(616, 24), AutoSize = true };
        panel.Controls.Add(total);

        panel.Controls.Add(MakeCaption("BALANCE DUE", 800, 8));
        balanceDue = new Label { Text = "0", ForeColor = ThemeColors.Danger, Font = new Font("Segoe UI Semibold", 15F, FontStyle.Bold), Location = new Point(800, 24), AutoSize = true };
        panel.Controls.Add(balanceDue);

        panel.Controls.Add(MakeCaption("PAID AMOUNT", 16, 68));
        paidAmount = new Guna2TextBox { Text = "0", Location = new Point(16, 86), Size = new Size(140, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        paidAmount.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(paidAmount);

        panel.Controls.Add(MakeCaption("PAYMENT MODE", 170, 68));
        paymentMode = new Guna2ComboBox { Location = new Point(170, 86), Size = new Size(130, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        paymentMode.DataSource = new[] { "Cash", "Bank", "Card", "JazzCash", "EasyPaisa", "USDT", "Credit" };
        panel.Controls.Add(paymentMode);

        var btnSplitPayment = new Guna2Button { Text = "Split Payment...", Location = new Point(310, 86), Size = new Size(130, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnSplitPayment.Click += (_, _) => OpenSplitPayment();
        panel.Controls.Add(btnSplitPayment);

        var btnClearSplit = new Guna2Button { Text = "Clear Split", Location = new Point(446, 86), Size = new Size(90, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextSecondary, BorderRadius = 6, Font = new Font("Segoe UI", 8F) };
        btnClearSplit.Click += (_, _) => { _splitPayments = new(); RecalculateTotals(); };
        panel.Controls.Add(btnClearSplit);

        splitStatus = new Label { Text = string.Empty, ForeColor = ThemeColors.Info, Font = new Font("Segoe UI", 8.5F, FontStyle.Italic), Location = new Point(16, 126), AutoSize = true };
        panel.Controls.Add(splitStatus);

        panel.Controls.Add(MakeCaption("OLD GOLD EXCHANGE (g)", 550, 68));
        oldGoldWeight = new Guna2TextBox { Text = "0", Location = new Point(550, 86), Size = new Size(140, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        panel.Controls.Add(oldGoldWeight);

        var btnCheckout = new Guna2Button
        {
            Text = "COMPLETE SALE", Location = new Point(710, 68), Size = new Size(200, 52),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 11F, FontStyle.Bold)
        };
        btnCheckout.Click += async (_, _) => await CheckoutAsync();
        panel.Controls.Add(btnCheckout);
    }

    public async Task LoadAsync()
    {
        var customers = await _customerService.GetAllAsync();
        _cmbCustomer.DataSource = customers.Where(c => c.IsActive).OrderBy(c => c.FullName).ToList();
        _cmbCustomer.DisplayMember = nameof(Customer.FullName);
        _cmbCustomer.ValueMember = nameof(Customer.CustomerId);

        _availableStock = (await _stockService.GetAllAsync()).Where(s => s.IsActive && s.Quantity > 0).ToList();
        _cmbStockItem.DataSource = _availableStock.ToList();
        _cmbStockItem.DisplayMember = nameof(Stock.ItemName);
        _cmbStockItem.ValueMember = nameof(Stock.StockId);

        _bankAccounts = await _bankAccountService.GetAllAsync();

        var settings = await _settingService.GetAllAsync();
        _shopName = settings.FirstOrDefault(s => s.SettingKey == "ShopName")?.SettingValue is { Length: > 0 } sn ? sn : _shopName;
        _shopAddress = settings.FirstOrDefault(s => s.SettingKey == "ShopAddress")?.SettingValue ?? string.Empty;
        _shopPhone = settings.FirstOrDefault(s => s.SettingKey == "ShopPhone")?.SettingValue ?? string.Empty;

        var rate = await _goldRateService.GetLatestAsync();
        _currentGoldRate = rate?.Rate22K ?? 0;
        _lblGoldRate.Text = $"Gold Rate (22K): {_currentGoldRate:C0}/g";

        _currentShift = await _shiftService.GetOpenShiftForCashierAsync(_session.UserId);
        UpdateShiftUi();

        _recentInvoices = await _invoiceService.GetRecentAsync(10);
        _gridRecent.Rows.Clear();
        foreach (var invoice in _recentInvoices)
            _gridRecent.Rows.Add(invoice.InvoiceNumber, invoice.Customer.FullName, invoice.InvoiceDate.ToString("d"), invoice.TotalAmount.ToString("C0"), invoice.Status);

        _cart.Clear();
        _splitPayments = new();
        _recalledInvoiceId = null;
        RefreshCartGrid();
    }

    private void UpdateShiftUi()
    {
        _lblShiftStatus.Text = _currentShift is null ? "Shift: not open" : $"Shift: open since {_currentShift.OpenedAt:HH:mm} (float {_currentShift.OpeningCash:C0})";
        _lblShiftStatus.ForeColor = _currentShift is null ? ThemeColors.Warning : ThemeColors.Success;
        _btnOpenShift.Enabled = _currentShift is null;
        _btnCloseShift.Enabled = _currentShift is not null;
    }

    private async Task OpenShiftAsync()
    {
        using var dialog = new OpenShiftForm(_shiftService, _session.UserId);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        _currentShift = dialog.OpenedShift;
        UpdateShiftUi();
    }

    private async Task CloseShiftAsync()
    {
        if (_currentShift is null) return;
        using var dialog = new CloseShiftForm(_shiftService, _currentShift.ShiftId);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;
        _currentShift = null;
        UpdateShiftUi();
    }

    private async void TxtBarcode_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode != Keys.Enter) return;
        e.Handled = true;
        e.SuppressKeyPress = true;

        var code = _txtBarcode.Text.Trim();
        _txtBarcode.Text = string.Empty;
        if (code.Length == 0) return;

        var stock = await _stockService.GetByBarcodeAsync(code);
        if (stock is null)
        {
            MessageBox.Show(this, $"No stock item found for barcode '{code}'.", "Barcode Scan", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (stock.Quantity <= 0)
        {
            MessageBox.Show(this, $"'{stock.ItemName}' is out of stock.", "Barcode Scan", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        // Quick Billing: scanning adds straight to the cart at current price, no confirmation
        // popup, so a busy counter can ring up items as fast as they can be scanned.
        var line = new InvoiceLineRequest
        {
            StockId = stock.StockId,
            Purity = stock.Purity,
            GrossWeight = stock.GrossWeight,
            StoneWeight = stock.StoneWeight,
            Rate = _currentGoldRate > 0 ? _currentGoldRate : stock.SaleRate,
            MakingCharge = stock.MakingChargeType == "Fixed" ? stock.MakingChargeValue : stock.MakingChargeValue * stock.CalculateNetWeight(),
            StoneValue = stock.StoneValue,
            Quantity = 1
        };

        _cart.Add((stock, line));
        RefreshCartGrid();
    }

    private void AddSelectedItemToCart()
    {
        if (_cmbStockItem.SelectedItem is not Stock stock) return;

        var line = new InvoiceLineRequest
        {
            StockId = stock.StockId,
            Purity = stock.Purity,
            GrossWeight = stock.GrossWeight,
            StoneWeight = stock.StoneWeight,
            Rate = _currentGoldRate > 0 ? _currentGoldRate : stock.SaleRate,
            MakingCharge = stock.MakingChargeType == "Fixed" ? stock.MakingChargeValue : stock.MakingChargeValue * stock.CalculateNetWeight(),
            StoneValue = stock.StoneValue,
            Quantity = 1
        };

        using var dialog = new InvoiceLineEditForm(stock.ItemName, line);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        _cart.Add((stock, dialog.Line));
        RefreshCartGrid();
    }

    private void GridCart_CellContentClick(object? sender, DataGridViewCellEventArgs e)
    {
        if (e.RowIndex < 0 || _gridCart.Columns[e.ColumnIndex].Name != "Remove") return;
        _cart.RemoveAt(e.RowIndex);
        RefreshCartGrid();
    }

    private void RefreshCartGrid()
    {
        _gridCart.Rows.Clear();
        foreach (var (stock, line) in _cart)
        {
            _gridCart.Rows.Add(stock.ItemName, line.Purity, line.GrossWeight.ToString("N3"), line.NetWeight.ToString("N3"),
                line.Rate.ToString("N0"), line.MakingCharge.ToString("N0"), line.Quantity, line.LineTotal.ToString("N0"), "Remove");
        }
        RecalculateTotals();
    }

    /// <summary>Mirrors <see cref="InvoiceService"/>'s CalculateInvoiceTotals so the on-screen
    /// figures match exactly what gets persisted (percent-based discount/tax takes precedence
    /// over the flat amount, same as the server).</summary>
    private void RecalculateTotals()
    {
        var subTotal = _cart.Sum(c => (c.Line.NetWeight * c.Line.Rate) + c.Line.StoneValue);
        var makingTotal = _cart.Sum(c => c.Line.MakingCharge);
        var preDiscountTotal = subTotal + makingTotal;

        var discountPercent = ParseDecimal(_txtDiscountPercent.Text);
        var discountAmount = discountPercent > 0 ? Math.Round(preDiscountTotal * discountPercent / 100m, 2) : ParseDecimal(_txtDiscount.Text);

        var taxableAmount = preDiscountTotal - discountAmount;
        var taxPercent = ParseDecimal(_txtTaxPercent.Text);
        var taxAmount = taxPercent > 0 ? Math.Round(taxableAmount * taxPercent / 100m, 2) : ParseDecimal(_txtTax.Text);

        var total = taxableAmount + taxAmount;
        var effectivePaid = _splitPayments.Count > 0 ? _splitPayments.Sum(p => p.Amount) : ParseDecimal(_txtPaidAmount.Text);

        _lblSubTotal.Text = subTotal.ToString("N0");
        _lblMakingTotal.Text = makingTotal.ToString("N0");
        _lblTotal.Text = total.ToString("C0");
        _lblBalanceDue.Text = (total - effectivePaid).ToString("C0");
        _lblSplitStatus.Text = _splitPayments.Count > 0
            ? $"Split payment active: {_splitPayments.Count} method(s), {effectivePaid:C0} entered"
            : string.Empty;
    }

    private static decimal ParseDecimal(string text) => decimal.TryParse(text, out var value) ? value : 0;

    private void OpenSplitPayment()
    {
        // Recompute the exact total (rather than parsing the formatted label) for the dialog.
        var subTotal = _cart.Sum(c => (c.Line.NetWeight * c.Line.Rate) + c.Line.StoneValue);
        var makingTotal = _cart.Sum(c => c.Line.MakingCharge);
        var preDiscountTotal = subTotal + makingTotal;
        var discountPercent = ParseDecimal(_txtDiscountPercent.Text);
        var discountAmount = discountPercent > 0 ? Math.Round(preDiscountTotal * discountPercent / 100m, 2) : ParseDecimal(_txtDiscount.Text);
        var taxableAmount = preDiscountTotal - discountAmount;
        var taxPercent = ParseDecimal(_txtTaxPercent.Text);
        var taxAmount = taxPercent > 0 ? Math.Round(taxableAmount * taxPercent / 100m, 2) : ParseDecimal(_txtTax.Text);
        var invoiceTotal = taxableAmount + taxAmount;

        // Split Payment only offers the real payment methods (not "Credit", which means unpaid-
        // on-account) - fall back to Cash if that's what's currently selected on the single-method row.
        var currentMode = _cmbPaymentMode.SelectedItem?.ToString() ?? "Cash";
        var splitPrefillMethod = SplitPaymentForm.SupportedMethods.Contains(currentMode) ? currentMode : "Cash";

        using var dialog = new SplitPaymentForm(invoiceTotal, ParseDecimal(_txtPaidAmount.Text), splitPrefillMethod, _bankAccounts);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        _splitPayments = dialog.Payments;
        RecalculateTotals();
    }

    private CreateInvoiceRequest BuildCreateInvoiceRequest(int customerId)
    {
        return new CreateInvoiceRequest
        {
            CustomerId = customerId,
            GoldRateAtSale = _currentGoldRate,
            DiscountPercentage = ParseDecimal(_txtDiscountPercent.Text),
            DiscountAmount = ParseDecimal(_txtDiscount.Text),
            TaxPercentage = ParseDecimal(_txtTaxPercent.Text),
            TaxAmount = ParseDecimal(_txtTax.Text),
            PaidAmount = ParseDecimal(_txtPaidAmount.Text),
            PaymentMode = _cmbPaymentMode.SelectedItem?.ToString() ?? "Cash",
            OldGoldExchangeWeight = ParseDecimal(_txtOldGoldWeight.Text),
            CreatedBy = _session.UserId,
            ShiftId = _currentShift?.ShiftId,
            Lines = _cart.Select(c => c.Line).ToList(),
            SplitPayments = _splitPayments
        };
    }

    private void ClearCartAndTotals()
    {
        _cart.Clear();
        _splitPayments = new();
        _recalledInvoiceId = null;
        _txtDiscount.Text = "0";
        _txtDiscountPercent.Text = "0";
        _txtTax.Text = "0";
        _txtTaxPercent.Text = "0";
        _txtPaidAmount.Text = "0";
        _txtOldGoldWeight.Text = "0";
        RefreshCartGrid();
    }

    private async Task HoldCurrentCartAsync()
    {
        if (_cmbCustomer.SelectedValue is not int customerId)
        {
            MessageBox.Show(this, "Select a customer first.", "Hold Invoice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (_cart.Count == 0)
        {
            MessageBox.Show(this, "Add at least one item to the cart.", "Hold Invoice", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using var prompt = new TextPromptForm("Hold Invoice", "Label for this held invoice (e.g. \"Counter 2 - Mrs. Ali\")", _cmbCustomer.Text);
        if (prompt.ShowDialog(this) != DialogResult.OK || prompt.Value.Length == 0) return;

        try
        {
            var request = BuildCreateInvoiceRequest(customerId);
            var result = await _invoiceService.HoldInvoiceAsync(request, prompt.Value);
            MessageBox.Show(this, $"Invoice {result.InvoiceNumber} held as \"{prompt.Value}\".", "Held", MessageBoxButtons.OK, MessageBoxIcon.Information);
            ClearCartAndTotals();
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not hold invoice", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task RecallInvoiceAsync()
    {
        using var dialog = new HeldInvoicesForm(_invoiceService);
        if (dialog.ShowDialog(this) != DialogResult.OK || dialog.RecalledInvoice is null) return;

        var invoice = dialog.RecalledInvoice;
        _cart.Clear();
        foreach (var detail in invoice.InvoiceDetails)
        {
            var stock = await _stockService.GetByIdAsync(detail.StockId);
            if (stock is null) continue;

            var line = new InvoiceLineRequest
            {
                StockId = detail.StockId,
                Purity = detail.Purity,
                GrossWeight = detail.GrossWeight,
                StoneWeight = detail.StoneWeight,
                Rate = detail.Rate,
                MakingCharge = detail.MakingCharge,
                StoneValue = detail.StoneValue,
                Quantity = detail.Quantity
            };
            _cart.Add((stock, line));
        }

        _cmbCustomer.SelectedValue = invoice.CustomerId;
        _recalledInvoiceId = invoice.InvoiceId;
        RefreshCartGrid();

        MessageBox.Show(this, $"Recalled \"{invoice.HoldLabel}\" ({invoice.InvoiceNumber}). Finish and click Complete Sale when ready.",
            "Recalled", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private async Task OpenReturnExchangeAsync()
    {
        using var dialog = new ReturnExchangeForm(_invoiceService, _stockService, _goldRateService, _session.UserId);
        if (dialog.ShowDialog(this) == DialogResult.OK)
            await LoadAsync();
    }

    private async Task<Invoice?> ResolveInvoiceToPrintAsync()
    {
        if (_gridRecent.CurrentRow is not null && _gridRecent.CurrentRow.Index < _recentInvoices.Count)
            return await _invoiceService.GetWithDetailsAsync(_recentInvoices[_gridRecent.CurrentRow.Index].InvoiceId);

        return _lastInvoice;
    }

    private async Task PrintInvoiceAsync(bool thermal)
    {
        var invoice = await ResolveInvoiceToPrintAsync();
        if (invoice is null)
        {
            MessageBox.Show(this, "Complete a sale, or select a row in Recent Invoices, before printing.", "Print", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using System.Drawing.Printing.PrintDocument document = thermal
            ? new InvoiceThermalPrintDocument(invoice, _shopName, _shopAddress, _shopPhone)
            : new InvoiceA4PrintDocument(invoice, _shopName, _shopAddress, _shopPhone);

        using var preview = new PrintPreviewDialog { Document = document, Width = 900, Height = 700, StartPosition = FormStartPosition.CenterParent };
        preview.ShowDialog(this);
    }

    private async Task CheckoutAsync()
    {
        if (_cmbCustomer.SelectedValue is not int customerId)
        {
            MessageBox.Show(this, "Select a customer first.", "Invoices", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        if (_cart.Count == 0)
        {
            MessageBox.Show(this, "Add at least one item to the cart.", "Invoices", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var request = BuildCreateInvoiceRequest(customerId);

        try
        {
            var result = _recalledInvoiceId.HasValue
                ? await _invoiceService.CompleteHeldInvoiceAsync(_recalledInvoiceId.Value, request)
                : await _invoiceService.CreateInvoiceAsync(request);

            _lastInvoice = await _invoiceService.GetWithDetailsAsync(result.InvoiceId);

            MessageBox.Show(this, $"Invoice {result.InvoiceNumber} created.\nTotal: {result.TotalAmount:C0}\nBalance: {result.BalanceAmount:C0}",
                "Sale Completed", MessageBoxButtons.OK, MessageBoxIcon.Information);

            ClearCartAndTotals();
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not complete sale", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
