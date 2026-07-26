using System.IO;
using System.Windows;
using System.Windows.Threading;
using FXVolumeTrader.App.ViewModels;
using FXVolumeTrader.App.Views;
using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Infrastructure.Data;
using FXVolumeTrader.Infrastructure.Logging;
using FXVolumeTrader.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace FXVolumeTrader.App;

/// <summary>
/// Composition root. Builds the generic host (configuration, DI, Serilog),
/// applies pending EF Core migrations, wires global exception handling,
/// and resolves/shows MainWindow. No business logic lives here.
/// </summary>
public partial class App : System.Windows.Application
{
    private IHost? _host;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        Directory.CreateDirectory(Path.Combine(AppContext.BaseDirectory, "App_Data"));
        Directory.CreateDirectory(Path.Combine(AppContext.BaseDirectory, "Logs"));

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .Build();

        Log.Logger = SerilogConfigurator.CreateLogger(configuration);

        AttachGlobalExceptionHandlers();

        try
        {
            _host = Host.CreateDefaultBuilder()
                .UseSerilog()
                .ConfigureAppConfiguration(builder =>
                {
                    builder.Sources.Clear();
                    builder.AddConfiguration(configuration);
                })
                .ConfigureServices((context, services) => ConfigureServices(context.Configuration, services))
                .Build();

            using (var scope = _host.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.Migrate();
            }

            var mainWindow = _host.Services.GetRequiredService<MainWindow>();
            mainWindow.Show();
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "FX Volume Trader failed to start");
            MessageBox.Show(
                "FX Volume Trader could not start. Please check the log files in the Logs folder for details.",
                "Startup Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Shutdown(-1);
        }
    }

    private static void ConfigureServices(IConfiguration configuration, IServiceCollection services)
    {
        services.AddSingleton(configuration);

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=App_Data/fxvolumetrader.db";

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

        // Navigation
        services.AddSingleton<INavigationService, NavigationService>();

        // Page view models (singleton: one instance per page for the lifetime of the app)
        services.AddSingleton<MainWindowViewModel>();
        services.AddSingleton<DashboardViewModel>();
        services.AddSingleton<LiveChartViewModel>();
        services.AddSingleton<SignalHistoryViewModel>();
        services.AddSingleton<PaperTradingViewModel>();
        services.AddSingleton<QuotexAssistantViewModel>();
        services.AddSingleton<BacktestingViewModel>();
        services.AddSingleton<TradingJournalViewModel>();
        services.AddSingleton<PerformanceAnalyticsViewModel>();
        services.AddSingleton<StrategySettingsViewModel>();
        services.AddSingleton<RiskSettingsViewModel>();
        services.AddSingleton<DataProviderSettingsViewModel>();
        services.AddSingleton<ApplicationLogsViewModel>();
        services.AddSingleton<BackupRestoreViewModel>();
        services.AddSingleton<AboutViewModel>();

        services.AddSingleton<MainWindow>();
    }

    private void AttachGlobalExceptionHandlers()
    {
        DispatcherUnhandledException += (_, args) =>
        {
            Log.Error(args.Exception, "Unhandled UI dispatcher exception");
            MessageBox.Show(
                "An unexpected error occurred. The application will try to continue running. Details were written to the log.",
                "Unexpected Error",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
            args.Handled = true;
        };

        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            Log.Fatal(args.ExceptionObject as Exception, "Unhandled AppDomain exception (IsTerminating: {IsTerminating})", args.IsTerminating);
        };

        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            Log.Error(args.Exception, "Unobserved task exception");
            args.SetObserved();
        };
    }

    protected override void OnExit(ExitEventArgs e)
    {
        Log.CloseAndFlush();
        _host?.Dispose();
        base.OnExit(e);
    }
}
