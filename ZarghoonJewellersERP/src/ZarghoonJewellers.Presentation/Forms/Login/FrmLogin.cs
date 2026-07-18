using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Theming;

namespace ZarghoonJewellers.Presentation.Forms.Login;

/// <summary>The application's entry screen. Verifies credentials via <see cref="IAuthService"/>
/// and returns <see cref="DialogResult.OK"/> to Program.cs on success so the main shell can be shown.</summary>
public partial class FrmLogin : Form
{
    private readonly IAuthService _authService;

    public FrmLogin(IAuthService authService)
    {
        _authService = authService;
        InitializeComponent();

        Load += (_, _) => UIAnimator.FadeIn(this);
        txtPassword.KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.Enter) BtnLogin_Click(this, EventArgs.Empty);
        };
    }

    private void ChkShowPassword_CheckedChanged(object? sender, EventArgs e)
    {
        txtPassword.PasswordChar = chkShowPassword.Checked ? '\0' : '•';
    }

    private async void BtnLogin_Click(object? sender, EventArgs e)
    {
        lblError.Text = string.Empty;

        var username = txtUsername.Text.Trim();
        var password = txtPassword.Text;

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            lblError.Text = "Please enter both username and password.";
            return;
        }

        btnLogin.Enabled = false;
        btnLogin.Text = "SIGNING IN...";

        try
        {
            var result = await _authService.LoginAsync(username, password);

            if (!result.Success)
            {
                lblError.Text = result.ErrorMessage ?? "Login failed.";
                txtPassword.Text = string.Empty;
                txtPassword.Focus();
                return;
            }

            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            lblError.Text = "Unable to reach the database. Please check your connection and try again.";
            System.Diagnostics.Debug.WriteLine(ex);
        }
        finally
        {
            btnLogin.Enabled = true;
            btnLogin.Text = "SIGN IN";
        }
    }
}
