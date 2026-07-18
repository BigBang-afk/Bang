using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// The Stock Management module: a professional inventory grid (live search, multi-field
/// filter, real column sorting, visual grouping, Excel/PDF export, printing, barcode/QR
/// labels) plus two dedicated fast-entry tabs - Bulk Entry (the 100-items-without-reopening-
/// a-form grid) and Excel Import.
/// </summary>
public class UcStock : UserControl, IAsyncLoadable
{
    private readonly IStockService _stockService;
    private readonly ICrudService<StockCategory> _categoryService;
    private readonly ICrudService<Karigar> _karigarService;
    private readonly ISupplierService _supplierService;
    private readonly IImageService _imageService;

    private readonly TabControl _tabs;
    private readonly Guna2TextBox _txtSearch;
    private readonly Guna2ComboBox _cmbFilterCategory;
    private readonly Guna2ComboBox _cmbFilterStatus;
    private readonly Guna2ComboBox _cmbGroupBy;
    private readonly DataGridView _grid;
    private readonly Label _lblSummary;

    private readonly SortableBindingList<StockRowViewModel> _bindingList = new();
    private IReadOnlyList<Domain.Entities.Stock> _allStock = Array.Empty<Domain.Entities.Stock>();
    private IReadOnlyList<StockCategory> _categories = Array.Empty<StockCategory>();
    private IReadOnlyList<Karigar> _karigars = Array.Empty<Karigar>();
    private IReadOnlyList<Supplier> _suppliers = Array.Empty<Supplier>();

    private UcBulkStockEntry? _bulkEntryTabControl;
    private UcExcelImport? _excelImportTabControl;

    public UcStock(IStockService stockService, ICrudService<StockCategory> categoryService,
        ICrudService<Karigar> karigarService, ISupplierService supplierService,
        IImageService imageService)
    {
        _stockService = stockService;
        _categoryService = categoryService;
        _karigarService = karigarService;
        _supplierService = supplierService;
        _imageService = imageService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;

        _tabs = new TabControl { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9.5F) };
        Controls.Add(_tabs);

        var tabInventory = new TabPage("Inventory") { BackColor = ThemeColors.BackgroundDark };
        var tabBulkEntry = new TabPage("Bulk / Multiple Stock Entry") { BackColor = ThemeColors.BackgroundDark };
        var tabImport = new TabPage("Excel Import") { BackColor = ThemeColors.BackgroundDark };
        _tabs.TabPages.Add(tabInventory);
        _tabs.TabPages.Add(tabBulkEntry);
        _tabs.TabPages.Add(tabImport);

        // ---------------------------------------------------------------- Inventory tab
        var pnlRoot = new Panel { Dock = DockStyle.Fill, Padding = new Padding(20), BackColor = ThemeColors.BackgroundDark };
        tabInventory.Controls.Add(pnlRoot);

        var titleLabel = new Label { Text = "Stock / Inventory", Dock = DockStyle.Top, Height = 36, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlToolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 96, FillColor = ThemeColors.BackgroundDark };

        Label Caption(string text, int x, int y) => new() { Text = text, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 7.5F, FontStyle.Bold), Location = new Point(x, y), AutoSize = true };

        pnlToolbar.Controls.Add(Caption("SEARCH", 0, 0));
        _txtSearch = new Guna2TextBox { PlaceholderText = "Type to search name, code, design, brand, hallmark...", Location = new Point(0, 18), Size = new Size(300, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 8 };
        _txtSearch.TextChanged += (_, _) => ApplyFilters();
        pnlToolbar.Controls.Add(_txtSearch);

        pnlToolbar.Controls.Add(Caption("CATEGORY", 312, 0));
        _cmbFilterCategory = new Guna2ComboBox { Location = new Point(312, 18), Size = new Size(150, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 8, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbFilterCategory.SelectedIndexChanged += (_, _) => ApplyFilters();
        pnlToolbar.Controls.Add(_cmbFilterCategory);

        pnlToolbar.Controls.Add(Caption("STATUS", 474, 0));
        _cmbFilterStatus = new Guna2ComboBox { Location = new Point(474, 18), Size = new Size(140, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 8, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbFilterStatus.DataSource = new[] { "All", "Active", "Sold", "Reserved", "Repair", "Melted", "Returned" };
        _cmbFilterStatus.SelectedIndexChanged += (_, _) => ApplyFilters();
        pnlToolbar.Controls.Add(_cmbFilterStatus);

        pnlToolbar.Controls.Add(Caption("GROUP BY", 626, 0));
        _cmbGroupBy = new Guna2ComboBox { Location = new Point(626, 18), Size = new Size(140, 36), FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 8, DropDownStyle = ComboBoxStyle.DropDownList };
        _cmbGroupBy.DataSource = new[] { "None", "Category", "Status", "Karigar", "Supplier", "Metal Type" };
        _cmbGroupBy.SelectedIndexChanged += (_, _) => ApplyFilters();
        pnlToolbar.Controls.Add(_cmbGroupBy);

        int bx = 0;
        Guna2Button ToolbarButton(string text, Color fill, Color fore)
        {
            var button = new Guna2Button { Text = text, Location = new Point(bx, 60), Size = new Size(108, 34), FillColor = fill, ForeColor = fore, BorderRadius = 8, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            bx += 116;
            pnlToolbar.Controls.Add(button);
            return button;
        }

        var btnAdd = ToolbarButton("+ Add Item", ThemeColors.GoldPrimary, ThemeColors.TextOnGold);
        var btnEdit = ToolbarButton("Edit", ThemeColors.BackgroundCard, ThemeColors.TextPrimary);
        var btnRemove = ToolbarButton("Remove", ThemeColors.BackgroundCard, ThemeColors.Danger);
        var btnCategories = ToolbarButton("Categories", ThemeColors.BackgroundCard, ThemeColors.TextPrimary);
        var btnBarcode = ToolbarButton("Barcode / QR", ThemeColors.BackgroundCard, ThemeColors.TextPrimary);
        var btnExportExcel = ToolbarButton("Export Excel", ThemeColors.BackgroundCard, ThemeColors.Success);
        var btnExportPdf = ToolbarButton("Export PDF", ThemeColors.BackgroundCard, ThemeColors.Info);
        var btnPrint = ToolbarButton("Print", ThemeColors.BackgroundCard, ThemeColors.TextSecondary);
        var btnRefresh = ToolbarButton("⟳ Refresh", ThemeColors.BackgroundCard, ThemeColors.TextSecondary);

        btnAdd.Click += async (_, _) => await AddItemAsync();
        btnEdit.Click += async (_, _) => await EditItemAsync();
        btnRemove.Click += async (_, _) => await RemoveItemAsync();
        btnCategories.Click += async (_, _) => await ManageCategoriesAsync();
        btnBarcode.Click += (_, _) => ShowBarcodeForSelected();
        btnExportExcel.Click += (_, _) => ExportToExcel();
        btnExportPdf.Click += (_, _) => ExportToPdf();
        btnPrint.Click += (_, _) => PrintGrid();
        btnRefresh.Click += async (_, _) => await LoadAsync();

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, AllowUserToDeleteRows = false, ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, MultiSelect = false,
            EnableHeadersVisualStyles = false, GridColor = ThemeColors.BorderSubtle,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.AllCells, ColumnHeadersHeight = 34,
            RowTemplate = { Height = 30 }, AutoGenerateColumns = true, DataSource = _bindingList
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.DefaultCellStyle.SelectionBackColor = ThemeColors.BackgroundHover;
        _grid.DefaultCellStyle.SelectionForeColor = ThemeColors.GoldPrimary;
        _grid.DataBindingComplete += (_, _) => FormatColumns();
        _grid.CellFormatting += Grid_CellFormatting;
        _grid.CellDoubleClick += async (_, e) => { if (e.RowIndex >= 0) await EditItemAsync(); };

        _lblSummary = new Label { Dock = DockStyle.Bottom, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F), TextAlign = ContentAlignment.MiddleLeft };

        pnlRoot.Controls.Add(_grid);
        pnlRoot.Controls.Add(_lblSummary);
        pnlRoot.Controls.Add(pnlToolbar);
        pnlRoot.Controls.Add(titleLabel);

        // ---------------------------------------------------------------- Bulk Entry / Import tabs
        // Built lazily the first time each tab is opened, so a user who only ever uses the
        // Inventory list never pays for loading data these tabs need.
        _tabs.SelectedIndexChanged += async (_, _) => await EnsureTabLoadedAsync();
    }

    private async Task EnsureTabLoadedAsync()
    {
        if (_tabs.SelectedTab == _tabs.TabPages[1] && _bulkEntryTabControl is null)
        {
            _bulkEntryTabControl = new UcBulkStockEntry(_stockService, _categoryService, _karigarService, _supplierService) { Dock = DockStyle.Fill };
            _tabs.TabPages[1].Controls.Add(_bulkEntryTabControl);
            await _bulkEntryTabControl.LoadAsync();
        }
        else if (_tabs.SelectedTab == _tabs.TabPages[2] && _excelImportTabControl is null)
        {
            _excelImportTabControl = new UcExcelImport(_stockService) { Dock = DockStyle.Fill };
            _tabs.TabPages[2].Controls.Add(_excelImportTabControl);
        }
    }

    public async Task LoadAsync()
    {
        _allStock = await _stockService.GetAllWithDetailsAsync();
        _categories = await _categoryService.GetAllAsync();
        _karigars = await _karigarService.GetAllAsync();
        _suppliers = await _supplierService.GetAllAsync();

        var categoryOptions = new List<string> { "All" }.Concat(_categories.Select(c => c.CategoryName)).ToList();
        _cmbFilterCategory.DataSource = categoryOptions;

        ApplyFilters();

        // Re-fresh the Bulk Entry tab's lookup lists too, if it's already open.
        if (_bulkEntryTabControl is not null)
            await _bulkEntryTabControl.LoadAsync();
    }

    private void ApplyFilters()
    {
        IEnumerable<Domain.Entities.Stock> query = _allStock;

        var term = _txtSearch.Text.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            query = query.Where(s =>
                s.ItemName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                s.ItemCode.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (s.DesignNumber?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (s.Brand?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (s.HallmarkNumber?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (s.SerialNumber?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        if (_cmbFilterCategory.SelectedItem is string categoryFilter && categoryFilter != "All")
            query = query.Where(s => s.Category?.CategoryName == categoryFilter);

        if (_cmbFilterStatus.SelectedItem is string statusFilter && statusFilter != "All")
            query = query.Where(s => s.ItemStatus == statusFilter);

        var groupBy = _cmbGroupBy.SelectedItem as string ?? "None";
        query = groupBy switch
        {
            "Category" => query.OrderBy(s => s.Category?.CategoryName).ThenBy(s => s.ItemName),
            "Status" => query.OrderBy(s => s.ItemStatus).ThenBy(s => s.ItemName),
            "Karigar" => query.OrderBy(s => s.Karigar?.FullName ?? "zzz").ThenBy(s => s.ItemName),
            "Supplier" => query.OrderBy(s => s.Supplier?.CompanyName ?? "zzz").ThenBy(s => s.ItemName),
            "Metal Type" => query.OrderBy(s => s.MetalType).ThenBy(s => s.ItemName),
            _ => query.OrderByDescending(s => s.CreatedDate)
        };

        var rows = query.Select(s => new StockRowViewModel(s)).ToList();
        _bindingList.ResetItems(rows);

        _lblSummary.Text = $"{rows.Count} item(s) - Total stock value {rows.Sum(r => r.PurchaseValue):C0} - " +
                           $"{rows.Count(r => r.IsLowStock)} low stock";
    }

    private void FormatColumns()
    {
        void Format(string name, string header, string? format = null, int? width = null)
        {
            if (!_grid.Columns.Contains(name)) return;
            _grid.Columns[name].HeaderText = header;
            if (format is not null) _grid.Columns[name].DefaultCellStyle.Format = format;
            if (width is not null) _grid.Columns[name].Width = width.Value;
        }

        Format(nameof(StockRowViewModel.StockId), "ID", width: 50);
        Format(nameof(StockRowViewModel.ItemCode), "Item Code");
        Format(nameof(StockRowViewModel.ItemName), "Item Name", width: 180);
        Format(nameof(StockRowViewModel.Category), "Category");
        Format(nameof(StockRowViewModel.MetalType), "Metal");
        Format(nameof(StockRowViewModel.Purity), "Purity");
        Format(nameof(StockRowViewModel.NetWeight), "Net Wt (g)", "N3");
        Format(nameof(StockRowViewModel.FineGoldWeight), "Fine Gold (g)", "N3");
        Format(nameof(StockRowViewModel.Quantity), "Qty");
        Format(nameof(StockRowViewModel.PurchaseValue), "Purchase Value", "N0");
        Format(nameof(StockRowViewModel.SaleRate), "Sale Rate", "N0");
        Format(nameof(StockRowViewModel.ItemStatus), "Status");
        Format(nameof(StockRowViewModel.Karigar), "Karigar");
        Format(nameof(StockRowViewModel.Supplier), "Supplier");
        Format(nameof(StockRowViewModel.Brand), "Brand");
        Format(nameof(StockRowViewModel.DesignNumber), "Design #");
        Format(nameof(StockRowViewModel.ShelfNumber), "Shelf");
        Format(nameof(StockRowViewModel.Gender), "Gender");
        Format(nameof(StockRowViewModel.IsLowStock), "Low Stock?", width: 70);
        Format(nameof(StockRowViewModel.CreatedDate), "Added On", "d");
    }

    private void Grid_CellFormatting(object? sender, DataGridViewCellFormattingEventArgs e)
    {
        if (e.RowIndex < 0 || e.RowIndex >= _grid.Rows.Count) return;
        if (_grid.Rows[e.RowIndex].DataBoundItem is not StockRowViewModel row) return;

        _grid.Rows[e.RowIndex].DefaultCellStyle.ForeColor = row.IsLowStock ? ThemeColors.Danger : ThemeColors.TextPrimary;

        if (_grid.Columns[e.ColumnIndex].Name == nameof(StockRowViewModel.ItemStatus))
        {
            e.CellStyle!.ForeColor = row.ItemStatus switch
            {
                "Active" => ThemeColors.Success,
                "Sold" => ThemeColors.TextMuted,
                "Reserved" => ThemeColors.Info,
                "Repair" => ThemeColors.Warning,
                "Melted" or "Returned" => ThemeColors.Danger,
                _ => ThemeColors.TextPrimary
            };
        }
    }

    private StockRowViewModel? GetSelectedRow() => _grid.SelectedRows.Count > 0 ? _grid.SelectedRows[0].DataBoundItem as StockRowViewModel : null;

    private async Task AddItemAsync()
    {
        if (_categories.Count == 0)
        {
            MessageBox.Show(this, "Create at least one stock category first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var stock = new Domain.Entities.Stock { CategoryId = _categories.First(c => c.ParentCategoryId is null).CategoryId, Quantity = 1 };
        using var dialog = new StockEditForm("Add Stock Item", stock, _categories, _karigars, _suppliers, _imageService, isNewItem: true);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            var created = await _stockService.CreateAsync(dialog.Result);
            await dialog.ImageGallery.FlushPendingImagesAsync(created.StockId);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task EditItemAsync()
    {
        var row = GetSelectedRow();
        if (row is null)
        {
            MessageBox.Show(this, "Select an item to edit first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using var dialog = new StockEditForm("Edit Stock Item", row.Source, _categories, _karigars, _suppliers, _imageService, isNewItem: false);
        await dialog.ImageGallery.BindToEntityAsync(row.StockId);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _stockService.UpdateAsync(dialog.Result);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task RemoveItemAsync()
    {
        var row = GetSelectedRow();
        if (row is null)
        {
            MessageBox.Show(this, "Select an item first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var confirm = MessageBox.Show(this, $"Remove '{row.ItemName}' from active stock?", "Stock", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        try
        {
            await _stockService.DeactivateAsync(row.StockId);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not remove", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task ManageCategoriesAsync()
    {
        using var dialog = new CategoryManagerForm(_categoryService);
        dialog.ShowDialog(this);

        if (dialog.ChangesMade)
            await LoadAsync();
    }

    private void ShowBarcodeForSelected()
    {
        var row = GetSelectedRow();
        if (row is null)
        {
            MessageBox.Show(this, "Select an item first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var barcodeValue = row.Source.Barcodes.FirstOrDefault()?.BarcodeValue ?? row.ItemCode;
        using var labelForm = new BarcodeLabelForm(row.ItemName, row.ItemCode, barcodeValue);
        labelForm.ShowDialog(this);
    }

    private void ExportToExcel()
    {
        using var dialog = new SaveFileDialog { Filter = "Excel Workbook|*.xlsx", FileName = $"Stock-{DateTime.Now:yyyyMMdd}.xlsx" };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        var (headers, rows) = BuildExportTable();
        ExcelHelper.ExportRows(dialog.FileName, "Stock", headers, rows);
        MessageBox.Show(this, "Export complete.", "Export Excel", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void ExportToPdf()
    {
        using var dialog = new SaveFileDialog { Filter = "PDF Document|*.pdf", FileName = $"Stock-{DateTime.Now:yyyyMMdd}.pdf" };
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        var (headers, rows) = BuildExportTable();
        PdfExportHelper.ExportTable(dialog.FileName, "Zarghoon Jewellers - Stock Report", headers, rows);
        MessageBox.Show(this, "Export complete.", "Export PDF", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void PrintGrid()
    {
        var (headers, rows) = BuildExportTable();
        var printDocument = new TablePrintDocument("Zarghoon Jewellers - Stock Report", headers, rows);
        using var preview = new PrintPreviewDialog { Document = printDocument, Width = 900, Height = 700 };
        preview.ShowDialog(this);
    }

    private (List<string> Headers, List<string[]> Rows) BuildExportTable()
    {
        var headers = new List<string> { "Item Code", "Item Name", "Category", "Metal", "Purity", "Net Wt (g)", "Qty", "Purchase Value", "Sale Rate", "Status", "Karigar", "Supplier" };
        var rows = _bindingList.Select(r => new[]
        {
            r.ItemCode, r.ItemName, r.Category, r.MetalType, r.Purity, r.NetWeight.ToString("N3"),
            r.Quantity.ToString(), r.PurchaseValue.ToString("N0"), r.SaleRate.ToString("N0"), r.ItemStatus, r.Karigar, r.Supplier
        }).ToList();
        return (headers, rows);
    }
}
