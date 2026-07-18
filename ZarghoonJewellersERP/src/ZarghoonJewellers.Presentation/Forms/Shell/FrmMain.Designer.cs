using Guna.UI2.WinForms;

namespace ZarghoonJewellers.Presentation.Forms.Shell;

partial class FrmMain
{
    private System.ComponentModel.IContainer components = null!;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null)) components.Dispose();
        base.Dispose(disposing);
    }

    private Guna2BorderlessForm guna2BorderlessForm1 = null!;
    private Guna2Panel pnlSidebar = null!;
    private Guna2Panel pnlSidebarHeader = null!;
    private Label lblBrand = null!;
    private Guna2Button btnCollapseSidebar = null!;
    private Panel pnlSidebarNavHost = null!;
    private Guna2Panel pnlSidebarFooter = null!;
    private Guna2Button btnSignOut = null!;
    private Guna2Panel pnlTopRibbon = null!;
    private Label lblPageTitle = null!;
    private Label lblGoldRateTicker = null!;
    private Label lblDollarRateTicker = null!;
    private Guna2CirclePictureBox picUserAvatar = null!;
    private Label lblUserName = null!;
    private Label lblUserRole = null!;
    private Guna2Button btnClose = null!;
    private Guna2Button btnMaximize = null!;
    private Guna2Button btnMinimize = null!;
    private Panel pnlContent = null!;

    protected internal Panel ContentHost => pnlContent;
    protected internal Panel SidebarNavHost => pnlSidebarNavHost;
    protected internal Label PageTitleLabel => lblPageTitle;
    protected internal Label GoldRateTickerLabel => lblGoldRateTicker;
    protected internal Label DollarRateTickerLabel => lblDollarRateTicker;
    protected internal Label UserNameLabel => lblUserName;
    protected internal Label UserRoleLabel => lblUserRole;
    protected internal Guna2Button SignOutButton => btnSignOut;
    protected internal Guna2Button CollapseSidebarButton => btnCollapseSidebar;
    protected internal Guna2Panel SidebarPanel => pnlSidebar;

    private void InitializeComponent()
    {
        components = new System.ComponentModel.Container();
        guna2BorderlessForm1 = new Guna2BorderlessForm(components);
        pnlSidebar = new Guna2Panel();
        pnlSidebarHeader = new Guna2Panel();
        lblBrand = new Label();
        btnCollapseSidebar = new Guna2Button();
        pnlSidebarNavHost = new Panel();
        pnlSidebarFooter = new Guna2Panel();
        btnSignOut = new Guna2Button();
        pnlTopRibbon = new Guna2Panel();
        lblPageTitle = new Label();
        lblGoldRateTicker = new Label();
        lblDollarRateTicker = new Label();
        picUserAvatar = new Guna2CirclePictureBox();
        lblUserName = new Label();
        lblUserRole = new Label();
        btnClose = new Guna2Button();
        btnMaximize = new Guna2Button();
        btnMinimize = new Guna2Button();
        pnlContent = new Panel();

        ((System.ComponentModel.ISupportInitialize)picUserAvatar).BeginInit();
        SuspendLayout();

        guna2BorderlessForm1.BorderRadius = 0;
        guna2BorderlessForm1.ContainerControl = this;
        guna2BorderlessForm1.DragControl = pnlTopRibbon;
        guna2BorderlessForm1.ResizeForm = true;
        guna2BorderlessForm1.TransparentWhileDrag = false;

        // Sidebar
        pnlSidebar.Dock = DockStyle.Left;
        pnlSidebar.Width = 250;
        pnlSidebar.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundSidebar;
        pnlSidebar.Controls.Add(pnlSidebarNavHost);
        pnlSidebar.Controls.Add(pnlSidebarFooter);
        pnlSidebar.Controls.Add(pnlSidebarHeader);

        pnlSidebarHeader.Dock = DockStyle.Top;
        pnlSidebarHeader.Height = 70;
        pnlSidebarHeader.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundSidebar;
        pnlSidebarHeader.Controls.Add(lblBrand);
        pnlSidebarHeader.Controls.Add(btnCollapseSidebar);

        lblBrand.Text = "ZARGHOON JEWELLERS";
        lblBrand.Font = new Font("Segoe UI Semibold", 12F, FontStyle.Bold);
        lblBrand.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        lblBrand.Location = new Point(20, 24);
        lblBrand.AutoSize = true;

        btnCollapseSidebar.Text = "☰";
        btnCollapseSidebar.Size = new Size(32, 32);
        btnCollapseSidebar.Location = new Point(206, 20);
        btnCollapseSidebar.FillColor = Color.Transparent;
        btnCollapseSidebar.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnCollapseSidebar.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        btnCollapseSidebar.BorderRadius = 6;

        pnlSidebarNavHost.Dock = DockStyle.Fill;
        pnlSidebarNavHost.AutoScroll = true;
        pnlSidebarNavHost.BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundSidebar;
        pnlSidebarNavHost.Padding = new Padding(0, 8, 0, 8);

        pnlSidebarFooter.Dock = DockStyle.Bottom;
        pnlSidebarFooter.Height = 70;
        pnlSidebarFooter.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundSidebar;
        pnlSidebarFooter.Controls.Add(btnSignOut);

        btnSignOut.Text = "  Sign Out";
        btnSignOut.Dock = DockStyle.Top;
        btnSignOut.Height = 46;
        btnSignOut.Margin = new Padding(8);
        btnSignOut.FillColor = Color.Transparent;
        btnSignOut.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.Danger;
        btnSignOut.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        btnSignOut.BorderRadius = 8;
        btnSignOut.Font = new Font("Segoe UI", 10F);

        // Top ribbon
        pnlTopRibbon.Dock = DockStyle.Top;
        pnlTopRibbon.Height = 64;
        pnlTopRibbon.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundPanel;
        pnlTopRibbon.Controls.Add(lblPageTitle);
        pnlTopRibbon.Controls.Add(lblGoldRateTicker);
        pnlTopRibbon.Controls.Add(lblDollarRateTicker);
        pnlTopRibbon.Controls.Add(picUserAvatar);
        pnlTopRibbon.Controls.Add(lblUserName);
        pnlTopRibbon.Controls.Add(lblUserRole);
        pnlTopRibbon.Controls.Add(btnClose);
        pnlTopRibbon.Controls.Add(btnMaximize);
        pnlTopRibbon.Controls.Add(btnMinimize);

        lblPageTitle.Text = "Dashboard";
        lblPageTitle.Font = new Font("Segoe UI Semibold", 14F, FontStyle.Bold);
        lblPageTitle.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        lblPageTitle.Location = new Point(24, 18);
        lblPageTitle.AutoSize = true;

        lblGoldRateTicker.Text = "Gold: —";
        lblGoldRateTicker.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        lblGoldRateTicker.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;
        lblGoldRateTicker.AutoSize = true;
        lblGoldRateTicker.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        lblDollarRateTicker.Text = "USD: —";
        lblDollarRateTicker.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        lblDollarRateTicker.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.Success;
        lblDollarRateTicker.AutoSize = true;
        lblDollarRateTicker.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        picUserAvatar.Size = new Size(36, 36);
        picUserAvatar.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        picUserAvatar.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.GoldPrimary;

        lblUserName.Font = new Font("Segoe UI Semibold", 9.5F, FontStyle.Bold);
        lblUserName.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextPrimary;
        lblUserName.AutoSize = true;
        lblUserName.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        lblUserRole.Font = new Font("Segoe UI", 8F);
        lblUserRole.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextMuted;
        lblUserRole.AutoSize = true;
        lblUserRole.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        btnClose.Text = "✕";
        btnClose.Size = new Size(40, 30);
        btnClose.FillColor = Color.Transparent;
        btnClose.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnClose.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.Danger;
        btnClose.BorderRadius = 6;
        btnClose.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        btnMaximize.Text = "☐";
        btnMaximize.Size = new Size(40, 30);
        btnMaximize.FillColor = Color.Transparent;
        btnMaximize.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnMaximize.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        btnMaximize.BorderRadius = 6;
        btnMaximize.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        btnMinimize.Text = "—";
        btnMinimize.Size = new Size(40, 30);
        btnMinimize.FillColor = Color.Transparent;
        btnMinimize.ForeColor = ZarghoonJewellers.Common.Theming.ThemeColors.TextSecondary;
        btnMinimize.HoverState.FillColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundHover;
        btnMinimize.BorderRadius = 6;
        btnMinimize.Anchor = AnchorStyles.Top | AnchorStyles.Right;

        // Content host
        pnlContent.Dock = DockStyle.Fill;
        pnlContent.BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;

        // FrmMain
        AutoScaleDimensions = new SizeF(96F, 96F);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(1400, 860);
        Controls.Add(pnlContent);
        Controls.Add(pnlTopRibbon);
        Controls.Add(pnlSidebar);
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;
        BackColor = ZarghoonJewellers.Common.Theming.ThemeColors.BackgroundDark;
        Text = "Zarghoon Jewellers ERP";
        MinimumSize = new Size(1100, 700);

        Resize += (_, _) => RepositionRibbonControls();

        ((System.ComponentModel.ISupportInitialize)picUserAvatar).EndInit();
        ResumeLayout(false);

        // Positioned only after ResumeLayout so the docked ribbon panel already has its real,
        // laid-out width to measure against (SuspendLayout defers docking calculations).
        RepositionRibbonControls();
    }

    private void RepositionRibbonControls()
    {
        int right = pnlTopRibbon.Width - 16;

        btnClose.Location = new Point(right - btnClose.Width, 14);
        right -= btnClose.Width + 4;

        btnMaximize.Location = new Point(right - btnMaximize.Width, 14);
        right -= btnMaximize.Width + 4;

        btnMinimize.Location = new Point(right - btnMinimize.Width, 14);
        right -= btnMinimize.Width + 24;

        lblUserRole.Location = new Point(right - lblUserRole.Width, 34);
        lblUserName.Location = new Point(right - Math.Max(lblUserName.Width, lblUserRole.Width), 16);
        right -= Math.Max(lblUserName.Width, lblUserRole.Width) + 12;

        picUserAvatar.Location = new Point(right - picUserAvatar.Width, 14);
        right -= picUserAvatar.Width + 24;

        lblDollarRateTicker.Location = new Point(right - lblDollarRateTicker.Width, 24);
        right -= lblDollarRateTicker.Width + 20;

        lblGoldRateTicker.Location = new Point(right - lblGoldRateTicker.Width, 24);
    }
}
