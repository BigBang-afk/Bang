using CommunityToolkit.Maui;
using GoldBusinessManager.App.Services;
using GoldBusinessManager.Core.Entities;
using GoldBusinessManager.Core.Interfaces;
using GoldBusinessManager.Data;
using Microsoft.Extensions.Logging;

namespace GoldBusinessManager.App;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .ConfigureFonts(fonts =>
            {
                // Add custom fonts here once .ttf files are placed in Resources/Fonts, e.g.:
                // fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            });

        builder.Services.AddMauiBlazorWebView();

        RegisterDatabase(builder.Services);
        RegisterRepositories(builder.Services);
        builder.Services.AddSingleton<AuthState>();

#if DEBUG
        builder.Services.AddBlazorWebViewDeveloperTools();
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }

    private static void RegisterDatabase(IServiceCollection services)
    {
        var databasePath = Path.Combine(FileSystem.AppDataDirectory, "goldbusiness.db3");
        services.AddSingleton(new DatabaseService(databasePath));
    }

    private static void RegisterRepositories(IServiceCollection services)
    {
        services.AddSingleton<IRepository<User>, Repository<User>>();
        services.AddSingleton<IRepository<Customer>, Repository<Customer>>();
        services.AddSingleton<IRepository<Supplier>, Repository<Supplier>>();
        services.AddSingleton<IRepository<SalesInvoice>, Repository<SalesInvoice>>();
        services.AddSingleton<IRepository<Purchase>, Repository<Purchase>>();
        services.AddSingleton<IRepository<GoldStock>, Repository<GoldStock>>();
        services.AddSingleton<IRepository<GoldStockMovement>, Repository<GoldStockMovement>>();
        services.AddSingleton<IRepository<CashTransaction>, Repository<CashTransaction>>();
        services.AddSingleton<IRepository<BankAccount>, Repository<BankAccount>>();
        services.AddSingleton<IRepository<BankTransaction>, Repository<BankTransaction>>();
        services.AddSingleton<IRepository<Expense>, Repository<Expense>>();
        services.AddSingleton<IRepository<AppSetting>, Repository<AppSetting>>();
    }
}
