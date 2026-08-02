using ZarghoonJewellers.Business.DTOs;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.Business.Services;

public class LedgerService : ILedgerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICashLedgerService _cashLedgerService;
    private readonly IGoldLedgerService _goldLedgerService;

    public LedgerService(IUnitOfWork unitOfWork, ICashLedgerService cashLedgerService, IGoldLedgerService goldLedgerService)
    {
        _unitOfWork = unitOfWork;
        _cashLedgerService = cashLedgerService;
        _goldLedgerService = goldLedgerService;
    }

    public async Task<EntityLedgerDto> GetCustomerLedgerAsync(int customerId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default)
    {
        var customer = await _unitOfWork.Customers.GetByIdAsync(customerId, cancellationToken)
            ?? throw new BusinessRuleException("Customer not found.");

        return new EntityLedgerDto
        {
            EntityType = "Customer",
            EntityId = customerId,
            EntityName = customer.FullName,
            CurrentCashBalance = customer.CurrentBalance,
            CurrentGoldBalance = customer.CurrentGoldBalance,
            CashMovements = await _cashLedgerService.GetEntityLedgerAsync("Customer", customerId, fromDate, toDate, cancellationToken),
            GoldMovements = await _goldLedgerService.GetHistoryForEntityAsync("Customer", customerId, cancellationToken)
        };
    }

    public async Task<EntityLedgerDto> GetSupplierLedgerAsync(int supplierId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(supplierId, cancellationToken)
            ?? throw new BusinessRuleException("Supplier not found.");

        return new EntityLedgerDto
        {
            EntityType = "Supplier",
            EntityId = supplierId,
            EntityName = supplier.CompanyName,
            CurrentCashBalance = supplier.CurrentBalance,
            CurrentGoldBalance = supplier.CurrentGoldBalance,
            CashMovements = await _cashLedgerService.GetEntityLedgerAsync("Supplier", supplierId, fromDate, toDate, cancellationToken),
            GoldMovements = await _goldLedgerService.GetHistoryForEntityAsync("Supplier", supplierId, cancellationToken)
        };
    }

    public async Task<EntityLedgerDto> GetKarigarLedgerAsync(int karigarId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default)
    {
        var karigar = await _unitOfWork.Karigars.GetByIdAsync(karigarId, cancellationToken)
            ?? throw new BusinessRuleException("Karigar not found.");

        return new EntityLedgerDto
        {
            EntityType = "Karigar",
            EntityId = karigarId,
            EntityName = karigar.FullName,
            CurrentCashBalance = 0,
            CurrentGoldBalance = karigar.CurrentGoldBalance,
            CashMovements = await _cashLedgerService.GetEntityLedgerAsync("Karigar", karigarId, fromDate, toDate, cancellationToken),
            GoldMovements = await _goldLedgerService.GetHistoryForEntityAsync("Karigar", karigarId, cancellationToken)
        };
    }

    public async Task<IReadOnlyList<CustomerStatementDto>> GetCustomerStatementsAsync(CancellationToken cancellationToken = default)
    {
        var customers = await _unitOfWork.Customers.GetAllAsync(cancellationToken);
        var recentInvoices = await _unitOfWork.Invoices.GetRecentAsync(2000, cancellationToken);
        var lastInvoiceByCustomer = recentInvoices
            .GroupBy(i => i.CustomerId)
            .ToDictionary(g => g.Key, g => g.Max(i => i.InvoiceDate));

        return customers
            .Select(c => new CustomerStatementDto(c.CustomerId, c.CustomerCode, c.FullName, c.Phone,
                c.OpeningBalance, c.CurrentBalance, c.CurrentGoldBalance,
                lastInvoiceByCustomer.TryGetValue(c.CustomerId, out var date) ? date : null))
            .OrderByDescending(s => s.CurrentBalance)
            .ToList();
    }

    public async Task<IReadOnlyList<CustomerStatementDto>> GetOutstandingCustomersAsync(CancellationToken cancellationToken = default)
    {
        var statements = await GetCustomerStatementsAsync(cancellationToken);
        return statements.Where(s => s.CurrentBalance != 0).ToList();
    }
}
