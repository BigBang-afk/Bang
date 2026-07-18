using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ZarghoonJewellers.Business;
using ZarghoonJewellers.DataAccess;
using ZarghoonJewellers.Presentation.Forms.Login;
using ZarghoonJewellers.Presentation.Forms.Shell;

namespace ZarghoonJewellers.Presentation;

internal static class Program
{
    /// <summary>
    /// Application composition root. Builds a generic host purely to get its DI container +
    /// configuration binding (there is no ASP.NET pipeline here - this is a WinForms desktop
    /// app), registers every layer (DataAccess -> Business -> Presentation forms), then shows
    /// the login screen followed by the main shell.
    ///
    /// Each top-level form is resolved from its own DI scope so its EF Core DbContext (and
    /// everything built on top of it) is fresh for that form's lifetime rather than shared
    /// for the entire application run - the login form's scope is discarded the moment it
    /// closes, and the main shell gets a new scope of its own that lives until the user signs out.
    /// </summary>
    [STAThread]
    static void Main()
    {
        ApplyPakistaniRupeeCulture();
        ApplicationConfiguration.Initialize();

        using var host = Host.CreateDefaultBuilder()
            .ConfigureAppConfiguration(config =>
            {
                config.SetBasePath(AppContext.BaseDirectory);
                config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);
            })
            .ConfigureServices((context, services) =>
            {
                var connectionString = context.Configuration.GetConnectionString("ZarghoonJewellersDB")
                    ?? throw new InvalidOperationException("Connection string 'ZarghoonJewellersDB' was not found in appsettings.json.");

                services.AddDataAccess(connectionString);
                services.AddBusinessServices();
                services.AddPresentationForms();
            })
            .Build();

        // Sign-in loop: a user can log out from the shell and land back on the login screen
        // without restarting the process.
        while (true)
        {
            using var loginScope = host.Services.CreateScope();
            var loginForm = loginScope.ServiceProvider.GetRequiredService<FrmLogin>();
            var loginResult = loginForm.ShowDialog();

            if (loginResult != DialogResult.OK)
                break; // user closed the login window without signing in

            using var shellScope = host.Services.CreateScope();
            var mainForm = shellScope.ServiceProvider.GetRequiredService<FrmMain>();
            Application.Run(mainForm);

            if (!mainForm.UserRequestedLogout)
                break; // window closed normally (not via "Sign out") -> exit the application
        }
    }

    /// <summary>
    /// Every "C0"/"C2" format string in the app (stat cards, invoice totals, ledger grids)
    /// renders using the thread's current culture. Rather than depend on a named culture like
    /// "en-PK" - which may or may not be present in a given machine's globalization data -
    /// this clones the invariant culture and overrides just the currency symbol, so amounts
    /// always show as "PKR 1,234" instead of the current machine's default "$1,234".
    /// </summary>
    private static void ApplyPakistaniRupeeCulture()
    {
        var culture = (CultureInfo)CultureInfo.InvariantCulture.Clone();
        culture.NumberFormat.CurrencySymbol = "PKR ";
        culture.NumberFormat.CurrencyDecimalDigits = 0;
        culture.NumberFormat.CurrencyGroupSeparator = ",";
        culture.NumberFormat.NumberGroupSeparator = ",";

        CultureInfo.DefaultThreadCurrentCulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
        Thread.CurrentThread.CurrentCulture = culture;
        Thread.CurrentThread.CurrentUICulture = culture;
    }
}
