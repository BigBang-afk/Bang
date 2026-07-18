using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Posts gold-weight movements against Customers, Suppliers or Karigars and keeps the
/// owning entity's CurrentGoldBalance in sync. Sign convention (shared with Customer/
/// Supplier/Karigar.CurrentGoldBalance): positive = the shop owes the entity gold,
/// negative = the entity owes the shop gold (e.g. gold issued to a karigar for work).
/// "Given" (shop -> entity) decreases the balance; "Received" (entity -> shop) increases it.
/// </summary>
public class GoldLedgerService : IGoldLedgerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public GoldLedgerService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<GoldLedgerEntry>> GetHistoryForEntityAsync(string entityType, int entityId, CancellationToken cancellationToken = default)
        => _unitOfWork.GoldLedger.GetHistoryForEntityAsync(entityType, entityId, cancellationToken);

    public async Task<GoldLedgerEntry> PostEntryAsync(string entityType, int entityId, string transactionType, string purity,
        decimal weight, string? referenceType, int? referenceId, string? description, int createdBy,
        CancellationToken cancellationToken = default)
    {
        if (transactionType is not ("Given" or "Received"))
            throw new BusinessRuleException("Transaction type must be either 'Given' or 'Received'.");
        if (weight <= 0)
            throw new BusinessRuleException("Weight must be greater than zero.");

        var signedWeight = transactionType == "Given" ? -weight : weight;
        var lastBalance = await _unitOfWork.GoldLedger.GetLastRunningBalanceAsync(entityType, entityId, cancellationToken);

        var entry = new GoldLedgerEntry
        {
            TransactionDate = DateTime.Now,
            EntityType = entityType,
            EntityId = entityId,
            TransactionType = transactionType,
            Purity = purity,
            Weight = weight,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            Description = description,
            RunningBalance = lastBalance + signedWeight,
            CreatedBy = createdBy,
            CreatedDate = DateTime.Now
        };

        await _unitOfWork.GoldLedger.AddAsync(entry, cancellationToken);
        await ApplyBalanceToEntityAsync(entityType, entityId, signedWeight, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(createdBy, "Insert", "GoldLedger", entry.GoldLedgerId.ToString(), null, description, cancellationToken);
        return entry;
    }

    private async Task ApplyBalanceToEntityAsync(string entityType, int entityId, decimal signedWeight, CancellationToken cancellationToken)
    {
        switch (entityType)
        {
            case "Customer":
                var customer = await _unitOfWork.Customers.GetByIdAsync(entityId, cancellationToken)
                    ?? throw new BusinessRuleException("Customer not found.");
                customer.CurrentGoldBalance += signedWeight;
                _unitOfWork.Customers.Update(customer);
                break;

            case "Supplier":
                var supplier = await _unitOfWork.Suppliers.GetByIdAsync(entityId, cancellationToken)
                    ?? throw new BusinessRuleException("Supplier not found.");
                supplier.CurrentGoldBalance += signedWeight;
                _unitOfWork.Suppliers.Update(supplier);
                break;

            case "Karigar":
                var karigar = await _unitOfWork.Karigars.GetByIdAsync(entityId, cancellationToken)
                    ?? throw new BusinessRuleException("Karigar not found.");
                karigar.CurrentGoldBalance += signedWeight;
                _unitOfWork.Karigars.Update(karigar);
                break;

            default:
                throw new BusinessRuleException($"Unknown gold ledger entity type '{entityType}'.");
        }
    }
}
