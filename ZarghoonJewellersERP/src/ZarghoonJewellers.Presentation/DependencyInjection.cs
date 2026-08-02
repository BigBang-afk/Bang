using Microsoft.Extensions.DependencyInjection;
using ZarghoonJewellers.Presentation.Forms.AuditLog;
using ZarghoonJewellers.Presentation.Forms.Customers;
using ZarghoonJewellers.Presentation.Forms.Dashboard;
using ZarghoonJewellers.Presentation.Forms.GoldRate;
using ZarghoonJewellers.Presentation.Forms.Invoices;
using ZarghoonJewellers.Presentation.Forms.Ledgers;
using ZarghoonJewellers.Presentation.Forms.Login;
using ZarghoonJewellers.Presentation.Forms.Purchases;
using ZarghoonJewellers.Presentation.Forms.RepairOrders;
using ZarghoonJewellers.Presentation.Forms.Shell;
using ZarghoonJewellers.Presentation.Forms.Stock;
using ZarghoonJewellers.Presentation.Forms.Suppliers;
using ZarghoonJewellers.Presentation.Forms.UsersRoles;

namespace ZarghoonJewellers.Presentation;

/// <summary>Registers every top-level form and bespoke module UserControl as Transient so the
/// shell gets a fresh instance each time it resolves one (module instances are then cached by
/// <see cref="FrmMain"/> itself for reuse across navigations within the same session).</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddPresentationForms(this IServiceCollection services)
    {
        services.AddTransient<FrmLogin>();
        services.AddTransient<FrmMain>();

        services.AddTransient<UcDashboard>();
        services.AddTransient<UcCustomers>();
        services.AddTransient<UcSuppliers>();
        services.AddTransient<UcStock>();
        services.AddTransient<UcInvoices>();
        services.AddTransient<UcInvoiceSearch>();
        services.AddTransient<UcPurchases>();
        services.AddTransient<UcGoldRate>();
        services.AddTransient<UcCashLedger>();
        services.AddTransient<UcGoldLedger>();
        services.AddTransient<UcPartyLedger>();
        services.AddTransient<UcCustomerStatement>();
        services.AddTransient<UcProfitReports>();
        services.AddTransient<UcRepairOrders>();
        services.AddTransient<UcUsersRoles>();
        services.AddTransient<UcAuditLog>();

        return services;
    }
}
