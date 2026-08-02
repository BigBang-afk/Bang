using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Invoices;

/// <summary>
/// Handles a Return (refund only) or Exchange (return + immediately sell replacement items)
/// against a previously confirmed sale. The cashier looks up the original invoice, ticks off
/// the line(s) being returned (partial-quantity returns are supported), optionally adds
/// replacement items exactly like the POS cart, and submits everything as one
/// <see cref="ProcessReturnRequest"/> so the refund/new-sale nets to a single customer
/// balance adjustment.
/// </summary>
public class ReturnExchangeForm : Form
{
    private readonly IInvoiceService _invoiceService;
    private readonly IStockService _stockService;
    private readonly IGoldRateService _goldRateService;
    private readonly int _createdBy;

    private readonly Guna2TextBox _txtSearch;
    private readonly Guna2ComboBox _cmbMatches;
    private readonly DataGridView _gridOriginal;
    private readonly Guna2ComboBox _cmbStockItem;
    private readonly DataGridView _gridNewItems;
    private readonly Label _lblRefundTotal;
    private readonly Label _lblNewItemsTotal;
    private readonly Label _lblNetAmount;

    private Invoice? _original;
    private IReadOnlyList<Invoice> _matches = Array.Empty<Invoice>();
    private IReadOnlyList<Stock> _availableStock = Array.Empty<Stock>();
    private readonly List<(Stock Stock, InvoiceLineRequest Line)> _newLines = new();
    private decimal _currentGoldRate;

    public ReturnExchangeForm(IInvoiceService invoiceService, IStockService stockService, IGoldRateService goldRateService, int createdBy)
    {
        _invoiceService = invoiceService;
        _stockService = stockService;
        _goldRateService = goldRateService;
        _createdBy = createdBy;

        Text = "Return / Exchange";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(920, 700);
        Font = new Font("Segoe UI", 9.5f);

        var lblSearchCaption = new Label { Text = "INVOICE # OR CUSTOMER NAME", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 14), AutoSize = true };
        Controls.Add(lblSearchCaption);

        _txtSearch = new Guna2TextBox { Location = new Point(20, 32), Size = new Size(260, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6 };
        Controls.Add(_txtSearch);

        var btnFind = new Guna2Button { Text = "Find", Location = new Point(288, 32), Size = new Size(90, 36), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 6, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        btnFind.Click += async (_, _) => await FindInvoicesAsync();
        Controls.Add(btnFind);

        _cmbMatches = new Guna2ComboBox { Location = new Point(390, 32), Size = new Size(510, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbMatches.SelectedIndexChanged += async (_, _) => await LoadSelectedInvoiceAsync();
        Controls.Add(_cmbMatches);

        var lblOriginalCaption = new Label { Text = "ORIGINAL INVOICE LINES - tick and set quantity/refund to return", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 82), AutoSize = true };
        Controls.Add(lblOriginalCaption);

        _gridOriginal = new DataGridView
        {
            Location = new Point(20, 100), Size = new Size(880, 200),
            BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            ColumnHeadersHeight = 30, EditMode = DataGridViewEditMode.EditOnEnter
        };
        _gridOriginal.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridOriginal.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridOriginal.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridOriginal.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridOriginal.Columns.Add(new DataGridViewCheckBoxColumn { Name = "Select", HeaderText = "Return", Width = 60 });
        _gridOriginal.Columns.Add(new DataGridViewTextBoxColumn { Name = "Item", HeaderText = "Item", ReadOnly = true });
        _gridOriginal.Columns.Add(new DataGridViewTextBoxColumn { Name = "OrigQty", HeaderText = "Sold Qty", ReadOnly = true });
        _gridOriginal.Columns.Add(new DataGridViewTextBoxColumn { Name = "LineTotal", HeaderText = "Line Total", ReadOnly = true });
        _gridOriginal.Columns.Add(new DataGridViewTextBoxColumn { Name = "ReturnQty", HeaderText = "Return Qty" });
        _gridOriginal.Columns.Add(new DataGridViewTextBoxColumn { Name = "RefundAmount", HeaderText = "Refund Amount" });
        _gridOriginal.CellValueChanged += (_, _) => RecalculateTotals();
        _gridOriginal.CurrentCellDirtyStateChanged += (_, _) => { if (_gridOriginal.IsCurrentCellDirty) _gridOriginal.CommitEdit(DataGridViewDataErrorContexts.Commit); };
        Controls.Add(_gridOriginal);

        var lblNewCaption = new Label { Text = "EXCHANGE - REPLACEMENT ITEMS (optional)", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 312), AutoSize = true };
        Controls.Add(lblNewCaption);

        _cmbStockItem = new Guna2ComboBox { Location = new Point(20, 330), Size = new Size(400, 36), FillColor = ThemeColors.BackgroundDark, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList };
        Controls.Add(_cmbStockItem);

        var btnAddNewLine = new Guna2Button { Text = "+ Add Replacement Item", Location = new Point(430, 330), Size = new Size(200, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderRadius = 6, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
        btnAddNewLine.Click += (_, _) => AddNewLine();
        Controls.Add(btnAddNewLine);

        _gridNewItems = new DataGridView
        {
            Location = new Point(20, 376), Size = new Size(880, 130),
            BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 30
        };
        _gridNewItems.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _gridNewItems.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _gridNewItems.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _gridNewItems.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _gridNewItems.Columns.Add("Item", "Item");
        _gridNewItems.Columns.Add("Net", "Net (g)");
        _gridNewItems.Columns.Add("Rate", "Rate");
        _gridNewItems.Columns.Add("Making", "Making");
        _gridNewItems.Columns.Add("LineTotal", "Line Total");
        var removeCol = new DataGridViewButtonColumn { HeaderText = "", Text = "Remove", UseColumnTextForButtonValue = true, Name = "Remove", Width = 90 };
        _gridNewItems.Columns.Add(removeCol);
        _gridNewItems.CellContentClick += (_, e) =>
        {
            if (e.RowIndex < 0 || _gridNewItems.Columns[e.ColumnIndex].Name != "Remove") return;
            _newLines.RemoveAt(e.RowIndex);
            RefreshNewLinesGrid();
        };
        Controls.Add(_gridNewItems);

        _lblRefundTotal = new Label { Text = "Refund: 0", ForeColor = ThemeColors.Danger, Font = new Font("Segoe UI", 11F, FontStyle.Bold), Location = new Point(20, 520), AutoSize = true };
        _lblNewItemsTotal = new Label { Text = "New Items: 0", ForeColor = ThemeColors.TextPrimary, Font = new Font("Segoe UI", 11F, FontStyle.Bold), Location = new Point(260, 520), AutoSize = true };
        _lblNetAmount = new Label { Text = "Net: 0", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 14F, FontStyle.Bold), Location = new Point(540, 512), AutoSize = true };
        Controls.Add(_lblRefundTotal);
        Controls.Add(_lblNewItemsTotal);
        Controls.Add(_lblNetAmount);

        var btnSubmit = new Guna2Button
        {
            Text = "PROCESS RETURN / EXCHANGE", Location = new Point(20, 620), Size = new Size(880, 48),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 11F, FontStyle.Bold)
        };
        btnSubmit.Click += async (_, _) => await SubmitAsync();
        Controls.Add(btnSubmit);

        Load += async (_, _) =>
        {
            _availableStock = (await _stockService.GetAllAsync()).Where(s => s.IsActive).ToList();
            _cmbStockItem.DataSource = _availableStock.ToList();
            _cmbStockItem.DisplayMember = nameof(Stock.ItemName);
            _cmbStockItem.ValueMember = nameof(Stock.StockId);

            var rate = await _goldRateService.GetLatestAsync();
            _currentGoldRate = rate?.Rate22K ?? 0;
        };
    }

    private async Task FindInvoicesAsync()
    {
        var term = _txtSearch.Text.Trim();
        if (term.Length == 0) return;

        _matches = await _invoiceService.SearchInvoicesAsync(term, null, null, "Confirmed", null);
        _cmbMatches.DataSource = null;
        _cmbMatches.DataSource = _matches.ToList();
        _cmbMatches.DisplayMember = nameof(Invoice.InvoiceNumber);
        _cmbMatches.ValueMember = nameof(Invoice.InvoiceId);

        if (_matches.Count == 0)
            MessageBox.Show(this, "No confirmed invoices matched that search.", "Return / Exchange", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private async Task LoadSelectedInvoiceAsync()
    {
        if (_cmbMatches.SelectedValue is not int invoiceId) return;

        _original = await _invoiceService.GetWithDetailsAsync(invoiceId);
        _gridOriginal.Rows.Clear();
        if (_original is null) return;

        foreach (var detail in _original.InvoiceDetails.Where(d => d.Quantity > 0))
        {
            var rowIndex = _gridOriginal.Rows.Add(false, detail.Stock?.ItemName ?? $"Stock #{detail.StockId}",
                detail.Quantity, detail.LineTotal.ToString("N0"), detail.Quantity.ToString(), detail.LineTotal.ToString("0.00"));
            _gridOriginal.Rows[rowIndex].Tag = detail;
        }

        RecalculateTotals();
    }

    private void AddNewLine()
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

        _newLines.Add((stock, dialog.Line));
        RefreshNewLinesGrid();
    }

    private void RefreshNewLinesGrid()
    {
        _gridNewItems.Rows.Clear();
        foreach (var (stock, line) in _newLines)
            _gridNewItems.Rows.Add(stock.ItemName, line.NetWeight.ToString("N3"), line.Rate.ToString("N0"), line.MakingCharge.ToString("N0"), line.LineTotal.ToString("N0"));
        RecalculateTotals();
    }

    private void RecalculateTotals()
    {
        decimal refundTotal = 0;
        foreach (DataGridViewRow row in _gridOriginal.Rows)
        {
            if (row.Cells["Select"].Value is true && decimal.TryParse(row.Cells["RefundAmount"].Value?.ToString(), out var refund))
                refundTotal += refund;
        }

        var newItemsTotal = _newLines.Sum(l => l.Line.LineTotal);

        _lblRefundTotal.Text = $"Refund: {refundTotal:C0}";
        _lblNewItemsTotal.Text = $"New Items: {newItemsTotal:C0}";
        var net = newItemsTotal - refundTotal;
        _lblNetAmount.Text = net >= 0 ? $"Additional Due: {net:C0}" : $"Net Refund: {-net:C0}";
    }

    private async Task SubmitAsync()
    {
        if (_original is null)
        {
            MessageBox.Show(this, "Find and select the original invoice first.", "Return / Exchange", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var returnLines = new List<ReturnLineRequest>();
        foreach (DataGridViewRow row in _gridOriginal.Rows)
        {
            if (row.Cells["Select"].Value is not true) continue;
            if (row.Tag is not InvoiceDetail detail) continue;

            var returnQty = int.TryParse(row.Cells["ReturnQty"].Value?.ToString(), out var qty) ? qty : 0;
            var refundAmount = decimal.TryParse(row.Cells["RefundAmount"].Value?.ToString(), out var amt) ? amt : 0;

            if (returnQty <= 0)
            {
                MessageBox.Show(this, $"Enter a valid return quantity for '{detail.Stock?.ItemName}'.", "Return / Exchange", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            returnLines.Add(new ReturnLineRequest
            {
                OriginalInvoiceDetailId = detail.InvoiceDetailId,
                StockId = detail.StockId,
                Quantity = returnQty,
                NetWeight = detail.NetWeight / detail.Quantity * returnQty,
                Rate = detail.Rate,
                RefundAmount = refundAmount
            });
        }

        if (returnLines.Count == 0)
        {
            MessageBox.Show(this, "Tick at least one line to return.", "Return / Exchange", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var request = new ProcessReturnRequest
        {
            OriginalInvoiceId = _original.InvoiceId,
            ReturnLines = returnLines,
            NewLines = _newLines.Select(l => l.Line).ToList(),
            GoldRateAtSale = _currentGoldRate,
            CreatedBy = _createdBy
        };

        try
        {
            var result = await _invoiceService.ProcessReturnAsync(request);
            MessageBox.Show(this,
                $"{(result.ExchangeInvoiceId.HasValue ? "Exchange" : "Return")} {result.ReturnInvoiceNumber} processed.\n" +
                $"Refund: {result.RefundAmount:C0}\nAdditional amount due: {result.AdditionalAmountDue:C0}",
                "Processed", MessageBoxButtons.OK, MessageBoxIcon.Information);

            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not process return/exchange", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
