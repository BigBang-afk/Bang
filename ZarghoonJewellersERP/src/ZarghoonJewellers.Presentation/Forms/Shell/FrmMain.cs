using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Presentation.Controls;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Shell;

/// <summary>
/// The application shell shown after a successful login: sidebar navigation, top ribbon
/// (page title, live gold/USD rate ticker, signed-in user, window controls) and a content
/// area that swaps in one module UserControl at a time. Module instances are created lazily
/// on first visit and cached so switching back to a screen doesn't re-run its constructor,
/// but <see cref="IAsyncLoadable.LoadAsync"/> still re-fires on every visit for fresh data.
/// </summary>
public partial class FrmMain : Form
{
    private readonly IServiceProvider _serviceProvider;
    private readonly CurrentSession _session;
    private readonly IAuthService _authService;
    private readonly IGoldRateService _goldRateService;

    private readonly List<ModuleDefinition> _modules;
    private readonly Dictionary<string, Control> _moduleInstances = new();
    private readonly Dictionary<string, SidebarNavButton> _navButtons = new();
    private string? _activeModuleKey;
    private bool _sidebarCollapsed;

    /// <summary>Set true when the user explicitly signs out (vs. closing the window), telling
    /// Program.cs to return to the login screen instead of exiting the process.</summary>
    public bool UserRequestedLogout { get; private set; }

    public FrmMain(IServiceProvider serviceProvider, CurrentSession session, IAuthService authService, IGoldRateService goldRateService)
    {
        _serviceProvider = serviceProvider;
        _session = session;
        _authService = authService;
        _goldRateService = goldRateService;

        InitializeComponent();

        _modules = ModuleRegistry.BuildModules(serviceProvider);
        BuildSidebarNavigation();

        SignOutButton.Click += async (_, _) => await SignOutAsync();
        CollapseSidebarButton.Click += (_, _) => ToggleSidebar();
        btnClose.Click += (_, _) => Close();
        btnMinimize.Click += (_, _) => WindowState = FormWindowState.Minimized;
        btnMaximize.Click += (_, _) => WindowState = WindowState == FormWindowState.Maximized
            ? FormWindowState.Normal
            : FormWindowState.Maximized;

        Load += async (_, _) => await OnShellLoadedAsync();
    }

    private async Task OnShellLoadedAsync()
    {
        UserNameLabel.Text = _session.FullName;
        UserRoleLabel.Text = _session.RoleName;

        await RefreshRateTickerAsync();
        await NavigateToAsync("dashboard");
    }

    private async Task RefreshRateTickerAsync()
    {
        var rate = await _goldRateService.GetLatestAsync();
        GoldRateTickerLabel.Text = rate is null ? "Gold: —" : $"Gold (22K): {rate.Rate22K:C0}/g";
        DollarRateTickerLabel.Text = rate is null ? "USD: —" : $"USD: {rate.UsdToPkr:C2}";
    }

    private void BuildSidebarNavigation()
    {
        SidebarNavHost.Controls.Clear();
        _navButtons.Clear();

        // Controls are added to a top-docked host in reverse so the first module ends up
        // visually first (WinForms Dock=Top stacks in reverse-add order).
        foreach (var module in Enumerable.Reverse(_modules))
        {
            if (!_session.HasPermission(module.PermissionModule, "CanView"))
                continue;

            var button = new SidebarNavButton(module.Key, module.DisplayName, module.IconLetter, module.IconColor);
            button.Click += async (_, _) => await NavigateToAsync(module.Key);
            SidebarNavHost.Controls.Add(button);
            _navButtons[module.Key] = button;
        }
    }

    private async Task NavigateToAsync(string moduleKey)
    {
        var module = _modules.FirstOrDefault(m => m.Key == moduleKey);
        if (module is null) return;

        if (!_moduleInstances.TryGetValue(moduleKey, out var control))
        {
            control = module.Factory();
            control.Dock = DockStyle.Fill;
            _moduleInstances[moduleKey] = control;
        }

        foreach (Control existing in ContentHost.Controls)
            existing.Visible = false;

        if (!ContentHost.Controls.Contains(control))
            ContentHost.Controls.Add(control);

        control.Visible = true;
        control.BringToFront();
        UIAnimator.SlideIn(control, 24, 180);

        PageTitleLabel.Text = module.DisplayName;

        foreach (var (key, button) in _navButtons)
            button.IsActive = key == moduleKey;

        _activeModuleKey = moduleKey;

        if (control is IAsyncLoadable loadable)
            await loadable.LoadAsync();
    }

    private void ToggleSidebar()
    {
        _sidebarCollapsed = !_sidebarCollapsed;
        UIAnimator.AnimateWidth(SidebarPanel, _sidebarCollapsed ? 70 : 250);

        foreach (var button in _navButtons.Values)
            button.Text = _sidebarCollapsed ? string.Empty : "   " + _modules.First(m => m.Key == button.ModuleKey).DisplayName;
    }

    private async Task SignOutAsync()
    {
        var confirm = MessageBox.Show(this, "Sign out of Zarghoon Jewellers ERP?", "Sign Out",
            MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        if (confirm != DialogResult.Yes) return;

        await _authService.LogoutAsync();
        UserRequestedLogout = true;
        Close();
    }
}
