using Microsoft.EntityFrameworkCore.Storage;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Interfaces;

/// <summary>
/// Coordinates one logical business transaction across multiple repositories so a single
/// <see cref="SaveChangesAsync"/> call commits everything atomically (e.g. an invoice,
/// its detail lines, the stock decrement and the ledger entry all succeed or all fail
/// together). Resolved once per scoped operation via DI - see Program.cs.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    // Repositories with entity-specific query methods
    ICustomerRepository Customers { get; }
    ISupplierRepository Suppliers { get; }
    IStockRepository Stock { get; }
    IInvoiceRepository Invoices { get; }
    IPurchaseRepository Purchases { get; }
    IUserRepository Users { get; }
    IDailyGoldRateRepository GoldRates { get; }
    ICashLedgerRepository CashLedger { get; }
    IGoldLedgerRepository GoldLedger { get; }
    IRepairOrderRepository RepairOrders { get; }
    IAuditLogRepository AuditLogs { get; }
    IShiftRepository Shifts { get; }

    // Plain generic repositories for simpler lookup-style entities
    IGenericRepository<Karigar> Karigars { get; }
    IGenericRepository<Employee> Employees { get; }
    IGenericRepository<BankAccount> BankAccounts { get; }
    IGenericRepository<Expense> Expenses { get; }
    IGenericRepository<Income> Income { get; }
    IGenericRepository<StockCategory> StockCategories { get; }
    IGenericRepository<Barcode> Barcodes { get; }
    IGenericRepository<ImageAsset> Images { get; }
    IGenericRepository<Role> Roles { get; }
    IGenericRepository<Permission> Permissions { get; }
    IGenericRepository<RolePermission> RolePermissions { get; }
    IGenericRepository<Setting> Settings { get; }
    IGenericRepository<UsdtTransaction> UsdtTransactions { get; }
    IGenericRepository<InvoicePayment> InvoicePayments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
