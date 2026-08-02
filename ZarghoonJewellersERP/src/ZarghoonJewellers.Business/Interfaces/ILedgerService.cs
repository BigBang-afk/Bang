using ZarghoonJewellers.Business.DTOs;

namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>Assembles the combined cash + gold movement history for one Customer/Supplier/Karigar -
/// backs the Customer Ledger, Supplier Ledger and Karigar Ledger screens (and the Customer
/// Statement/Outstanding Report, which reuse the same underlying balances).</summary>
public interface ILedgerService
{
    Task<EntityLedgerDto> GetCustomerLedgerAsync(int customerId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default);
    Task<EntityLedgerDto> GetSupplierLedgerAsync(int supplierId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default);
    Task<EntityLedgerDto> GetKarigarLedgerAsync(int karigarId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CustomerStatementDto>> GetCustomerStatementsAsync(CancellationToken cancellationToken = default);

    /// <summary>Customers/Suppliers with a non-zero outstanding balance, for the Outstanding Report.</summary>
    Task<IReadOnlyList<CustomerStatementDto>> GetOutstandingCustomersAsync(CancellationToken cancellationToken = default);
}
