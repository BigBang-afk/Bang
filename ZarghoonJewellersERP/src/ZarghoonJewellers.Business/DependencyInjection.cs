using Microsoft.Extensions.DependencyInjection;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Business.Services;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.DataAccess.Repositories.Implementations;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.Business;

/// <summary>Composition-root extension registering every business service and the process-wide session singleton.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        services.AddSingleton<CurrentSession>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IPurchaseService, PurchaseService>();
        services.AddScoped<IGoldRateService, GoldRateService>();
        services.AddScoped<ICashLedgerService, CashLedgerService>();
        services.AddScoped<IGoldLedgerService, GoldLedgerService>();
        services.AddScoped<IRepairOrderService, RepairOrderService>();
        services.AddScoped<IUserManagementService, UserManagementService>();

        // Generic CRUD service + repository for the simpler lookup-style entities.
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped(typeof(ICrudService<>), typeof(CrudService<>));

        return services;
    }
}
