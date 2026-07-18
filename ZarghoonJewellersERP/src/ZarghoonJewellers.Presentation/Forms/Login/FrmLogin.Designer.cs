using Guna.UI2.WinForms;

namespace ZarghoonJewellers.Presentation.Forms.Login;

partial class FrmLogin
{
    private System.ComponentModel.IContainer components = null!;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    private Guna2BorderlessForm guna2BorderlessForm1 = null!;
    private Guna2Panel pnlBrand = null!;
    private Guna2Panel pnlForm = null!;
    private Guna2Panel pnlTitleBar = null!;
    private Guna2Button btnClose = null!;
    private Guna2Button btnMinimize = null!;
    private Label lblBrandTitle = null!;
    private Label lblBrandTagline = null!;
    private Guna2CirclePictureBox picLogo = null!;
    private Label lblWelcome = null!;
    private Label lblSubtitle = null!;
    private Guna2TextBox txtUsername = null!;
    private Guna2TextBox txtPassword = null!;
    private Guna2CheckBox chkShowPassword = null!;
    private Guna2Button btnLogin = null!;
    private Label lblError = null!;
    private Label lblVersion = null!;
    private Label lblUsernameCaption = null!;
    private Label lblPasswordCaption = null!;

    private void InitializeComponent()
    {
        components = new System.ComponentModel.Container();
        guna2BorderlessForm1 = new Guna2BorderlessForm(components);
        pnlBrand = new Guna2Panel();
        picLogo = new Guna2CirclePictureBox();
        lblBrandTitle = new Label();
        lblBrandTagline = new Label();
        pnlForm = new Guna2Panel();
        pnlTitleBar = new Guna2Panel();
        btnClose = new Guna2Button();
        btnMinimize = new Guna2Button();
        lblWelcome = new Label();
        lblSubtitle = new Label();
        lblUsernameCaption = new Label();
        txtUsername = new Guna2TextBox();
        lblPasswordCaption = new Label();
        txtPassword = new Guna2TextBox();
        chkShowPassword = new Guna2CheckBox();
        btnLogin = new Guna2Button();
        lblError = new Label();
        lblVersion = new Label();
        ((System.ComponentModel.ISupportInitialize)picLogo).BeginInit();
        SuspendLayout();

        // guna2BorderlessForm1
        guna2BorderlessForm1.BorderRadius = 12;
        guna2BorderlessForm1.ContainerControl = this;
        guna2BorderlessForm1.DragControl = pnlTitleBar;
        guna2BorderlessForm1.TransparentWhileDrag = true;

        // pnlBrand (left gold gradient panel)
        pnlBrand.Dock = DockStyle.Left;
        pnlBrand.Width = 380;
        pnlBrand.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDarkest;
        pnlBrand.Controls.Add(picLogo);
        pnlBrand.Controls.Add(lblBrandTitle);
        pnlBrand.Controls.Add(lblBrandTagline);

        picLogo.Size = new Size(96, 96);
        picLogo.Location = new Point(142, 130);
        picLogo.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;

        lblBrandTitle.Text = "ZARGHOON\nJEWELLERS";
        lblBrandTitle.Font = new Font("Segoe UI Semibold", 20F, FontStyle.Bold);
        lblBrandTitle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        lblBrandTitle.TextAlign = ContentAlignment.MiddleCenter;
        lblBrandTitle.Location = new Point(20, 250);
        lblBrandTitle.Size = new Size(340, 80);

        lblBrandTagline.Text = "ENTERPRISE JEWELLERY ERP";
        lblBrandTagline.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
        lblBrandTagline.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        lblBrandTagline.TextAlign = ContentAlignment.MiddleCenter;
        lblBrandTagline.Location = new Point(20, 335);
        lblBrandTagline.Size = new Size(340, 30);

        // pnlForm (right dark panel)
        pnlForm.Dock = DockStyle.Fill;
        pnlForm.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;
        pnlForm.Controls.Add(pnlTitleBar);
        pnlForm.Controls.Add(lblWelcome);
        pnlForm.Controls.Add(lblSubtitle);
        pnlForm.Controls.Add(lblUsernameCaption);
        pnlForm.Controls.Add(txtUsername);
        pnlForm.Controls.Add(lblPasswordCaption);
        pnlForm.Controls.Add(txtPassword);
        pnlForm.Controls.Add(chkShowPassword);
        pnlForm.Controls.Add(btnLogin);
        pnlForm.Controls.Add(lblError);
        pnlForm.Controls.Add(lblVersion);

        // pnlTitleBar (drag handle + window controls)
        pnlTitleBar.Dock = DockStyle.Top;
        pnlTitleBar.Height = 40;
        pnlTitleBar.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;
        pnlTitleBar.Controls.Add(btnClose);
        pnlTitleBar.Controls.Add(btnMinimize);

        btnClose.Text = "✕";
        btnClose.Size = new Size(36, 28);
        btnClose.Location = new Point(484, 6);
        btnClose.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        btnClose.FillColor = Color.Transparent;
        btnClose.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnClose.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.Danger;
        btnClose.BorderRadius = 6;
        btnClose.Click += (_, _) => { Application.Exit(); };

        btnMinimize.Text = "—";
        btnMinimize.Size = new Size(36, 28);
        btnMinimize.Location = new Point(444, 6);
        btnMinimize.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        btnMinimize.FillColor = Color.Transparent;
        btnMinimize.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnMinimize.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        btnMinimize.BorderRadius = 6;
        btnMinimize.Click += (_, _) => { WindowState = FormWindowState.Minimized; };

        lblWelcome.Text = "Welcome Back";
        lblWelcome.Font = new Font("Segoe UI Semibold", 22F, FontStyle.Bold);
        lblWelcome.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        lblWelcome.Location = new Point(70, 90);
        lblWelcome.AutoSize = true;

        lblSubtitle.Text = "Sign in to continue to the dashboard";
        lblSubtitle.Font = new Font("Segoe UI", 10F);
        lblSubtitle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        lblSubtitle.Location = new Point(72, 130);
        lblSubtitle.AutoSize = true;

        lblUsernameCaption.Text = "USERNAME";
        lblUsernameCaption.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
        lblUsernameCaption.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        lblUsernameCaption.Location = new Point(72, 185);
        lblUsernameCaption.AutoSize = true;

        txtUsername.Location = new Point(70, 205);
        txtUsername.Size = new Size(380, 42);
        txtUsername.PlaceholderText = "Enter your username";
        txtUsername.BorderRadius = 8;
        txtUsername.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        txtUsername.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        txtUsername.BorderColor = ZarghoonJewellers.Common.Theming.ThemeColors.BorderSubtle;
        txtUsername.FocusedState.BorderColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;

        lblPasswordCaption.Text = "PASSWORD";
        lblPasswordCaption.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
        lblPasswordCaption.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        lblPasswordCaption.Location = new Point(72, 262);
        lblPasswordCaption.AutoSize = true;

        txtPassword.Location = new Point(70, 282);
        txtPassword.Size = new Size(380, 42);
        txtPassword.PlaceholderText = "Enter your password";
        txtPassword.PasswordChar = '•';
        txtPassword.BorderRadius = 8;
        txtPassword.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundCard;
        txtPassword.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        txtPassword.BorderColor = ZarghoonJewellers.Common.Theming.ThemeColors.BorderSubtle;
        txtPassword.FocusedState.BorderColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;

        chkShowPassword.Text = "Show password";
        chkShowPassword.Location = new Point(70, 332);
        chkShowPassword.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        chkShowPassword.CheckedState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        chkShowPassword.CheckedChanged += ChkShowPassword_CheckedChanged;

        btnLogin.Text = "SIGN IN";
        btnLogin.Location = new Point(70, 375);
        btnLogin.Size = new Size(380, 46);
        btnLogin.Font = new Font("Segoe UI Semibold", 11F, FontStyle.Bold);
        btnLogin.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        btnLogin.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextOnGold;
        btnLogin.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldLight;
        btnLogin.BorderRadius = 8;
        btnLogin.Click += BtnLogin_Click;

        lblError.Text = string.Empty;
        lblError.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.Danger;
        lblError.Font = new Font("Segoe UI", 9F);
        lblError.Location = new Point(72, 428);
        lblError.Size = new Size(380, 20);

        lblVersion.Text = "v1.0.0";
        lblVersion.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        lblVersion.Font = new Font("Segoe UI", 8F);
        lblVersion.Location = new Point(72, 470);
        lblVersion.AutoSize = true;

        // FrmLogin
        AutoScaleDimensions = new SizeF(96F, 96F);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(900, 520);
        Controls.Add(pnlForm);
        Controls.Add(pnlBrand);
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;
        Text = "Zarghoon Jewellers ERP - Sign In";
        AcceptButton = btnLogin;
        MaximizeBox = false;
        MinimizeBox = false;

        ((System.ComponentModel.ISupportInitialize)picLogo).EndInit();
        ResumeLayout(false);
    }
}
