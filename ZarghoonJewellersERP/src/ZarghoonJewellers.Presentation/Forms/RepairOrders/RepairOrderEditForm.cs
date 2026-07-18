using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.RepairOrders;

/// <summary>New repair/alteration order intake form.</summary>
public class RepairOrderEditForm : Form
{
    private readonly RepairOrder _order;
    private readonly Guna2ComboBox _cmbCustomer;
    private readonly Guna2TextBox _txtItemDescription;
    private readonly Guna2ComboBox _cmbMetalType;
    private readonly Guna2ComboBox _cmbPurity;
    private readonly Guna2TextBox _txtWeight;
    private readonly Guna2ComboBox _cmbKarigar;
    private readonly Guna2DateTimePicker _dtPromised;
    private readonly Guna2TextBox _txtRepairCharges;
    private readonly Guna2TextBox _txtAdvancePaid;
    private readonly Guna2TextBox _txtNotes;

    public RepairOrderEditForm(RepairOrder order, IReadOnlyList<Customer> customers, IReadOnlyList<Karigar> karigars)
    {
        _order = order;

        Text = "New Repair Order";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        Font = new Font("Segoe UI", 9.5f);

        int y = 20;
        _cmbCustomer = AddCombo("Customer", ref y);
        _cmbCustomer.DataSource = customers.ToList();
        _cmbCustomer.DisplayMember = nameof(Customer.FullName);
        _cmbCustomer.ValueMember = nameof(Customer.CustomerId);

        _txtItemDescription = AddText("Item Description", string.Empty, ref y);

        _cmbMetalType = AddCombo("Metal Type", ref y);
        _cmbMetalType.DataSource = new[] { "Gold", "Silver", "Platinum", "Other" };

        _cmbPurity = AddCombo("Purity", ref y);
        _cmbPurity.DataSource = new[] { "24K", "22K", "21K", "18K" };

        _txtWeight = AddText("Weight (g)", "0", ref y);

        _cmbKarigar = AddCombo("Assign to Karigar", ref y);
        var karigarOptions = new List<KarigarPickerItem> { new(null, "— Unassigned —") };
        karigarOptions.AddRange(karigars.Select(k => new KarigarPickerItem(k, k.FullName)));
        _cmbKarigar.DataSource = karigarOptions;
        _cmbKarigar.DisplayMember = nameof(KarigarPickerItem.Display);
        _cmbKarigar.SelectedIndex = 0;

        Controls.Add(new Label { Text = "PROMISED DATE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        _dtPromised = new Guna2DateTimePicker { Location = new Point(20, y + 18), Size = new Size(330, 36), Value = DateTime.Now.AddDays(3) };
        Controls.Add(_dtPromised);
        y += 56;

        _txtRepairCharges = AddText("Repair Charges", "0", ref y);
        _txtAdvancePaid = AddText("Advance Paid", "0", ref y);
        _txtNotes = AddText("Notes", string.Empty, ref y);

        var btnSave = new Guna2Button
        {
            Text = "CREATE ORDER", Location = new Point(60, y + 16), Size = new Size(250, 42),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        btnSave.Click += (_, _) => ApplyValues();
        Controls.Add(btnSave);
        AcceptButton = btnSave;
        ClientSize = new Size(370, y + 76);
    }

    private Guna2TextBox AddText(string label, string value, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(20, y + 18), Size = new Size(330, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = value
        };
        Controls.Add(textBox);
        y += 56;
        return textBox;
    }

    private Guna2ComboBox AddCombo(string label, ref int y)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, y), AutoSize = true });
        var combo = new Guna2ComboBox
        {
            Location = new Point(20, y + 18), Size = new Size(330, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList
        };
        Controls.Add(combo);
        y += 56;
        return combo;
    }

    private void ApplyValues()
    {
        _order.CustomerId = (int)(_cmbCustomer.SelectedValue ?? 0);
        _order.ItemDescription = _txtItemDescription.Text.Trim();
        _order.MetalType = _cmbMetalType.SelectedItem?.ToString() ?? "Gold";
        _order.Purity = _cmbPurity.SelectedItem?.ToString();
        _order.Weight = decimal.TryParse(_txtWeight.Text, out var w) ? w : 0;
        _order.KarigarId = (_cmbKarigar.SelectedItem as KarigarPickerItem)?.Karigar?.KarigarId;
        _order.PromisedDate = DateOnly.FromDateTime(_dtPromised.Value);
        _order.RepairCharges = decimal.TryParse(_txtRepairCharges.Text, out var rc) ? rc : 0;
        _order.AdvancePaid = decimal.TryParse(_txtAdvancePaid.Text, out var ap) ? ap : 0;
        _order.Notes = _txtNotes.Text.Trim();
    }

    public RepairOrder Result => _order;

    /// <summary>Display wrapper for the karigar combo so the "Unassigned" sentinel and real
    /// <see cref="Domain.Entities.Karigar"/> rows can share one DataSource with a readable label.</summary>
    private sealed record KarigarPickerItem(Karigar? Karigar, string Display);
}
