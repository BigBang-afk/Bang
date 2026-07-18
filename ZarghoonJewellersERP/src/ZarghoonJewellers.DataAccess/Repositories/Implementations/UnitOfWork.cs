using Microsoft.EntityFrameworkCore.Storage;
using ZarghoonJewellers.DataAccess.Context;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.DataAccess.Repositories.Implementations;

/// <summary>
/// Default <see cref="IUnitOfWork"/> implementation. Repositories are created lazily on
/// first access and reused for the lifetime of this instance (which is scoped per
/// business operation by the DI container), so a form that touches Customers, Invoices
/// and CashLedger in one save shares a single DbContext/transaction.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    private ICustomerRepository? _customers;
    private ISupplierRepository? _suppliers;
    private IStockRepository? _stock;
    private IInvoiceRepository? _invoices;
    private IPurchaseRepository? _purchases;
    private IUserRepository? _users;
    private IDailyGoldRateRepository? _goldRates;
    private ICashLedgerRepository? _cashLedger;
    private IGoldLedgerRepository? _goldLedger;
    private IRepairOrderRepository? _repairOrders;
    private IAuditLogRepository? _auditLogs;

    private IGenericRepository<Karigar>? _karigars;
    private IGenericRepository<Employee>? _employees;
    private IGenericRepository<BankAccount>? _bankAccounts;
    private IGenericRepository<Expense>? _expenses;
    private IGenericRepository<Income>? _income;
    private IGenericRepository<StockCategory>? _stockCategories;
    private IGenericRepository<Barcode>? _barcodes;
    private IGenericRepository<ImageAsset>? _images;
    private IGenericRepository<Role>? _roles;
    private IGenericRepository<Permission>? _permissions;
    private IGenericRepository<RolePermission>? _rolePermissions;
    private IGenericRepository<Setting>? _settings;
    private IGenericRepository<UsdtTransaction>? _usdtTransactions;

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    public ICustomerRepository Customers => _customers ??= new CustomerRepository(_context);
    public ISupplierRepository Suppliers => _suppliers ??= new SupplierRepository(_context);
    public IStockRepository Stock => _stock ??= new StockRepository(_context);
    public IInvoiceRepository Invoices => _invoices ??= new InvoiceRepository(_context);
    public IPurchaseRepository Purchases => _purchases ??= new PurchaseRepository(_context);
    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IDailyGoldRateRepository GoldRates => _goldRates ??= new DailyGoldRateRepository(_context);
    public ICashLedgerRepository CashLedger => _cashLedger ??= new CashLedgerRepository(_context);
    public IGoldLedgerRepository GoldLedger => _goldLedger ??= new GoldLedgerRepository(_context);
    public IRepairOrderRepository RepairOrders => _repairOrders ??= new RepairOrderRepository(_context);
    public IAuditLogRepository AuditLogs => _auditLogs ??= new AuditLogRepository(_context);

    public IGenericRepository<Karigar> Karigars => _karigars ??= new GenericRepository<Karigar>(_context);
    public IGenericRepository<Employee> Employees => _employees ??= new GenericRepository<Employee>(_context);
    public IGenericRepository<BankAccount> BankAccounts => _bankAccounts ??= new GenericRepository<BankAccount>(_context);
    public IGenericRepository<Expense> Expenses => _expenses ??= new GenericRepository<Expense>(_context);
    public IGenericRepository<Income> Income => _income ??= new GenericRepository<Income>(_context);
    public IGenericRepository<StockCategory> StockCategories => _stockCategories ??= new GenericRepository<StockCategory>(_context);
    public IGenericRepository<Barcode> Barcodes => _barcodes ??= new GenericRepository<Barcode>(_context);
    public IGenericRepository<ImageAsset> Images => _images ??= new GenericRepository<ImageAsset>(_context);
    public IGenericRepository<Role> Roles => _roles ??= new GenericRepository<Role>(_context);
    public IGenericRepository<Permission> Permissions => _permissions ??= new GenericRepository<Permission>(_context);
    public IGenericRepository<RolePermission> RolePermissions => _rolePermissions ??= new GenericRepository<RolePermission>(_context);
    public IGenericRepository<Setting> Settings => _settings ??= new GenericRepository<Setting>(_context);
    public IGenericRepository<UsdtTransaction> UsdtTransactions => _usdtTransactions ??= new GenericRepository<UsdtTransaction>(_context);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => _context.Database.BeginTransactionAsync(cancellationToken);

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
