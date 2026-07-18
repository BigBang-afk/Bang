namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>
/// Generic CRUD surface for the simpler "lookup style" entities that don't need bespoke
/// business rules beyond basic validation (Karigar, Employee, BankAccount, Expense, Income,
/// StockCategory, Role, Permission, Setting, UsdtTransaction). Dedicated services
/// (ICustomerService, IStockService, IInvoiceService, ...) exist for entities where real
/// domain logic - stock movement, balance updates, ledger posting - applies.
/// </summary>
public interface ICrudService<TEntity> where TEntity : class
{
    Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TEntity?> GetByIdAsync(object id, CancellationToken cancellationToken = default);
    Task<TEntity> CreateAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(TEntity entity, CancellationToken cancellationToken = default);
}
