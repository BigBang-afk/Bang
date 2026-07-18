using Microsoft.EntityFrameworkCore;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Context;

/// <summary>
/// EF Core gateway to the ZarghoonJewellersDB database. All entities live under the
/// "erp" schema (see 02_CreateTables.sql); table-by-table mapping details are kept out
/// of this class and split into one IEntityTypeConfiguration per entity under
/// Configurations/, applied via <see cref="OnModelCreating"/>.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<User> Users => Set<User>();

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Karigar> Karigars => Set<Karigar>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    public DbSet<StockCategory> StockCategories => Set<StockCategory>();
    public DbSet<Stock> Stock => Set<Stock>();
    public DbSet<Barcode> Barcodes => Set<Barcode>();
    public DbSet<ImageAsset> Images => Set<ImageAsset>();

    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceDetail> InvoiceDetails => Set<InvoiceDetail>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseDetail> PurchaseDetails => Set<PurchaseDetail>();

    public DbSet<CashLedgerEntry> CashLedger => Set<CashLedgerEntry>();
    public DbSet<GoldLedgerEntry> GoldLedger => Set<GoldLedgerEntry>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Income> Income => Set<Income>();

    public DbSet<RepairOrder> RepairOrders => Set<RepairOrder>();

    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DailyGoldRate> DailyGoldRates => Set<DailyGoldRate>();
    public DbSet<UsdtTransaction> UsdtTransactions => Set<UsdtTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("erp");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
