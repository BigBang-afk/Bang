using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Common;

/// <summary>
/// A metadata-driven add/edit dialog: given a list of <see cref="FieldDescriptor{TEntity}"/>,
/// builds one labeled textbox per field at runtime. Used by <see cref="SimpleCrudControl{TEntity}"/>
/// for the simpler master-data modules (Suppliers, Karigar, Employees, Bank Accounts, Expenses,
/// Income, Settings, ...) so each of them doesn't need its own hand-built dialog + designer file.
/// </summary>
public class SimpleEditForm<TEntity> : Form
{
    private readonly TEntity _entity;
    private readonly List<FieldDescriptor<TEntity>> _fields;
    private readonly List<Guna2TextBox> _textBoxes = new();

    public SimpleEditForm(string title, TEntity entity, List<FieldDescriptor<TEntity>> fields)
    {
        _entity = entity;
        _fields = fields;

        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        ClientSize = new Size(420, 60 + fields.Count * 56 + 70);
        Font = new Font("Segoe UI", 9.5f);

        var titleLabel = new Label
        {
            Text = title,
            ForeColor = ThemeColors.GoldPrimary,
            Font = new Font("Segoe UI Semibold", 13F, FontStyle.Bold),
            Location = new Point(24, 16),
            AutoSize = true
        };
        Controls.Add(titleLabel);

        int y = 60;
        foreach (var field in fields)
        {
            var label = new Label
            {
                Text = field.Label.ToUpperInvariant(),
                ForeColor = ThemeColors.TextMuted,
                Font = new Font("Segoe UI", 8F, FontStyle.Bold),
                Location = new Point(24, y),
                AutoSize = true
            };

            var textBox = new Guna2TextBox
            {
                Location = new Point(24, y + 18),
                Size = new Size(370, 36),
                FillColor = ThemeColors.BackgroundCard,
                ForeColor = ThemeColors.TextPrimary,
                BorderColor = ThemeColors.BorderSubtle,
                BorderRadius = 6,
                Text = field.Getter(entity),
                ReadOnly = field.ReadOnly,
                PasswordChar = field.IsPassword ? '•' : '\0'
            };
            textBox.FocusedState.BorderColor = ThemeColors.GoldPrimary;

            Controls.Add(label);
            Controls.Add(textBox);
            _textBoxes.Add(textBox);
            y += 56;
        }

        var btnSave = new Guna2Button
        {
            Text = "SAVE",
            Location = new Point(184, y + 10),
            Size = new Size(105, 40),
            FillColor = ThemeColors.GoldPrimary,
            ForeColor = ThemeColors.TextOnGold,
            BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold),
            DialogResult = DialogResult.OK
        };
        btnSave.Click += (_, _) => ApplyValuesAndValidate();

        var btnCancel = new Guna2Button
        {
            Text = "CANCEL",
            Location = new Point(289, y + 10),
            Size = new Size(105, 40),
            FillColor = ThemeColors.BackgroundCard,
            ForeColor = ThemeColors.TextSecondary,
            BorderRadius = 8,
            Font = new Font("Segoe UI", 10F),
            DialogResult = DialogResult.Cancel
        };

        Controls.Add(btnSave);
        Controls.Add(btnCancel);
        AcceptButton = btnSave;
        CancelButton = btnCancel;
    }

    private void ApplyValuesAndValidate()
    {
        for (int i = 0; i < _fields.Count; i++)
        {
            if (!_fields[i].ReadOnly)
                _fields[i].Setter(_entity, _textBoxes[i].Text.Trim());
        }
    }

    public TEntity Result => _entity;
}
