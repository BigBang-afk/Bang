using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Stock;

/// <summary>Add/edit dialog for a <see cref="Domain.Entities.Stock"/> item. Built by hand (rather than
/// through <see cref="Common.SimpleEditForm{TEntity}"/>) because it needs real dropdowns for
/// Category/Metal/Purity/Making-charge-type instead of free-text fields.</summary>
public class StockEditForm : Form
{
    private readonly Domain.Entities.Stock _stock;

    private readonly Guna2TextBox _txtItemName;
    private readonly Guna2ComboBox _cmbCategory;
    private readonly Guna2ComboBox _cmbMetalType;
    private readonly Guna2ComboBox _cmbPurity;
    private readonly Guna2TextBox _txtGrossWeight;
    private readonly Guna2TextBox _txtStoneWeight;
    private readonly Guna2ComboBox _cmbMakingChargeType;
    private readonly Guna2TextBox _txtMakingChargeValue;
    private readonly Guna2TextBox _txtStoneValue;
    private readonly Guna2TextBox _txtQuantity;
    private readonly Guna2TextBox _txtPurchaseRate;
    private readonly Guna2TextBox _txtSaleRate;
    private readonly Guna2TextBox _txtMinimumStockLevel;
    private readonly Guna2TextBox _txtVaultLocation;

    public StockEditForm(string title, Domain.Entities.Stock stock, IReadOnlyList<StockCategory> categories)
    {
        _stock = stock;

        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(460, 620);
        Font = new Font("Segoe UI", 9.5f);
        AutoScroll = true;

        var titleLabel = new Label
        {
            Text = title, ForeColor = ThemeColors.GoldPrimary,
            Font = new Font("Segoe UI Semibold", 13F, FontStyle.Bold),
            Location = new Point(24, 16), AutoSize = true
        };
        Controls.Add(titleLabel);

        int y = 60;
        _txtItemName = AddTextField("Item Name", stock.ItemName, ref y);

        _cmbCategory = AddComboField("Category", ref y);
        _cmbCategory.DataSource = categories.ToList();
        _cmbCategory.DisplayMember = nameof(StockCategory.CategoryName);
        _cmbCategory.ValueMember = nameof(StockCategory.CategoryId);
        _cmbCategory.SelectedValue = stock.CategoryId;

        _cmbMetalType = AddComboField("Metal Type", ref y);
        _cmbMetalType.DataSource = new[] { "Gold", "Silver", "Platinum", "Diamond", "Other" };
        _cmbMetalType.SelectedItem = stock.MetalType;

        _cmbPurity = AddComboField("Purity", ref y);
        _cmbPurity.DataSource = new[] { "24K", "22K", "21K", "18K" };
        _cmbPurity.SelectedItem = stock.Purity;

        _txtGrossWeight = AddTextField("Gross Weight (g)", stock.GrossWeight.ToString("0.000"), ref y);
        _txtStoneWeight = AddTextField("Stone Weight (g)", stock.StoneWeight.ToString("0.000"), ref y);

        _cmbMakingChargeType = AddComboField("Making Charge Type", ref y);
        _cmbMakingChargeType.DataSource = new[] { "PerGram", "Fixed", "Percentage" };
        _cmbMakingChargeType.SelectedItem = stock.MakingChargeType;

        _txtMakingChargeValue = AddTextField("Making Charge Value", stock.MakingChargeValue.ToString("0.00"), ref y);
        _txtStoneValue = AddTextField("Stone Value", stock.StoneValue.ToString("0.00"), ref y);
        _txtQuantity = AddTextField("Quantity", stock.Quantity.ToString(), ref y);
        _txtPurchaseRate = AddTextField("Purchase Rate (per gram)", stock.PurchaseRate.ToString("0.00"), ref y);
        _txtSaleRate = AddTextField("Sale Rate (per gram)", stock.SaleRate.ToString("0.00"), ref y);
        _txtMinimumStockLevel = AddTextField("Minimum Stock Level", stock.MinimumStockLevel.ToString("0"), ref y);
        _txtVaultLocation = AddTextField("Vault / Location", stock.VaultLocation ?? string.Empty, ref y);

        var btnSave = new Guna2Button
        {
            Text = "SAVE", Location = new Point(224, y + 14), Size = new Size(105, 40),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        btnSave.Click += (_, _) => ApplyValues();

        var btnCancel = new Guna2Button
        {
            Text = "CANCEL", Location = new Point(329, y + 14), Size = new Size(105, 40),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8,
            Font = new Font("Segoe UI", 10F), DialogResult = DialogResult.Cancel
        };

        Controls.Add(btnSave);
        Controls.Add(btnCancel);
        AcceptButton = btnSave;
        CancelButton = btnCancel;
        ClientSize = new Size(460, y + 70);
    }

    private Guna2TextBox AddTextField(string label, string value, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(24, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(24, y + 18), Size = new Size(410, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = value
        };
        textBox.FocusedState.BorderColor = ThemeColors.GoldPrimary;
        Controls.Add(textBox);
        y += 52;
        return textBox;
    }

    private Guna2ComboBox AddComboField(string label, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(24, y), AutoSize = true });
        var combo = new Guna2ComboBox
        {
            Location = new Point(24, y + 18), Size = new Size(410, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6,
            DropDownStyle = ComboBoxStyle.DropDownList
        };
        Controls.Add(combo);
        y += 52;
        return combo;
    }

    private void ApplyValues()
    {
        _stock.ItemName = _txtItemName.Text.Trim();
        _stock.CategoryId = (int)(_cmbCategory.SelectedValue ?? _stock.CategoryId);
        _stock.MetalType = _cmbMetalType.SelectedItem?.ToString() ?? _stock.MetalType;
        _stock.Purity = _cmbPurity.SelectedItem?.ToString() ?? _stock.Purity;
        _stock.GrossWeight = ParseDecimal(_txtGrossWeight.Text);
        _stock.StoneWeight = ParseDecimal(_txtStoneWeight.Text);
        _stock.MakingChargeType = _cmbMakingChargeType.SelectedItem?.ToString() ?? _stock.MakingChargeType;
        _stock.MakingChargeValue = ParseDecimal(_txtMakingChargeValue.Text);
        _stock.StoneValue = ParseDecimal(_txtStoneValue.Text);
        _stock.Quantity = int.TryParse(_txtQuantity.Text, out var qty) ? qty : _stock.Quantity;
        _stock.PurchaseRate = ParseDecimal(_txtPurchaseRate.Text);
        _stock.SaleRate = ParseDecimal(_txtSaleRate.Text);
        _stock.MinimumStockLevel = ParseDecimal(_txtMinimumStockLevel.Text);
        _stock.VaultLocation = _txtVaultLocation.Text.Trim();
    }

    private static decimal ParseDecimal(string text) => decimal.TryParse(text, out var value) ? value : 0;

    public Domain.Entities.Stock Result => _stock;
}
