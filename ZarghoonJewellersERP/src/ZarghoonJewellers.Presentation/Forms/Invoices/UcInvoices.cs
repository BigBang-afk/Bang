using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// The point-of-sale screen: pick a customer, add stock items to a running cart, adjust
/// discount/tax/payment, and check out. Checkout goes through <see cref="IInvoiceService.CreateInvoiceAsync"/>
/// which atomically persists the invoice, decrements stock and updates the customer's balance.
/// </summary>
public class UcInvoices : UserControl, IAsyncLoadable
{
    private readonly IInvoiceService _invoiceService;
    private readonly IStockService _stockService;
    private readonly ICustomerService _customerService;
    private readonly IGoldRateService _goldRateService;
    private readonly CurrentSession _session;

    private readonly Guna2ComboBox _cmbCustomer;
    private readonly Guna2ComboBox _cmbStockItem;
    private readonly Label _lblGoldRate;
    private readonly DataGridView _gridCart;
    private readonly Label _lblSubTotal;
    private readonly Label _lblMakingTotal;
    private readonly Guna2TextBox _txtDiscount;
    private readonly Guna2TextBox _txtTax;
    private readonly Label _lblTotal;
    private readonly Guna2TextBox _txtPaidAmount;
    private readonly Guna2ComboBox _cmbPaymentMode;
    private readonly Guna2TextBox _txtOldGoldWeight;
    private readonly DataGridView _gridRecent;

    private readonly List<(Domain.Entities.Stock Stock, InvoiceLineRequest Line)> _cart = new();
    private IReadOnlyList<Domain.Entities.Stock> _availableStock = Array.Empty<Domain.Entities.Stock>();
    private decimal _currentGoldRate;

    public UcInvoices(IInvoiceService invoiceService, IStockService stockService, ICustomerService customerService,
        IGoldRateService goldRateService, CurrentSession session)
    {
        _invoiceService = invoiceService;
        _stockService = stockService;
        _customerService = customerService;
        _goldRateService = goldRateService;
        _session = session;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Invoices / Point of Sale", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlHeader = new Guna2Panel { Dock = DockStyle.Top, Height = 100, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 8), Padding = new Padding(16) };

        Label MakeCaption(string text, int x) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, 8), AutoSize = true };

        pnlHeader.Controls.Add(MakeCaption("CUSTOMER", 16));
        _cmbCustomer = new Guna2ComboBox { Location = new Point(16, 28), Size = new Size(300, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbCustomer);

        pnlHeader.Controls.Add(MakeCaption("ADD ITEM", 332));
        _cmbStockItem = new Guna2ComboBox { Location = new Point(332, 28), Size = new Size(340, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        pnlHeader.Controls.Add(_cmbStockItem);

        var btnAddToCart = new Guna2Button { Text = "+ Add to Cart", Location = new Point(688, 28), Size = new Size(130, 36), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 6, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnAddToCart.Click += (_, _) => AddSelectedItemToCart();
        pnlHeader.Controls.Add(btnAddToCart);

        _lblGoldRate = new Label { Text = "Gold Rate (22K): —", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI", 10F, FontStyle.Bold), Location = new Point(840, 34), AutoSize = true };
        pnlHeader.Controls.Add(_lblGoldRate);

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

        var pnlTotals = new Guna2Panel { Dock = DockStyle.Bottom, Height = 190, FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Margin = new Padding(0, 8, 0, 0), Padding = new Padding(16) };
        BuildTotalsPanel(pnlTotals, out _lblSubTotal, out _lblMakingTotal, out _txtDiscount, out _txtTax, out _lblTotal, out _txtPaidAmount, out _cmbPaymentMode, out _txtOldGoldWeight);

        var lblRecentTitle = new Label { Text = "RECENT INVOICES", Dock = DockStyle.Top, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        _gridRecent = new DataGridView
        {
            Dock = DockStyle.Top, Height = 150, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
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
        out Guna2TextBox tax, out Label total, out Guna2TextBox paidAmount, out Guna2ComboBox paymentMode, out Guna2TextBox oldGoldWeight)
    {
        Label MakeCaption(string text, int x, int yy) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, yy), AutoSize = true };

        panel.Controls.Add(MakeCaption("SUBTOTAL", 16, 8));
        subTotal = new Label { Text = "0", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI", 12F, FontStyle.Bold), Location = new Point(16, 26), AutoSize = true };
        panel.Controls.Add(subTotal);

        panel.Controls.Add(MakeCaption("MAKING CHARGES", 180, 8));
        makingTotal = new Label { Text = "0", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI", 12F, FontStyle.Bold), Location = new Point(180, 26), AutoSize = true };
        panel.Controls.Add(makingTotal);

        panel.Controls.Add(MakeCaption("DISCOUNT", 360, 8));
        discount = new Guna2TextBox { Text = "0", Location = new Point(360, 24), Size = new Size(110, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        discount.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(discount);

        panel.Controls.Add(MakeCaption("TAX", 490, 8));
        tax = new Guna2TextBox { Text = "0", Location = new Point(490, 24), Size = new Size(110, 32), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        tax.TextChanged += (_, _) => RecalculateTotals();
        panel.Controls.Add(tax);

        panel.Controls.Add(MakeCaption("TOTAL AMOUNT", 620, 8));
        total = new Label { Text = "0", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 16F, FontStyle.Bold), Location = new Point(620, 24), AutoSize = true };
        panel.Controls.Add(total);

        panel.Controls.Add(MakeCaption("PAID AMOUNT", 16, 68));
        paidAmount = new Guna2TextBox { Text = "0", Location = new Point(16, 86), Size = new Size(150, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        panel.Controls.Add(paidAmount);

        panel.Controls.Add(MakeCaption("PAYMENT MODE", 180, 68));
        paymentMode = new Guna2ComboBox { Location = new Point(180, 86), Size = new Size(150, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        paymentMode.DataSource = new[] { "Cash", "Bank", "Credit", "Mixed" };
        panel.Controls.Add(paymentMode);

        panel.Controls.Add(MakeCaption("OLD GOLD EXCHANGE (g)", 350, 68));
        oldGoldWeight = new Guna2TextBox { Text = "0", Location = new Point(350, 86), Size = new Size(150, 34), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        panel.Controls.Add(oldGoldWeight);

        var btnCheckout = new Guna2Button
        {
            Text = "COMPLETE SALE", Location = new Point(620, 80), Size = new Size(200, 46),
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
        _cmbStockItem.DisplayMember = nameof(Domain.Entities.Stock.ItemName);
        _cmbStockItem.ValueMember = nameof(Domain.Entities.Stock.StockId);

        var rate = await _goldRateService.GetLatestAsync();
        _currentGoldRate = rate?.Rate22K ?? 0;
        _lblGoldRate.Text = $"Gold Rate (22K): {_currentGoldRate:C0}/g";

        var recent = await _invoiceService.GetRecentAsync(10);
        _gridRecent.Rows.Clear();
        foreach (var invoice in recent)
            _gridRecent.Rows.Add(invoice.InvoiceNumber, invoice.Customer.FullName, invoice.InvoiceDate.ToString("d"), invoice.TotalAmount.ToString("C0"), invoice.Status);

        _cart.Clear();
        RefreshCartGrid();
    }

    private void AddSelectedItemToCart()
    {
        if (_cmbStockItem.SelectedItem is not Domain.Entities.Stock stock) return;

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

    private void RecalculateTotals()
    {
        var subTotal = _cart.Sum(c => (c.Line.NetWeight * c.Line.Rate) + c.Line.StoneValue);
        var makingTotal = _cart.Sum(c => c.Line.MakingCharge);
        var discount = ParseDecimal(_txtDiscount.Text);
        var tax = ParseDecimal(_txtTax.Text);
        var total = subTotal + makingTotal + tax - discount;

        _lblSubTotal.Text = subTotal.ToString("N0");
        _lblMakingTotal.Text = makingTotal.ToString("N0");
        _lblTotal.Text = total.ToString("C0");
    }

    private static decimal ParseDecimal(string text) => decimal.TryParse(text, out var value) ? value : 0;

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

        var request = new CreateInvoiceRequest
        {
            CustomerId = customerId,
            GoldRateAtSale = _currentGoldRate,
            DiscountAmount = ParseDecimal(_txtDiscount.Text),
            TaxAmount = ParseDecimal(_txtTax.Text),
            PaidAmount = ParseDecimal(_txtPaidAmount.Text),
            PaymentMode = _cmbPaymentMode.SelectedItem?.ToString() ?? "Cash",
            OldGoldExchangeWeight = ParseDecimal(_txtOldGoldWeight.Text),
            CreatedBy = _session.UserId,
            Lines = _cart.Select(c => c.Line).ToList()
        };

        try
        {
            var result = await _invoiceService.CreateInvoiceAsync(request);
            MessageBox.Show(this, $"Invoice {result.InvoiceNumber} created.\nTotal: {result.TotalAmount:C0}\nBalance: {result.BalanceAmount:C0}",
                "Sale Completed", MessageBoxButtons.OK, MessageBoxIcon.Information);

            _txtDiscount.Text = "0";
            _txtTax.Text = "0";
            _txtPaidAmount.Text = "0";
            _txtOldGoldWeight.Text = "0";
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not complete sale", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
