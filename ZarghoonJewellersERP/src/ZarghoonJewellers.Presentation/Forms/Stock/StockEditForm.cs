using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Controls;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>
/// Full add/edit dialog for a <see cref="Domain.Entities.Stock"/> item: identification, category
/// -> subcategory, weight/purity/costing with a live-updating calculator panel (net weight, fine
/// gold weight, purchase value, projected profit), supplier/karigar, hallmark/serial/batch/shelf,
/// item status, and a multi-image gallery with camera capture. Everything on the right-hand
/// summary card recalculates as the user types, using the same <see cref="JewelryCalculator"/>
/// the Business layer uses when actually saving, so the preview never lies.
/// </summary>
public class StockEditForm : Form
{
    private readonly Domain.Entities.Stock _stock;
    private readonly bool _isNewItem;
    private readonly IReadOnlyList<StockCategory> _allCategories;

    private readonly Guna2TextBox _txtItemName;
    private readonly Guna2ComboBox _cmbCategory;
    private readonly Guna2ComboBox _cmbSubCategory;
    private readonly Guna2ComboBox _cmbMetalType;
    private readonly Guna2ComboBox _cmbPurity;
    private readonly Guna2TextBox _txtGrossWeight;
    private readonly Guna2TextBox _txtStoneWeight;
    private readonly Guna2ComboBox _cmbMakingChargeType;
    private readonly Guna2TextBox _txtMakingChargeValue;
    private readonly Guna2TextBox _txtLaborCharges;
    private readonly Guna2TextBox _txtStoneValue;
    private readonly Guna2TextBox _txtLossPercentage;
    private readonly Guna2TextBox _txtQuantity;
    private readonly Guna2TextBox _txtPurchaseRate;
    private readonly Guna2TextBox _txtSaleRate;
    private readonly Guna2TextBox _txtMinimumStockLevel;
    private readonly Guna2ComboBox _cmbKarigar;
    private readonly Guna2ComboBox _cmbSupplier;
    private readonly Guna2TextBox _txtHallmarkNumber;
    private readonly Guna2TextBox _txtSerialNumber;
    private readonly Guna2TextBox _txtBatchNumber;
    private readonly Guna2TextBox _txtShelfNumber;
    private readonly Guna2TextBox _txtVaultLocation;
    private readonly Guna2TextBox _txtDesignNumber;
    private readonly Guna2TextBox _txtBrand;
    private readonly Guna2TextBox _txtCollection;
    private readonly Guna2TextBox _txtOccasion;
    private readonly Guna2ComboBox _cmbGender;
    private readonly Guna2ComboBox _cmbItemStatus;

    private readonly Label _lblNetWeight;
    private readonly Label _lblFineGoldWeight;
    private readonly Label _lblPurchaseValue;
    private readonly Label _lblProfit;
    private readonly Label _lblProfitMargin;

    public ImageGalleryControl ImageGallery { get; }

    public StockEditForm(string title, Domain.Entities.Stock stock, IReadOnlyList<StockCategory> categories,
        IReadOnlyList<Karigar> karigars, IReadOnlyList<Supplier> suppliers, IImageService imageService, bool isNewItem)
    {
        _stock = stock;
        _isNewItem = isNewItem;
        _allCategories = categories;

        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(980, 660);
        Font = new Font("Segoe UI", 9.5f);

        var titleLabel = new Label
        {
            Text = title, ForeColor = ThemeColors.GoldPrimary,
            Font = new Font("Segoe UI Semibold", 14F, FontStyle.Bold),
            Location = new Point(24, 14), AutoSize = true
        };
        Controls.Add(titleLabel);

        // ---- Left: scrollable field panel ----
        var pnlFields = new Panel { Location = new Point(20, 50), Size = new Size(580, 540), AutoScroll = true, BackColor = ThemeColors.BackgroundDark };
        Controls.Add(pnlFields);

        int y = 4;
        _txtItemName = AddTextField(pnlFields, "Item Name *", stock.ItemName, ref y, width: 540);

        var topLevelCategories = categories.Where(c => c.ParentCategoryId is null).ToList();
        _cmbCategory = AddComboField(pnlFields, "Category *", ref y, width: 260);
        _cmbCategory.DataSource = topLevelCategories;
        _cmbCategory.DisplayMember = nameof(StockCategory.CategoryName);
        _cmbCategory.ValueMember = nameof(StockCategory.CategoryId);

        _cmbSubCategory = AddComboField(pnlFields, "Sub Category", ref y, width: 260, sameRowAs: _cmbCategory, xOffset: 280);
        y -= 56; // the pair above shares one row height

        _cmbCategory.SelectedIndexChanged += (_, _) => RefreshSubCategories();

        var currentCategory = categories.FirstOrDefault(c => c.CategoryId == stock.CategoryId);
        var parentForSelection = currentCategory?.ParentCategoryId is not null
            ? categories.FirstOrDefault(c => c.CategoryId == currentCategory.ParentCategoryId)
            : currentCategory;
        _cmbCategory.SelectedValue = parentForSelection?.CategoryId ?? topLevelCategories.FirstOrDefault()?.CategoryId ?? 0;
        RefreshSubCategories();
        if (currentCategory?.ParentCategoryId is not null
            && _cmbSubCategory.DataSource is List<PickerItem<StockCategory>> subCategoryOptions)
        {
            var matchIndex = subCategoryOptions.FindIndex(o => o.Item?.CategoryId == currentCategory.CategoryId);
            if (matchIndex >= 0) _cmbSubCategory.SelectedIndex = matchIndex;
        }

        _cmbMetalType = AddComboField(pnlFields, "Metal Type", ref y, width: 260);
        _cmbMetalType.DataSource = new[] { "Gold", "Silver", "Platinum", "Diamond", "Other" };
        _cmbMetalType.SelectedItem = stock.MetalType;

        _cmbPurity = AddComboField(pnlFields, "Purity", ref y, width: 260, sameRowAs: _cmbMetalType, xOffset: 280);
        y -= 56;
        _cmbPurity.DataSource = new[] { "24K", "22K", "21K", "18K" };
        _cmbPurity.SelectedItem = stock.Purity;

        _txtGrossWeight = AddTextField(pnlFields, "Gross Weight (g) *", stock.GrossWeight.ToString("0.000"), ref y, width: 260);
        _txtStoneWeight = AddTextField(pnlFields, "Stone Weight (g)", stock.StoneWeight.ToString("0.000"), ref y, width: 260, sameRowAs: _txtGrossWeight, xOffset: 280);
        y -= 56;

        _txtLossPercentage = AddTextField(pnlFields, "Loss / Wastage %", stock.LossPercentage.ToString("0.00"), ref y, width: 260);
        _txtQuantity = AddTextField(pnlFields, "Quantity", stock.Quantity.ToString(), ref y, width: 260, sameRowAs: _txtLossPercentage, xOffset: 280);
        y -= 56;

        _cmbMakingChargeType = AddComboField(pnlFields, "Making Charge Type", ref y, width: 260);
        _cmbMakingChargeType.DataSource = new[] { "PerGram", "Fixed", "Percentage" };
        _cmbMakingChargeType.SelectedItem = stock.MakingChargeType;

        _txtMakingChargeValue = AddTextField(pnlFields, "Making Charge Value", stock.MakingChargeValue.ToString("0.00"), ref y, width: 260, sameRowAs: _cmbMakingChargeType, xOffset: 280);
        y -= 56;

        _txtLaborCharges = AddTextField(pnlFields, "Labor Charges", stock.LaborCharges.ToString("0.00"), ref y, width: 260);
        _txtStoneValue = AddTextField(pnlFields, "Stone Value", stock.StoneValue.ToString("0.00"), ref y, width: 260, sameRowAs: _txtLaborCharges, xOffset: 280);
        y -= 56;

        _txtPurchaseRate = AddTextField(pnlFields, "Purchase Rate (per gram)", stock.PurchaseRate.ToString("0.00"), ref y, width: 260);
        _txtSaleRate = AddTextField(pnlFields, "Sale Rate (per gram)", stock.SaleRate.ToString("0.00"), ref y, width: 260, sameRowAs: _txtPurchaseRate, xOffset: 280);
        y -= 56;

        _txtMinimumStockLevel = AddTextField(pnlFields, "Minimum Stock Level", stock.MinimumStockLevel.ToString("0"), ref y, width: 260);
        _cmbItemStatus = AddComboField(pnlFields, "Item Status", ref y, width: 260, sameRowAs: _txtMinimumStockLevel, xOffset: 280);
        y -= 56;
        _cmbItemStatus.DataSource = new[] { "Active", "Sold", "Reserved", "Repair", "Melted", "Returned" };
        _cmbItemStatus.SelectedItem = stock.ItemStatus;

        _cmbKarigar = AddComboField(pnlFields, "Karigar (Maker)", ref y, width: 260);
        var karigarOptions = new List<PickerItem<Karigar>> { new(null, "— None —") };
        karigarOptions.AddRange(karigars.Select(k => new PickerItem<Karigar>(k, k.FullName)));
        _cmbKarigar.DataSource = karigarOptions;
        _cmbKarigar.DisplayMember = nameof(PickerItem<Karigar>.Display);
        _cmbKarigar.SelectedIndex = karigarOptions.FindIndex(k => k.Item?.KarigarId == stock.KarigarId) is var idx && idx >= 0 ? idx : 0;

        _cmbSupplier = AddComboField(pnlFields, "Supplier", ref y, width: 260, sameRowAs: _cmbKarigar, xOffset: 280);
        y -= 56;
        var supplierOptions = new List<PickerItem<Supplier>> { new(null, "— None —") };
        supplierOptions.AddRange(suppliers.Select(s => new PickerItem<Supplier>(s, s.CompanyName)));
        _cmbSupplier.DataSource = supplierOptions;
        _cmbSupplier.DisplayMember = nameof(PickerItem<Supplier>.Display);
        _cmbSupplier.SelectedIndex = supplierOptions.FindIndex(s => s.Item?.SupplierId == stock.SupplierId) is var sidx && sidx >= 0 ? sidx : 0;

        _txtHallmarkNumber = AddTextField(pnlFields, "Hallmark Number", stock.HallmarkNumber ?? string.Empty, ref y, width: 260);
        _txtSerialNumber = AddTextField(pnlFields, "Serial Number", stock.SerialNumber ?? string.Empty, ref y, width: 260, sameRowAs: _txtHallmarkNumber, xOffset: 280);
        y -= 56;
        if (isNewItem) _txtSerialNumber.PlaceholderText = "Leave blank to auto-generate";

        _txtBatchNumber = AddTextField(pnlFields, "Batch Number", stock.BatchNumber ?? string.Empty, ref y, width: 260);
        _txtShelfNumber = AddTextField(pnlFields, "Shelf Number", stock.ShelfNumber ?? string.Empty, ref y, width: 260, sameRowAs: _txtBatchNumber, xOffset: 280);
        y -= 56;

        _txtVaultLocation = AddTextField(pnlFields, "Vault / Location", stock.VaultLocation ?? string.Empty, ref y, width: 540);

        _txtDesignNumber = AddTextField(pnlFields, "Design Number", stock.DesignNumber ?? string.Empty, ref y, width: 260);
        _txtBrand = AddTextField(pnlFields, "Brand", stock.Brand ?? string.Empty, ref y, width: 260, sameRowAs: _txtDesignNumber, xOffset: 280);
        y -= 56;

        _txtCollection = AddTextField(pnlFields, "Collection", stock.Collection ?? string.Empty, ref y, width: 260);
        _txtOccasion = AddTextField(pnlFields, "Occasion", stock.Occasion ?? string.Empty, ref y, width: 260, sameRowAs: _txtCollection, xOffset: 280);
        y -= 56;

        _cmbGender = AddComboField(pnlFields, "Gender", ref y, width: 260);
        _cmbGender.DataSource = new[] { "Unisex", "Men", "Women", "Kids" };
        _cmbGender.SelectedItem = stock.Gender;

        // ---- Right: images + live calculator ----
        ImageGallery = new ImageGalleryControl(imageService, "Stock") { Location = new Point(616, 50), Width = 340, Dock = DockStyle.None };
        Controls.Add(ImageGallery);

        var pnlCalc = new Guna2Panel
        {
            Location = new Point(616, 190), Size = new Size(340, 400),
            FillColor = ThemeColors.BackgroundCard, BorderRadius = 10, Padding = new Padding(16)
        };
        Controls.Add(pnlCalc);

        var calcTitle = new Label { Text = "LIVE CALCULATION", Dock = DockStyle.Top, Height = 26, ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 9F, FontStyle.Bold) };
        pnlCalc.Controls.Add(calcTitle);

        (_lblNetWeight, _) = AddCalcRow(pnlCalc, "Net Weight", 40);
        (_lblFineGoldWeight, _) = AddCalcRow(pnlCalc, "Fine Gold Weight", 80);
        (_lblPurchaseValue, _) = AddCalcRow(pnlCalc, "Purchase Value", 120);
        (_lblProfit, _) = AddCalcRow(pnlCalc, "Projected Profit", 160);
        (_lblProfitMargin, _) = AddCalcRow(pnlCalc, "Profit Margin", 200);

        foreach (var control in new Control[]
        {
            _txtGrossWeight, _txtStoneWeight, _txtLossPercentage, _txtQuantity, _txtMakingChargeValue,
            _txtLaborCharges, _txtStoneValue, _txtPurchaseRate, _txtSaleRate
        })
            control.TextChanged += (_, _) => RecalculateLivePreview();

        _cmbPurity.SelectedIndexChanged += (_, _) => RecalculateLivePreview();
        _cmbMakingChargeType.SelectedIndexChanged += (_, _) => RecalculateLivePreview();
        RecalculateLivePreview();

        var btnSave = new Guna2Button
        {
            Text = "SAVE", Location = new Point(716, 600), Size = new Size(115, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        btnSave.Click += (_, _) => ApplyValues();

        var btnCancel = new Guna2Button
        {
            Text = "CANCEL", Location = new Point(841, 600), Size = new Size(115, 42),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8,
            Font = new Font("Segoe UI", 10F), DialogResult = DialogResult.Cancel
        };

        Controls.Add(btnSave);
        Controls.Add(btnCancel);
        AcceptButton = btnSave;
        CancelButton = btnCancel;
    }

    private void RefreshSubCategories()
    {
        if (_cmbCategory.SelectedValue is not int parentId) return;
        var children = _allCategories.Where(c => c.ParentCategoryId == parentId).ToList();

        var options = new List<PickerItem<StockCategory>> { new(null, "— None —") };
        options.AddRange(children.Select(c => new PickerItem<StockCategory>(c, c.CategoryName)));
        _cmbSubCategory.DataSource = options;
        _cmbSubCategory.DisplayMember = nameof(PickerItem<StockCategory>.Display);
        _cmbSubCategory.SelectedIndex = 0;
    }

    private (Label ValueLabel, Label _) AddCalcRow(Guna2Panel parent, string caption, int y)
    {
        var captionLabel = new Label { Text = caption.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(0, y), AutoSize = true };
        var valueLabel = new Label { Text = "0", ForeColor = ThemeColors.GoldPrimary, Font = new Font("Segoe UI Semibold", 15F, FontStyle.Bold), Location = new Point(0, y + 18), AutoSize = true };
        parent.Controls.Add(captionLabel);
        parent.Controls.Add(valueLabel);
        return (valueLabel, captionLabel);
    }

    private void RecalculateLivePreview()
    {
        var gross = ParseDecimal(_txtGrossWeight.Text);
        var stoneWt = ParseDecimal(_txtStoneWeight.Text);
        var netWeight = JewelryCalculator.CalculateNetWeight(gross, stoneWt);
        var purity = _cmbPurity.SelectedItem?.ToString() ?? "22K";
        var loss = ParseDecimal(_txtLossPercentage.Text);
        var qty = int.TryParse(_txtQuantity.Text, out var q) && q > 0 ? q : 1;
        var makingType = _cmbMakingChargeType.SelectedItem?.ToString() ?? "PerGram";
        var makingValue = ParseDecimal(_txtMakingChargeValue.Text);
        var labor = ParseDecimal(_txtLaborCharges.Text);
        var stoneValue = ParseDecimal(_txtStoneValue.Text);
        var purchaseRate = ParseDecimal(_txtPurchaseRate.Text);
        var saleRate = ParseDecimal(_txtSaleRate.Text);

        var fineWeight = JewelryCalculator.CalculateFineGoldWeight(netWeight, purity, loss);
        var purchaseValue = JewelryCalculator.CalculatePurchaseValue(netWeight, purchaseRate, qty, makingType, makingValue, labor, stoneValue);
        var profit = JewelryCalculator.CalculateProfit(netWeight, purchaseRate, saleRate, qty, makingType, makingValue, labor, stoneValue);
        var margin = JewelryCalculator.CalculateProfitMargin(purchaseValue, profit);

        _lblNetWeight.Text = $"{netWeight:N3} g";
        _lblFineGoldWeight.Text = $"{fineWeight:N3} g";
        _lblPurchaseValue.Text = purchaseValue.ToString("C0");
        _lblProfit.Text = profit.ToString("C0");
        _lblProfit.ForeColor = profit >= 0 ? ThemeColors.Success : ThemeColors.Danger;
        _lblProfitMargin.Text = $"{margin:N1}%";
    }

    private Guna2TextBox AddTextField(Panel parent, string label, string value, ref int y, int width, Control? sameRowAs = null, int xOffset = 0)
    {
        int x = sameRowAs is null ? 0 : xOffset;
        parent.Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(x, y + 18), Size = new Size(width, 34),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = value
        };
        textBox.FocusedState.BorderColor = ThemeColors.GoldPrimary;
        parent.Controls.Add(textBox);
        y += 56;
        return textBox;
    }

    private Guna2ComboBox AddComboField(Panel parent, string label, ref int y, int width, Control? sameRowAs = null, int xOffset = 0)
    {
        int x = sameRowAs is null ? 0 : xOffset;
        parent.Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(x, y), AutoSize = true });
        var combo = new Guna2ComboBox
        {
            Location = new Point(x, y + 18), Size = new Size(width, 34),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList
        };
        parent.Controls.Add(combo);
        y += 56;
        return combo;
    }

    private void ApplyValues()
    {
        _stock.ItemName = _txtItemName.Text.Trim();
        _stock.CategoryId = (_cmbSubCategory.SelectedItem as PickerItem<StockCategory>)?.Item?.CategoryId
            ?? (int)(_cmbCategory.SelectedValue ?? _stock.CategoryId);
        _stock.MetalType = _cmbMetalType.SelectedItem?.ToString() ?? _stock.MetalType;
        _stock.Purity = _cmbPurity.SelectedItem?.ToString() ?? _stock.Purity;
        _stock.GrossWeight = ParseDecimal(_txtGrossWeight.Text);
        _stock.StoneWeight = ParseDecimal(_txtStoneWeight.Text);
        _stock.LossPercentage = ParseDecimal(_txtLossPercentage.Text);
        _stock.MakingChargeType = _cmbMakingChargeType.SelectedItem?.ToString() ?? _stock.MakingChargeType;
        _stock.MakingChargeValue = ParseDecimal(_txtMakingChargeValue.Text);
        _stock.LaborCharges = ParseDecimal(_txtLaborCharges.Text);
        _stock.StoneValue = ParseDecimal(_txtStoneValue.Text);
        _stock.Quantity = int.TryParse(_txtQuantity.Text, out var qty) ? qty : _stock.Quantity;
        _stock.PurchaseRate = ParseDecimal(_txtPurchaseRate.Text);
        _stock.SaleRate = ParseDecimal(_txtSaleRate.Text);
        _stock.MinimumStockLevel = ParseDecimal(_txtMinimumStockLevel.Text);
        _stock.ItemStatus = _cmbItemStatus.SelectedItem?.ToString() ?? _stock.ItemStatus;
        _stock.KarigarId = (_cmbKarigar.SelectedItem as PickerItem<Karigar>)?.Item?.KarigarId;
        _stock.SupplierId = (_cmbSupplier.SelectedItem as PickerItem<Supplier>)?.Item?.SupplierId;
        _stock.HallmarkNumber = NullIfEmpty(_txtHallmarkNumber.Text);
        _stock.SerialNumber = NullIfEmpty(_txtSerialNumber.Text);
        _stock.BatchNumber = NullIfEmpty(_txtBatchNumber.Text);
        _stock.ShelfNumber = NullIfEmpty(_txtShelfNumber.Text);
        _stock.VaultLocation = NullIfEmpty(_txtVaultLocation.Text);
        _stock.DesignNumber = NullIfEmpty(_txtDesignNumber.Text);
        _stock.Brand = NullIfEmpty(_txtBrand.Text);
        _stock.Collection = NullIfEmpty(_txtCollection.Text);
        _stock.Occasion = NullIfEmpty(_txtOccasion.Text);
        _stock.Gender = _cmbGender.SelectedItem?.ToString() ?? _stock.Gender;
    }

    private static decimal ParseDecimal(string text) => decimal.TryParse(text, out var value) ? value : 0;
    private static string? NullIfEmpty(string text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    public Domain.Entities.Stock Result => _stock;

    /// <summary>Display wrapper so nullable "pick an entity" combo boxes (Karigar/Supplier/SubCategory)
    /// show a readable label instead of relying on the underlying entity's (non-existent) ToString().</summary>
    private sealed record PickerItem<T>(T? Item, string Display);
}
