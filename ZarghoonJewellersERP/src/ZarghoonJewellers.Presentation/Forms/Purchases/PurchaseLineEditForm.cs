using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.Purchases;

/// <summary>Popup for one purchase line. Toggling "New item" switches between restocking an
/// existing catalogue item (StockId set, item name/category locked to that item) and
/// introducing a brand-new item (StockId left null, category chosen from the dropdown).</summary>
public class PurchaseLineEditForm : Form
{
    private readonly Guna2CheckBox _chkNewItem;
    private readonly Guna2TextBox _txtItemName;
    private readonly Guna2ComboBox _cmbCategory;
    private readonly Guna2ComboBox _cmbPurity;
    private readonly Guna2TextBox _txtGrossWeight;
    private readonly Guna2TextBox _txtStoneWeight;
    private readonly Guna2TextBox _txtRate;
    private readonly Guna2TextBox _txtQuantity;

    public PurchaseLineRequest Line { get; }

    public PurchaseLineEditForm(PurchaseLineRequest line, IReadOnlyList<StockCategory> categories, Domain.Entities.Stock? existingStock)
    {
        Line = line;

        Text = existingStock is null ? "Add Purchase Line" : $"Restock: {existingStock.ItemName}";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(380, 480);
        Font = new Font("Segoe UI", 9.5f);

        int y = 16;

        _chkNewItem = new Guna2CheckBox { Text = "This is a brand-new item", Location = new Point(20, y), ForeColor = ThemeColors.TextSecondary, Checked = existingStock is null, Enabled = existingStock is null };
        _chkNewItem.CheckedState.FillColor = ThemeColors.GoldPrimary;
        _chkNewItem.CheckedChanged += (_, _) => UpdateNewItemState();
        Controls.Add(_chkNewItem);
        y += 34;

        _txtItemName = AddField("Item Name", existingStock?.ItemName ?? line.ItemName, ref y);
        _cmbCategory = AddComboField("Category", ref y);
        _cmbCategory.DataSource = categories.ToList();
        _cmbCategory.DisplayMember = nameof(StockCategory.CategoryName);
        _cmbCategory.ValueMember = nameof(StockCategory.CategoryId);
        if (existingStock is not null) _cmbCategory.SelectedValue = existingStock.CategoryId;

        _cmbPurity = AddComboField("Purity", ref y);
        _cmbPurity.DataSource = new[] { "24K", "22K", "21K", "18K" };
        _cmbPurity.SelectedItem = existingStock?.Purity ?? "22K";

        _txtGrossWeight = AddField("Gross Weight (g)", (existingStock?.GrossWeight ?? 0).ToString("0.000"), ref y);
        _txtStoneWeight = AddField("Stone Weight (g)", (existingStock?.StoneWeight ?? 0).ToString("0.000"), ref y);
        _txtRate = AddField("Rate (per gram)", (existingStock?.PurchaseRate ?? 0).ToString("0.00"), ref y);
        _txtQuantity = AddField("Quantity", "1", ref y);

        var btnOk = new Guna2Button
        {
            Text = "ADD LINE", Location = new Point(60, y + 16), Size = new Size(260, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        btnOk.Click += (_, _) => ApplyValues(existingStock);
        Controls.Add(btnOk);
        AcceptButton = btnOk;
        ClientSize = new Size(380, y + 76);

        UpdateNewItemState();
    }

    private void UpdateNewItemState()
    {
        // Item name/category are only editable when introducing a brand-new catalogue item;
        // when restocking an existing item they stay fixed to that item's own values.
        _txtItemName.ReadOnly = !_chkNewItem.Checked;
        _cmbCategory.Enabled = _chkNewItem.Checked;
    }

    private Guna2TextBox AddField(string label, string value, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(20, y + 18), Size = new Size(330, 36),
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
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        var combo = new Guna2ComboBox
        {
            Location = new Point(20, y + 18), Size = new Size(330, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList
        };
        Controls.Add(combo);
        y += 52;
        return combo;
    }

    private void ApplyValues(Domain.Entities.Stock? existingStock)
    {
        Line.StockId = _chkNewItem.Checked ? null : existingStock?.StockId;
        Line.ItemName = _txtItemName.Text.Trim();
        Line.CategoryId = (int?)_cmbCategory.SelectedValue;
        Line.Purity = _cmbPurity.SelectedItem?.ToString() ?? "22K";
        Line.GrossWeight = Parse(_txtGrossWeight.Text);
        Line.StoneWeight = Parse(_txtStoneWeight.Text);
        Line.Rate = Parse(_txtRate.Text);
        Line.Quantity = int.TryParse(_txtQuantity.Text, out var qty) && qty > 0 ? qty : 1;
    }

    private static decimal Parse(string text) => decimal.TryParse(text, out var value) ? value : 0;
}
