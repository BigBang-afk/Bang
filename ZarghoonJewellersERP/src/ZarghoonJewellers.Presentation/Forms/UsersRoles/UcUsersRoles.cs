using Guna.UI2.WinForms;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.UsersRoles;

/// <summary>User account administration: create logins, edit profile/role/active state, and
/// reset passwords. Role/permission definitions themselves are seeded by the database script
/// (see 04_SeedData.sql) - this screen assigns an existing role to a user rather than editing
/// the permission matrix, keeping the UI focused on the day-to-day admin task.</summary>
public class UcUsersRoles : UserControl, IAsyncLoadable
{
    private readonly IUserManagementService _userManagementService;
    private readonly DataGridView _grid;
    private IReadOnlyList<Role> _roles = Array.Empty<Role>();

    public UcUsersRoles(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;

        Dock = DockStyle.Fill;
        BackColor = ThemeColors.BackgroundDark;
        Padding = new Padding(20);

        var titleLabel = new Label { Text = "Users & Roles", Dock = DockStyle.Top, Height = 40, Font = ThemeColors.FontHeading, ForeColor = ThemeColors.TextPrimary };

        var toolbar = new Guna2Panel { Dock = DockStyle.Top, Height = 56, FillColor = ThemeColors.BackgroundDark };
        var btnAdd = MakeButton("+ Add User", ThemeColors.GoldPrimary, ThemeColors.TextOnGold, 0);
        var btnEdit = MakeButton("Edit", ThemeColors.BackgroundCard, ThemeColors.TextPrimary, 100);
        var btnResetPwd = MakeButton("Reset Password", ThemeColors.BackgroundCard, ThemeColors.Warning, 180);
        var btnRefresh = MakeButton("⟳ Refresh", ThemeColors.BackgroundCard, ThemeColors.TextSecondary, 320);

        btnAdd.Click += async (_, _) => await AddUserAsync();
        btnEdit.Click += async (_, _) => await EditUserAsync();
        btnResetPwd.Click += async (_, _) => await ResetPasswordAsync();
        btnRefresh.Click += async (_, _) => await LoadAsync();

        toolbar.Controls.Add(btnAdd);
        toolbar.Controls.Add(btnEdit);
        toolbar.Controls.Add(btnResetPwd);
        toolbar.Controls.Add(btnRefresh);

        _grid = new DataGridView
        {
            Dock = DockStyle.Fill, BackgroundColor = ThemeColors.BackgroundCard, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, AllowUserToAddRows = false, ReadOnly = true, EnableHeadersVisualStyles = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            GridColor = ThemeColors.BorderSubtle, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, ColumnHeadersHeight = 34
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = ThemeColors.BackgroundPanel;
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = ThemeColors.GoldPrimary;
        _grid.DefaultCellStyle.BackColor = ThemeColors.BackgroundCard;
        _grid.DefaultCellStyle.ForeColor = ThemeColors.TextPrimary;
        _grid.Columns.Add("Username", "Username");
        _grid.Columns.Add("FullName", "Full Name");
        _grid.Columns.Add("Role", "Role");
        _grid.Columns.Add("Active", "Active");
        _grid.Columns.Add("LastLogin", "Last Login");

        Controls.Add(_grid);
        Controls.Add(toolbar);
        Controls.Add(titleLabel);
    }

    private static Guna2Button MakeButton(string text, Color fill, Color fore, int x) => new()
    {
        Text = text, Location = new Point(x, 8), Size = new Size(120, 38),
        FillColor = fill, ForeColor = fore, BorderRadius = 8, Font = new Font("Segoe UI", 9F, FontStyle.Bold)
    };

    public async Task LoadAsync()
    {
        _roles = await _userManagementService.GetAllRolesAsync();
        var users = await _userManagementService.GetAllUsersAsync();

        _grid.Rows.Clear();
        foreach (var user in users)
        {
            var roleName = _roles.FirstOrDefault(r => r.RoleId == user.RoleId)?.RoleName ?? "-";
            var rowIndex = _grid.Rows.Add(user.Username, user.FullName, roleName, user.IsActive ? "Yes" : "No", user.LastLoginDate?.ToString("g") ?? "Never");
            _grid.Rows[rowIndex].Tag = user;
        }
    }

    private User? GetSelected() => _grid.SelectedRows.Count > 0 ? _grid.SelectedRows[0].Tag as User : null;

    private async Task AddUserAsync()
    {
        using var dialog = new UserEditForm("Add User", isNewUser: true, _roles);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _userManagementService.CreateUserAsync(dialog.Username, dialog.Password, dialog.FullName, dialog.Email, dialog.RoleId);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not create user", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task EditUserAsync()
    {
        var user = GetSelected();
        if (user is null)
        {
            MessageBox.Show(this, "Select a user first.", "Users", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using var dialog = new UserEditForm("Edit User", isNewUser: false, _roles, user);
        if (dialog.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            await _userManagementService.UpdateUserAsync(user.UserId, dialog.FullName, dialog.Email, dialog.RoleId, dialog.IsActive);
            await LoadAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not save", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private async Task ResetPasswordAsync()
    {
        var user = GetSelected();
        if (user is null)
        {
            MessageBox.Show(this, "Select a user first.", "Users", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var newPassword = PromptForPassword(user.Username);
        if (string.IsNullOrWhiteSpace(newPassword)) return;

        try
        {
            await _userManagementService.ResetPasswordAsync(user.UserId, newPassword);
            MessageBox.Show(this, "Password reset. The user will be asked to change it at next login.", "Users", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Could not reset password", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private string? PromptForPassword(string username)
    {
        using var prompt = new Form
        {
            Text = $"Reset Password - {username}",
            FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterParent,
            MaximizeBox = false,
            MinimizeBox = false,
            ClientSize = new Size(360, 160),
            BackColor = ThemeColors.BackgroundDark
        };

        var label = new Label { Text = "NEW PASSWORD", ForeColor = ThemeColors.TextMuted, Font = new Font("Segoe UI", 8F, FontStyle.Bold), Location = new Point(20, 16), AutoSize = true };
        var textBox = new Guna2TextBox
        {
            Location = new Point(20, 36), Size = new Size(320, 36), PasswordChar = '•',
            FillColor = ThemeColors.BackgroundCard, ForeColor = ThemeColors.TextPrimary, BorderColor = ThemeColors.BorderSubtle, BorderRadius = 6
        };
        var btnOk = new Guna2Button { Text = "RESET", Location = new Point(115, 90), Size = new Size(130, 40), FillColor = ThemeColors.GoldPrimary, ForeColor = ThemeColors.TextOnGold, BorderRadius = 8, DialogResult = DialogResult.OK };

        prompt.Controls.Add(label);
        prompt.Controls.Add(textBox);
        prompt.Controls.Add(btnOk);
        prompt.AcceptButton = btnOk;

        return prompt.ShowDialog(this) == DialogResult.OK ? textBox.Text : null;
    }
}
