using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// The flagship rapid stock-entry grid: add 100+ items without ever leaving the sheet.
/// Enter/Tab auto-advance the cursor (wrapping to a freshly-added row at the end), Ctrl+D
/// duplicates the row above, Ctrl+C/Ctrl+V copy/paste a whole row, Ctrl+Z/Ctrl+Y undo/redo
/// row-level actions (add/delete/duplicate/paste), and the sheet autosaves a local draft every
/// few seconds so a crash or accidental close never loses entered work. Net weight, fine gold
/// weight, purchase value and profit recalculate live via the same <see cref="JewelryCalculator"/>
/// the server uses, so what you see here is exactly what gets saved.
/// </summary>
public class UcBulkStockEntry : UserControl, IAsyncLoadable
{
    private const string DraftName = "BulkStockEntry";
    private const int MaxUndoDepth = 50;

    private readonly IStockService _stockService;
    private readonly ICrudService<StockCategory> _categoryService;
    private readonly ICrudService<Karigar> _karigarService;
    private readonly ISupplierService _supplierService;

    private readonly DataGridView _grid;
    private readonly Label _lblStatus;
    private readonly Label _lblDraftStatus;
    private readonly Guna2CheckBox _chkPrintBarcodesAfterSave;
    private readonly System.Windows.Forms.Timer _autoSaveTimer;

    private IReadOnlyList<StockCategory> _categories = Array.Empty<StockCategory>();
    private IReadOnlyList<Karigar> _karigars = Array.Empty<Karigar>();
    private IReadOnlyList<Supplier> _suppliers = Array.Empty<Supplier>();

    private readonly Stack<List<BulkEntryRow>> _undoStack = new();
    private readonly Stack<List<BulkEntryRow>> _redoStack = new();
    private BulkEntryRow? _copiedRow;
    private bool _suppressRecalculation;

    public UcBulkStockEntry(IStockService stockService, ICrudService<StockCategory> categoryService,
        ICrudService<Karigar> karigarService, ISupplierService supplierService)
    {
        _stockService = stockService;
        _categoryService = categoryService;
        _karigarService = karigarService;
        _supplierService = supplierService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Bulk / Multiple Stock Entry", Dock = DockStyle.Top, Height = 34, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var pnlToolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 48, FillColor = ThemeColors.BackgroundDark };
        int bx = 0;
        Guna2Button ToolbarButton(string text, Color fill, Color fore, int width = 120)
        {
            var button = new Guna2Button { Text = text, Location = new Point(bx, 4), Size = new Size(width, 38), FillColor = fill, ForeColor = fore, BorderRadius = 8, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            bx += width + 8;
            pnlToolbar.Controls.Add(button);
            return button;
        }

        var btnAddRow = ToolbarButton("+ Add Row", ThemeColors.BackgroundCard, ThemeColors.TextPrimary);
        var btnDuplicate = ToolbarButton("Duplicate (Ctrl+D)", ThemeColors.BackgroundCard, ThemeColors.TextPrimary, 150);
        var btnDeleteRow = ToolbarButton("Delete Row", ThemeColors.BackgroundCard, ThemeColors.Danger);
        var btnUndo = ToolbarButton("Undo (Ctrl+Z)", ThemeColors.BackgroundCard, ThemeColors.TextSecondary, 130);
        var btnRedo = ToolbarButton("Redo (Ctrl+Y)", ThemeColors.BackgroundCard, ThemeColors.TextSecondary, 130);
        var btnClearAll = ToolbarButton("Clear All", ThemeColors.BackgroundCard, ThemeColors.TextSecondary);
        var btnSaveAll = ToolbarButton("💾 SAVE ALL", ThemeColors.GoldPrimary, ThemeColors.TextOnGold, 150);

        _chkPrintBarcodesAfterSave = new Guna2CheckBox
        {
            Text = "Print barcodes after save", Location = new Point(bx + 10, 10), AutoSize = true,
            ForeColor = ThemeColors.TextSecondary, Checked = true
        };
        _chkPrintBarcodesAfterSave.CheckedState.FillColor = ThemeColors.GoldPrimary;
        pnlToolbar.Controls.Add(_chkPrintBarcodesAfterSave);

        btnAddRow.Click += (_, _) => { PushUndoSnapshot(); AddEmptyRow(); };
        btnDuplicate.Click += (_, _) => DuplicatePreviousRow();
        btnDeleteRow.Click += (_, _) => DeleteCurrentRow();
        btnUndo.Click += (_, _) => Undo();
        btnRedo.Click += (_, _) => Redo();
        btnClearAll.Click += (_, _) => ClearAll();
        btnSaveAll.Click += async (_, _) => await SaveAllAsync();

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = true, RowHeadersWidth = 40, AllowUserToAddRows = false, AllowUserToDeleteRows = false,
            EditMode = DataGridViewEditMode.EditOnKeystrokeOrF2, SelectionMode = DataGridViewSelectionMode.CellSelect,
            EnableHeadersVisualStyles = false, GridColor = ThemeColors.BorderSubtle,
            ColumnHeadersHeight = 34, RowTemplate = { Height = 28 }, StandardTab = false,
            ClipboardCopyMode = DataGridViewClipboardCopyMode.EnableWithoutHeaderText
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.DefaultCellStyle.SelectionBackColor = ThemeColors.BackgroundHover;
        _grid.DefaultCellStyle.SelectionForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.Font = new Font("Segoe UI", 8.5F);

        BuildColumns();
        _grid.KeyDown += Grid_KeyDown;
        _grid.CellValueChanged += Grid_CellValueChanged;
        _grid.CurrentCellDirtyStateChanged += (_, _) => { if (_grid.IsCurrentCellDirty) _grid.CommitEdit(DataGridViewDataErrorContexts.Commit); };
        _grid.CellBeginEdit += Grid_CellBeginEdit;

        _lblStatus = new Label { Dock = DockStyle.Bottom, Height = 24, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8.5F) };
        _lblDraftStatus = new Label { Dock = DockStyle.Bottom, Height = 22, ForeColor = ThemeColors.Warning, Font = new Font("Segoe UI", 8F, FontStyle.Italic) };

        Controls.Add(_grid);
        Controls.Add(_lblStatus);
        Controls.Add(_lblDraftStatus);
        Controls.Add(pnlToolbar);
        Controls.Add(titleLabel);

        _autoSaveTimer = new System.Windows.Forms.Timer { Interval = 15000 };
        _autoSaveTimer.Tick += (_, _) => SaveDraft();
        _autoSaveTimer.Start();

        Load += async (_, _) => await OfferDraftRestoreAsync();
        Disposed += (_, _) => _autoSaveTimer.Dispose();
    }

    private void BuildColumns()
    {
        _grid.Columns.Clear();

        DataGridViewTextBoxColumn Text(string name, string header, int width = 100, bool readOnly = false)
        {
            var col = new DataGridViewTextBoxColumn { Name = name, HeaderText = header, Width = width, ReadOnly = readOnly };
            if (readOnly) col.DefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
            _grid.Columns.Add(col);
            return col;
        }

        DataGridViewComboBoxColumn Combo(string name, string header, string[] items, int width = 110)
        {
            var col = new DataGridViewComboBoxColumn { Name = name, HeaderText = header, Width = width, DisplayStyle = DataGridViewComboBoxDisplayStyle.ComboBox, FlatStyle = FlatStyle.Flat };
            col.Items.AddRange(items);
            _grid.Columns.Add(col);
            return col;
        }

        Text("ItemName", "Item Name", 160);
        Combo("Category", "Category", Array.Empty<string>(), 130);
        Combo("SubCategory", "Sub Category", Array.Empty<string>(), 130);
        Combo("MetalType", "Metal", new[] { "Gold", "Silver", "Platinum", "Diamond", "Other" }, 90);
        Combo("Purity", "Purity", new[] { "24K", "22K", "21K", "18K" }, 70);
        Text("GrossWeight", "Gross Wt", 80);
        Text("StoneWeight", "Stone Wt", 80);
        Text("NetWeight", "Net Wt", 80, readOnly: true);
        Text("LossPercentage", "Loss %", 70);
        Text("FineGoldWeight", "Fine Gold Wt", 90, readOnly: true);
        Combo("MakingChargeType", "Making Type", new[] { "PerGram", "Fixed", "Percentage" }, 100);
        Text("MakingChargeValue", "Making Value", 90);
        Text("LaborCharges", "Labor", 80);
        Text("StoneValue", "Stone Value", 90);
        Text("Quantity", "Qty", 55);
        Text("PurchaseRate", "Purch. Rate", 90);
        Text("PurchaseValue", "Purchase Value", 100, readOnly: true);
        Text("SaleRate", "Sale Rate", 90);
        Text("Profit", "Profit", 90, readOnly: true);
        Combo("Karigar", "Karigar", Array.Empty<string>(), 120);
        Combo("Supplier", "Supplier", Array.Empty<string>(), 120);
        Text("HallmarkNumber", "Hallmark #", 90);
        Text("SerialNumber", "Serial # (auto)", 100);
        Text("BatchNumber", "Batch #", 80);
        Text("ShelfNumber", "Shelf #", 70);
        Text("DesignNumber", "Design #", 80);
        Text("Brand", "Brand", 90);
        Text("Collection", "Collection", 100);
        Text("Occasion", "Occasion", 90);
        Combo("Gender", "Gender", new[] { "Unisex", "Men", "Women", "Kids" }, 80);
        Combo("ItemStatus", "Status", new[] { "Active", "Sold", "Reserved", "Repair", "Melted", "Returned" }, 90);
    }

    public async Task LoadAsync()
    {
        _categories = await _categoryService.GetAllAsync();
        _karigars = await _karigarService.GetAllAsync();
        _suppliers = await _supplierService.GetAllAsync();

        SetComboItems("Category", _categories.Where(c => c.ParentCategoryId is null).Select(c => c.CategoryName));
        SetComboItems("Karigar", new[] { string.Empty }.Concat(_karigars.Select(k => k.FullName)));
        SetComboItems("Supplier", new[] { string.Empty }.Concat(_suppliers.Select(s => s.CompanyName)));

        if (_grid.Rows.Count == 0)
            AddEmptyRow();

        UpdateStatusLabel();
    }

    private void SetComboItems(string columnName, IEnumerable<string> items)
    {
        if (_grid.Columns[columnName] is not DataGridViewComboBoxColumn column) return;
        column.Items.Clear();
        column.Items.AddRange(items.Cast<object>().ToArray());
    }

    private void Grid_CellBeginEdit(object? sender, DataGridViewCellCancelEventArgs e)
    {
        // Sub Category options depend on whichever Category is selected on this specific row -
        // DataGridViewComboBoxColumn items are column-wide by default, so they're overridden
        // per-cell here right before editing starts.
        if (_grid.Columns[e.ColumnIndex].Name == "SubCategory")
            PopulateSubCategoryItemsForRow(e.RowIndex);
    }

    /// <summary>Refreshes the per-row SubCategory item list from the row's current Category value.
    /// Called both lazily (on CellBeginEdit) and eagerly whenever a row's values are set entirely by
    /// code (paste/duplicate/undo/restore) - a DataGridViewComboBoxCell whose Value isn't present in
    /// its own Items list renders a data-error glyph instead of the text, so code-driven writes must
    /// populate the matching items themselves rather than waiting for the user to open the dropdown.</summary>
    private void PopulateSubCategoryItemsForRow(int rowIndex)
    {
        var categoryName = _grid.Rows[rowIndex].Cells["Category"].Value?.ToString();
        var parent = _categories.FirstOrDefault(c => c.CategoryName == categoryName);
        var children = parent is null ? Enumerable.Empty<StockCategory>() : _categories.Where(c => c.ParentCategoryId == parent.CategoryId);

        if (_grid.Rows[rowIndex].Cells["SubCategory"] is DataGridViewComboBoxCell cell)
        {
            cell.Items.Clear();
            cell.Items.Add(string.Empty);
            foreach (var child in children) cell.Items.Add(child.CategoryName);
        }
    }

    private void Grid_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Control && e.KeyCode == Keys.D) { e.Handled = true; DuplicatePreviousRow(); return; }
        if (e.Control && e.KeyCode == Keys.C) { e.Handled = true; CopyCurrentRow(); return; }
        if (e.Control && e.KeyCode == Keys.V) { e.Handled = true; PasteIntoCurrentRow(); return; }
        if (e.Control && e.KeyCode == Keys.Z) { e.Handled = true; Undo(); return; }
        if (e.Control && e.KeyCode == Keys.Y) { e.Handled = true; Redo(); return; }

        if (e.KeyCode == Keys.Enter)
        {
            e.Handled = true;
            AdvanceCursor();
        }
    }

    /// <summary>Moves to the next column (like Tab), wrapping to the first editable column of the
    /// next row - adding a fresh row automatically when the user presses Enter on the last row.</summary>
    private void AdvanceCursor()
    {
        if (_grid.CurrentCell is null) return;

        var nextColumnIndex = _grid.CurrentCell.ColumnIndex + 1;
        var nextRowIndex = _grid.CurrentCell.RowIndex;

        if (nextColumnIndex >= _grid.ColumnCount)
        {
            nextColumnIndex = 0;
            nextRowIndex++;

            if (nextRowIndex >= _grid.Rows.Count)
                AddEmptyRow();
        }

        _grid.CurrentCell = _grid.Rows[nextRowIndex].Cells[nextColumnIndex];
    }

    private void AddEmptyRow()
    {
        var index = _grid.Rows.Add();
        _grid.Rows[index].Cells["Purity"].Value = "22K";
        _grid.Rows[index].Cells["MetalType"].Value = "Gold";
        _grid.Rows[index].Cells["MakingChargeType"].Value = "PerGram";
        _grid.Rows[index].Cells["Quantity"].Value = "1";
        _grid.Rows[index].Cells["Gender"].Value = "Unisex";
        _grid.Rows[index].Cells["ItemStatus"].Value = "Active";
        UpdateStatusLabel();
    }

    private void DuplicatePreviousRow()
    {
        var currentRowIndex = _grid.CurrentCell?.RowIndex ?? _grid.Rows.Count - 1;
        if (currentRowIndex <= 0) return;

        PushUndoSnapshot();
        for (int col = 0; col < _grid.ColumnCount; col++)
            _grid.Rows[currentRowIndex].Cells[col].Value = _grid.Rows[currentRowIndex - 1].Cells[col].Value;

        RecalculateRow(currentRowIndex);
    }

    private void CopyCurrentRow()
    {
        var rowIndex = _grid.CurrentCell?.RowIndex;
        if (rowIndex is null) return;
        _copiedRow = ExtractRow(_grid.Rows[rowIndex.Value]);
        _lblStatus.Text = "Row copied.";
    }

    private void PasteIntoCurrentRow()
    {
        var rowIndex = _grid.CurrentCell?.RowIndex;
        if (rowIndex is null || _copiedRow is null) return;

        PushUndoSnapshot();
        ApplyRow(_grid.Rows[rowIndex.Value], _copiedRow);
        RecalculateRow(rowIndex.Value);
    }

    private void DeleteCurrentRow()
    {
        var rowIndex = _grid.CurrentCell?.RowIndex;
        if (rowIndex is null || _grid.Rows.Count <= 1) return;

        PushUndoSnapshot();
        _grid.Rows.RemoveAt(rowIndex.Value);
        UpdateStatusLabel();
    }

    private void ClearAll()
    {
        if (MessageBox.Show(this, "Clear every row on this sheet? This cannot be undone once confirmed.",
            "Bulk Stock Entry", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;

        PushUndoSnapshot();
        _grid.Rows.Clear();
        AddEmptyRow();
    }

    // ---------------------------------------------------------------- Undo / Redo
    // Scoped to discrete row-level actions (add/delete/duplicate/paste/clear) rather than every
    // keystroke, so pressing Ctrl+Z undoes "that row I just pasted over by mistake" without
    // needing a character-by-character edit log.

    private void PushUndoSnapshot()
    {
        _undoStack.Push(ExtractAllRows());
        if (_undoStack.Count > MaxUndoDepth) TrimStack(_undoStack);
        _redoStack.Clear();
    }

    private void Undo()
    {
        if (_undoStack.Count == 0) return;
        _redoStack.Push(ExtractAllRows());
        RestoreAllRows(_undoStack.Pop());
    }

    private void Redo()
    {
        if (_redoStack.Count == 0) return;
        _undoStack.Push(ExtractAllRows());
        RestoreAllRows(_redoStack.Pop());
    }

    private static void TrimStack(Stack<List<BulkEntryRow>> stack)
    {
        var items = stack.ToArray();
        stack.Clear();
        for (int i = items.Length - 2; i >= 0; i--) stack.Push(items[i]);
    }

    // ---------------------------------------------------------------- Calculations

    private void Grid_CellValueChanged(object? sender, DataGridViewCellEventArgs e)
    {
        if (_suppressRecalculation || e.RowIndex < 0) return;

        var recalcTriggers = new[] { "GrossWeight", "StoneWeight", "LossPercentage", "Purity", "MakingChargeType", "MakingChargeValue", "LaborCharges", "StoneValue", "Quantity", "PurchaseRate", "SaleRate" };
        var columnName = _grid.Columns[e.ColumnIndex].Name;

        if (columnName == "Category")
        {
            // Changing Category doesn't clear an already-typed SubCategory value, but it does
            // refresh which options are actually valid so the dropdown reflects the new parent.
            PopulateSubCategoryItemsForRow(e.RowIndex);
        }
        else if (recalcTriggers.Contains(columnName))
        {
            RecalculateRow(e.RowIndex);
        }
    }

    private void RecalculateRow(int rowIndex)
    {
        _suppressRecalculation = true;
        try
        {
            // Keeps the SubCategory cell's per-row Items in sync with whatever Category ended up
            // in this row, whether the user picked it or it arrived via paste/duplicate/undo -
            // otherwise a value not present in Items renders as a data-error glyph.
            PopulateSubCategoryItemsForRow(rowIndex);

            var row = _grid.Rows[rowIndex];
            var gross = ParseDecimal(row.Cells["GrossWeight"].Value);
            var stone = ParseDecimal(row.Cells["StoneWeight"].Value);
            var netWeight = JewelryCalculator.CalculateNetWeight(gross, stone);
            var purity = row.Cells["Purity"].Value?.ToString() ?? "22K";
            var loss = ParseDecimal(row.Cells["LossPercentage"].Value);
            var qty = (int)ParseDecimal(row.Cells["Quantity"].Value);
            if (qty <= 0) qty = 1;
            var makingType = row.Cells["MakingChargeType"].Value?.ToString() ?? "PerGram";
            var makingValue = ParseDecimal(row.Cells["MakingChargeValue"].Value);
            var labor = ParseDecimal(row.Cells["LaborCharges"].Value);
            var stoneValue = ParseDecimal(row.Cells["StoneValue"].Value);
            var purchaseRate = ParseDecimal(row.Cells["PurchaseRate"].Value);
            var saleRate = ParseDecimal(row.Cells["SaleRate"].Value);

            var fineWeight = JewelryCalculator.CalculateFineGoldWeight(netWeight, purity, loss);
            var purchaseValue = JewelryCalculator.CalculatePurchaseValue(netWeight, purchaseRate, qty, makingType, makingValue, labor, stoneValue);
            var profit = JewelryCalculator.CalculateProfit(netWeight, purchaseRate, saleRate, qty, makingType, makingValue, labor, stoneValue);

            row.Cells["NetWeight"].Value = netWeight.ToString("N3");
            row.Cells["FineGoldWeight"].Value = fineWeight.ToString("N3");
            row.Cells["PurchaseValue"].Value = purchaseValue.ToString("N0");
            row.Cells["Profit"].Value = profit.ToString("N0");
            row.Cells["Profit"].Style.ForeColor = profit >= 0 ? ThemeColors.Success : ThemeColors.Danger;
        }
        finally
        {
            _suppressRecalculation = false;
        }
    }

    private static decimal ParseDecimal(object? value) => decimal.TryParse(value?.ToString(), out var d) ? d : 0;

    // ---------------------------------------------------------------- Row <-> model helpers

    private BulkEntryRow ExtractRow(DataGridViewRow row) => new()
    {
        ItemName = Str(row, "ItemName"),
        CategoryName = Str(row, "Category"),
        SubCategoryName = Str(row, "SubCategory"),
        MetalType = Str(row, "MetalType"),
        Purity = Str(row, "Purity"),
        GrossWeight = ParseDecimal(row.Cells["GrossWeight"].Value),
        StoneWeight = ParseDecimal(row.Cells["StoneWeight"].Value),
        LossPercentage = ParseDecimal(row.Cells["LossPercentage"].Value),
        MakingChargeType = Str(row, "MakingChargeType"),
        MakingChargeValue = ParseDecimal(row.Cells["MakingChargeValue"].Value),
        LaborCharges = ParseDecimal(row.Cells["LaborCharges"].Value),
        StoneValue = ParseDecimal(row.Cells["StoneValue"].Value),
        Quantity = (int)ParseDecimal(row.Cells["Quantity"].Value),
        PurchaseRate = ParseDecimal(row.Cells["PurchaseRate"].Value),
        SaleRate = ParseDecimal(row.Cells["SaleRate"].Value),
        KarigarName = Str(row, "Karigar"),
        SupplierName = Str(row, "Supplier"),
        HallmarkNumber = Str(row, "HallmarkNumber"),
        SerialNumber = Str(row, "SerialNumber"),
        BatchNumber = Str(row, "BatchNumber"),
        ShelfNumber = Str(row, "ShelfNumber"),
        DesignNumber = Str(row, "DesignNumber"),
        Brand = Str(row, "Brand"),
        Collection = Str(row, "Collection"),
        Occasion = Str(row, "Occasion"),
        Gender = string.IsNullOrWhiteSpace(Str(row, "Gender")) ? "Unisex" : Str(row, "Gender"),
        ItemStatus = string.IsNullOrWhiteSpace(Str(row, "ItemStatus")) ? "Active" : Str(row, "ItemStatus")
    };

    private static string Str(DataGridViewRow row, string column) => row.Cells[column].Value?.ToString() ?? string.Empty;

    private void ApplyRow(DataGridViewRow row, BulkEntryRow model)
    {
        row.Cells["ItemName"].Value = model.ItemName;
        row.Cells["Category"].Value = model.CategoryName;
        row.Cells["SubCategory"].Value = model.SubCategoryName;
        row.Cells["MetalType"].Value = model.MetalType;
        row.Cells["Purity"].Value = model.Purity;
        row.Cells["GrossWeight"].Value = model.GrossWeight.ToString("0.000");
        row.Cells["StoneWeight"].Value = model.StoneWeight.ToString("0.000");
        row.Cells["LossPercentage"].Value = model.LossPercentage.ToString("0.00");
        row.Cells["MakingChargeType"].Value = model.MakingChargeType;
        row.Cells["MakingChargeValue"].Value = model.MakingChargeValue.ToString("0.00");
        row.Cells["LaborCharges"].Value = model.LaborCharges.ToString("0.00");
        row.Cells["StoneValue"].Value = model.StoneValue.ToString("0.00");
        row.Cells["Quantity"].Value = model.Quantity.ToString();
        row.Cells["PurchaseRate"].Value = model.PurchaseRate.ToString("0.00");
        row.Cells["SaleRate"].Value = model.SaleRate.ToString("0.00");
        row.Cells["Karigar"].Value = model.KarigarName;
        row.Cells["Supplier"].Value = model.SupplierName;
        row.Cells["HallmarkNumber"].Value = model.HallmarkNumber;
        row.Cells["SerialNumber"].Value = model.SerialNumber;
        row.Cells["BatchNumber"].Value = model.BatchNumber;
        row.Cells["ShelfNumber"].Value = model.ShelfNumber;
        row.Cells["DesignNumber"].Value = model.DesignNumber;
        row.Cells["Brand"].Value = model.Brand;
        row.Cells["Collection"].Value = model.Collection;
        row.Cells["Occasion"].Value = model.Occasion;
        row.Cells["Gender"].Value = model.Gender;
        row.Cells["ItemStatus"].Value = model.ItemStatus;
    }

    private List<BulkEntryRow> ExtractAllRows()
        => _grid.Rows.Cast<DataGridViewRow>().Select(ExtractRow).ToList();

    private void RestoreAllRows(List<BulkEntryRow> rows)
    {
        _suppressRecalculation = true;
        try
        {
            _grid.Rows.Clear();
            foreach (var model in rows)
            {
                var index = _grid.Rows.Add();
                ApplyRow(_grid.Rows[index], model);
            }
            if (_grid.Rows.Count == 0) _grid.Rows.Add();
        }
        finally
        {
            _suppressRecalculation = false;
        }

        for (int i = 0; i < _grid.Rows.Count; i++) RecalculateRow(i);
        UpdateStatusLabel();
    }

    private void UpdateStatusLabel()
    {
        var nonEmpty = ExtractAllRows().Count(r => !r.IsEffectivelyEmpty());
        _lblStatus.Text = $"{_grid.Rows.Count} row(s) on sheet - {nonEmpty} ready to save. " +
                          "Enter/Tab moves across, Ctrl+D duplicates row above, Ctrl+C/V copy row, Ctrl+Z/Y undo/redo.";
    }

    // ---------------------------------------------------------------- Draft autosave

    private void SaveDraft()
    {
        var rows = ExtractAllRows().Where(r => !r.IsEffectivelyEmpty()).ToList();
        if (rows.Count == 0) return;

        DraftStore.Save(DraftName, rows);
        _lblDraftStatus.Text = $"Draft autosaved at {DateTime.Now:hh:mm:ss tt}";
    }

    private async Task OfferDraftRestoreAsync()
    {
        if (!DraftStore.Exists(DraftName)) return;

        var savedAt = DraftStore.GetLastSavedTime(DraftName);
        var confirm = MessageBox.Show(this,
            $"A draft from {savedAt:g} was found with unsaved stock entries. Resume it?",
            "Resume Draft", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

        if (confirm == DialogResult.Yes)
        {
            var rows = DraftStore.Load<List<BulkEntryRow>>(DraftName);
            if (rows is { Count: > 0 })
                RestoreAllRows(rows);
        }
        else
        {
            DraftStore.Clear(DraftName);
        }

        await Task.CompletedTask;
    }

    // ---------------------------------------------------------------- Save all

    private async Task SaveAllAsync()
    {
        var models = ExtractAllRows().Where(r => !r.IsEffectivelyEmpty()).ToList();
        if (models.Count == 0)
        {
            MessageBox.Show(this, "There is nothing to save yet.", "Bulk Stock Entry", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var (items, errors) = BuildStockItems(models);
        if (errors.Count > 0)
        {
            MessageBox.Show(this, "Please fix the following before saving:\n\n" + string.Join("\n", errors),
                "Validation Errors", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        try
        {
            var saved = await _stockService.BulkCreateAsync(items);
            DraftStore.Clear(DraftName);

            _grid.Rows.Clear();
            AddEmptyRow();
            UpdateStatusLabel();
            _lblDraftStatus.Text = string.Empty;

            MessageBox.Show(this, $"{saved.Count} item(s) saved to inventory.", "Bulk Stock Entry", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (_chkPrintBarcodesAfterSave.Checked)
                PrintBarcodeLabels(saved);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private (List<Domain.Entities.Stock> Items, List<string> Errors) BuildStockItems(List<BulkEntryRow> models)
    {
        var items = new List<Domain.Entities.Stock>();
        var errors = new List<string>();

        for (int i = 0; i < models.Count; i++)
        {
            var m = models[i];
            var rowLabel = $"Row {i + 1}";

            if (string.IsNullOrWhiteSpace(m.ItemName)) { errors.Add($"{rowLabel}: Item Name is required."); continue; }
            if (m.GrossWeight <= 0) { errors.Add($"{rowLabel}: Gross Weight must be greater than zero."); continue; }

            var category = _categories.FirstOrDefault(c => c.CategoryName == m.SubCategoryName)
                ?? _categories.FirstOrDefault(c => c.CategoryName == m.CategoryName);
            if (category is null) { errors.Add($"{rowLabel}: Category '{m.CategoryName}' was not found."); continue; }

            items.Add(new Domain.Entities.Stock
            {
                ItemName = m.ItemName,
                CategoryId = category.CategoryId,
                MetalType = string.IsNullOrWhiteSpace(m.MetalType) ? "Gold" : m.MetalType,
                Purity = string.IsNullOrWhiteSpace(m.Purity) ? "22K" : m.Purity,
                GrossWeight = m.GrossWeight,
                StoneWeight = m.StoneWeight,
                LossPercentage = m.LossPercentage,
                MakingChargeType = string.IsNullOrWhiteSpace(m.MakingChargeType) ? "PerGram" : m.MakingChargeType,
                MakingChargeValue = m.MakingChargeValue,
                LaborCharges = m.LaborCharges,
                StoneValue = m.StoneValue,
                Quantity = m.Quantity <= 0 ? 1 : m.Quantity,
                PurchaseRate = m.PurchaseRate,
                SaleRate = m.SaleRate,
                KarigarId = _karigars.FirstOrDefault(k => k.FullName == m.KarigarName)?.KarigarId,
                SupplierId = _suppliers.FirstOrDefault(s => s.CompanyName == m.SupplierName)?.SupplierId,
                HallmarkNumber = NullIfEmpty(m.HallmarkNumber),
                SerialNumber = NullIfEmpty(m.SerialNumber),
                BatchNumber = NullIfEmpty(m.BatchNumber),
                ShelfNumber = NullIfEmpty(m.ShelfNumber),
                DesignNumber = NullIfEmpty(m.DesignNumber),
                Brand = NullIfEmpty(m.Brand),
                Collection = NullIfEmpty(m.Collection),
                Occasion = NullIfEmpty(m.Occasion),
                Gender = m.Gender,
                ItemStatus = m.ItemStatus
            });
        }

        return (items, errors);
    }

    private static string? NullIfEmpty(string text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private void PrintBarcodeLabels(IReadOnlyList<Domain.Entities.Stock> savedItems)
    {
        var labels = savedItems.Select(s => (s.ItemName, s.ItemCode, BarcodeValue: s.Barcodes.FirstOrDefault()?.BarcodeValue ?? s.ItemCode)).ToList();
        using var document = new BulkBarcodePrintDocument(labels);
        using var preview = new PrintPreviewDialog { Document = document, Width = 900, Height = 700 };
        preview.ShowDialog(this);
    }
}
