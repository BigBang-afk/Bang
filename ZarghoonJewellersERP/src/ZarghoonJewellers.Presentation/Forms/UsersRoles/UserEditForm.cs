using Guna.UI2.WinForms;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Presentation.Forms.UsersRoles;

/// <summary>Add/edit dialog for a login account. The password field is only shown (and required)
/// when creating a new user - existing accounts get their password changed via the separate
/// "Reset Password" action instead, keeping that sensitive operation explicit.</summary>
public class UserEditForm : Form
{
    private readonly Guna2TextBox _txtUsername;
    private readonly Guna2TextBox _txtPassword;
    private readonly Guna2TextBox _txtFullName;
    private readonly Guna2TextBox _txtEmail;
    private readonly Guna2ComboBox _cmbRole;
    private readonly Guna2CheckBox _chkActive;
    private readonly bool _isNewUser;

    public string Username => _txtUsername.Text.Trim();
    public string Password => _txtPassword.Text;
    public string FullName => _txtFullName.Text.Trim();
    public string Email => _txtEmail.Text.Trim();
    public int RoleId => (int)(_cmbRole.SelectedValue ?? 0);
    public bool IsActive => _chkActive.Checked;

    public UserEditForm(string title, bool isNewUser, IReadOnlyList<Role> roles, User? existing = null)
    {
        _isNewUser = isNewUser;

        Text = title;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = ThemeColors.BackgroundDark;
        Font = new Font("Segoe UI", 9.5f);
        ClientSize = new Size(400, isNewUser ? 400 : 340);

        int y = 20;
        _txtUsername = AddField("Username", existing?.Username ?? string.Empty, ref y);
        _txtUsername.ReadOnly = !isNewUser;

        if (isNewUser)
            _txtPassword = AddField("Password", string.Empty, ref y, isPassword: true);
        else
            _txtPassword = new Guna2TextBox();

        _txtFullName = AddField("Full Name", existing?.FullName ?? string.Empty, ref y);
        _txtEmail = AddField("Email", existing?.Email ?? string.Empty, ref y);

        Controls.Add(new Label { Text = "ROLE", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(24, y), AutoSize = true });
        _cmbRole = new Guna2ComboBox
        {
            Location = new Point(24, y + 18), Size = new Size(350, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, DropDownStyle = ComboBoxStyle.DropDownList
        };
        _cmbRole.DataSource = roles.ToList();
        _cmbRole.DisplayMember = nameof(Role.RoleName);
        _cmbRole.ValueMember = nameof(Role.RoleId);
        if (existing is not null) _cmbRole.SelectedValue = existing.RoleId;
        Controls.Add(_cmbRole);
        y += 56;

        _chkActive = new Guna2CheckBox { Text = "Active", Location = new Point(24, y), Checked = existing?.IsActive ?? true, ForeColor = ThemeColors.TextSecondary };
        _chkActive.CheckedState.FillColor = ThemeColors.GoldPrimary;
        Controls.Add(_chkActive);
        y += 40;

        var btnSave = new Guna2Button
        {
            Text = "SAVE", Location = new Point(150, y + 8), Size = new Size(105, 40),
            FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold), DialogResult = DialogResult.OK
        };
        var btnCancel = new Guna2Button
        {
            Text = "CANCEL", Location = new Point(260, y + 8), Size = new Size(105, 40),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextSecondary, BorderRadius = 8,
            Font = new Font("Segoe UI", 10F), DialogResult = DialogResult.Cancel
        };
        Controls.Add(btnSave);
        Controls.Add(btnCancel);
        AcceptButton = btnSave;
        CancelButton = btnCancel;
        ClientSize = new Size(400, y + 60);
    }

    private Guna2TextBox AddField(string label, string value, ref int y, bool isPassword = false)
    {
        Controls.Add(new Label { Text = label.ToUpperInvariant(), ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(24, y), AutoSize = true });
        var textBox = new Guna2TextBox
        {
            Location = new Point(24, y + 18), Size = new Size(350, 36),
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary,
            BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6, Text = value,
            PasswordChar = isPassword ? '•' : '\0'
        };
        Controls.Add(textBox);
        y += 56;
        return textBox;
    }
}
