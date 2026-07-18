using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>Inventory management screen: browse/search stock, add/edit items (with barcode
/// auto-generated on creation - see <see cref="IStockService.CreateAsync"/>), and flag low-stock
/// items in red.</summary>
public class UcStock : UserControl, IAsyncLoadable
{
    private readonly IStockService _stockService;
    private readonly ICrudService<StockCategory> _categoryService;

    private readonly Guna2TextBox _txtSearch;
    private readonly DataGridView _grid;
    private IReadOnlyList<Domain.Entities.Stock> _allItems = Array.Empty<Domain.Entities.Stock>();

    public UcStock(IStockService stockService, ICrudService<StockCategory> categoryService)
    {
        _stockService = stockService;
        _categoryService = categoryService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Stock / Inventory", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var toolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundDark };
        _txtSearch = new Guna2TextBox
        {
            PlaceholderText = "Search item name or code...", Location = new Point(0, 8), Size = new Size(280, 38),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 8
        };
        _txtSearch.TextChanged += (_, _) => ApplyFilter();

        var btnAdd = MakeButton("+ Add Item", ThemeColors.GoldPrimary, ThemeColors.TextOnGold, 300);
        var btnEdit = MakeButton("Edit", ThemeColors.BackgroundCard, ThemeColors.TextPrimary, 400);
        var btnDeactivate = MakeButton("Remove", ThemeColors.BackgroundCard, ThemeColors.Danger, 480);
        var btnRefresh = MakeButton("⟳ Refresh", ThemeColors.BackgroundCard, ThemeColors.TextSecondary, 580);

        btnAdd.Click += async (_, _) => await AddItemAsync();
        btnEdit.Click += async (_, _) => await EditItemAsync();
        btnDeactivate.Click += async (_, _) => await DeactivateItemAsync();
        btnRefresh.Click += async (_, _) => await LoadAsync();

        toolbar.Controls.Add(_txtSearch);
        toolbar.Controls.Add(btnAdd);
        toolbar.Controls.Add(btnEdit);
        toolbar.Controls.Add(btnDeactivate);
        toolbar.Controls.Add(btnRefresh);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, AllowUserToDeleteRows = false, ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, MultiSelect = false,
            EnableHeadersVisualStyles = false, GridColor = ThemeColors.BorderSubtle,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 36,
            RowTemplate = { Height = 32 }
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.DefaultCellStyle.SelectionBackColor = ThemeColors.BackgroundHover;
        _grid.DefaultCellStyle.SelectionForeColor = ThemeColors.GoldPrimary;
        _grid.Columns.Add("ItemCode", "Item Code");
        _grid.Columns.Add("ItemName", "Item Name");
        _grid.Columns.Add("Category", "Category");
        _grid.Columns.Add("Purity", "Purity");
        _grid.Columns.Add("NetWeight", "Net Wt (g)");
        _grid.Columns.Add("Quantity", "Qty");
        _grid.Columns.Add("PurchaseValue", "Purchase Value");
        _grid.CellFormatting += Grid_CellFormatting;

        Controls.Add(_grid);
        Controls.Add(toolbar);
        Controls.Add(titleLabel);
    }

    private static Guna2Button MakeButton(string text, Color fill, Color fore, int x) => new()
    {
        Text = text, Location = new Point(x, 8), Size = new Size(90, 38),
        FillColor = fill, ForeColor = fore, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold)
    };

    private void Grid_CellFormatting(object? sender, DataGridViewCellFormattingEventArgs e)
    {
        if (e.RowIndex < 0 || e.RowIndex >= _grid.Rows.Count) return;
        if (_grid.Rows[e.RowIndex].Tag is not Domain.Entities.Stock stock) return;

        _grid.Rows[e.RowIndex].DefaultCellStyle.ForeColor = stock.IsLowStock ? ThemeColors.Danger : ThemeColors.TextPrimary;
    }

    public async Task LoadAsync()
    {
        _allItems = await _stockService.GetAllAsync();
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var term = _txtSearch.Text.Trim();
        var filtered = string.IsNullOrEmpty(term)
            ? _allItems
            : _allItems.Where(s => s.ItemName.Contains(term, StringComparison.OrdinalIgnoreCase) || s.ItemCode.Contains(term, StringComparison.OrdinalIgnoreCase)).ToList();

        _grid.Rows.Clear();
        foreach (var item in filtered)
        {
            var rowIndex = _grid.Rows.Add(item.ItemCode, item.ItemName, item.Category?.CategoryName ?? string.Empty,
                item.Purity, item.NetWeight.ToString("N3"), item.Quantity, item.PurchaseValue.ToString("N0"));
            _grid.Rows[rowIndex].Tag = item;
        }
    }

    private Domain.Entities.Stock? GetSelected() => _grid.SelectedRows.Count > 0 ? _grid.SelectedRows[0].Tag as Domain.Entities.Stock : null;

    private async Task AddItemAsync()
    {
        var categories = await _categoryService.GetAllAsync();
        if (categories.Count == 0)
        {
            MessageBox.Show(this, "Create at least one stock category first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var stock = new Domain.Entities.Stock { CategoryId = categories[0].CategoryId, Quantity = 1 };
        using var dialog = new StockEditForm("Add Stock Item", stock, categories);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _stockService.CreateAsync(dialog.Result);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task EditItemAsync()
    {
        var stock = GetSelected();
        if (stock is null)
        {
            MessageBox.Show(this, "Select an item to edit first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var categories = await _categoryService.GetAllAsync();
        using var dialog = new StockEditForm("Edit Stock Item", stock, categories);
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

    private async Task DeactivateItemAsync()
    {
        var stock = GetSelected();
        if (stock is null)
        {
            MessageBox.Show(this, "Select an item first.", "Stock", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var confirm = MessageBox.Show(this, $"Remove '{stock.ItemName}' from active stock?", "Stock", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        try
        {
            await _stockService.DeactivateAsync(stock.StockId);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not remove", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
