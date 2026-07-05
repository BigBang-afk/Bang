using GoldLedgerApp.Services;
using GoldLedgerApp.ViewModels;
using GoldLedgerApp.Views;
using Microsoft.Extensions.Logging;

namespace GoldLedgerApp;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
			});

#if DEBUG
		builder.Logging.AddDebug();
#endif

		var dbPath = Path.Combine(FileSystem.AppDataDirectory, "goldledger.db3");

		// Services
		builder.Services.AddSingleton(new DatabaseService(dbPath));
		builder.Services.AddSingleton<AuthService>();
		builder.Services.AddSingleton<SettingsService>();

		// ViewModels
		builder.Services.AddSingleton<DashboardViewModel>();
		builder.Services.AddSingleton<CustomerLedgerViewModel>();
		builder.Services.AddTransient<CustomerDetailViewModel>();
		builder.Services.AddTransient<BuyGoldViewModel>();
		builder.Services.AddTransient<SellGoldViewModel>();
		builder.Services.AddSingleton<ReportsViewModel>();
		builder.Services.AddSingleton<SettingsViewModel>();
		builder.Services.AddTransient<LoginViewModel>();

		// Views
		builder.Services.AddSingleton<DashboardPage>();
		builder.Services.AddSingleton<CustomerLedgerPage>();
		builder.Services.AddTransient<CustomerDetailPage>();
		builder.Services.AddTransient<BuyGoldPage>();
		builder.Services.AddTransient<SellGoldPage>();
		builder.Services.AddSingleton<ReportsPage>();
		builder.Services.AddSingleton<SettingsPage>();
		builder.Services.AddTransient<LoginPage>();

		return builder.Build();
	}
}
