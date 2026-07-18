using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class SupplierService : ISupplierService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public SupplierService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<Supplier>> GetAllAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Suppliers.GetAllAsync(cancellationToken);

    public Task<Supplier?> GetByIdAsync(int supplierId, CancellationToken cancellationToken = default)
        => _unitOfWork.Suppliers.GetByIdAsync(supplierId, cancellationToken);

    public Task<IReadOnlyList<Supplier>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
        => _unitOfWork.Suppliers.SearchAsync(searchTerm, cancellationToken);

    public async Task<Supplier> CreateAsync(Supplier supplier, CancellationToken cancellationToken = default)
    {
        supplier.SupplierCode = await _unitOfWork.Suppliers.GenerateNextSupplierCodeAsync(cancellationToken);
        supplier.CurrentBalance = supplier.OpeningBalance;
        supplier.CreatedDate = DateTime.Now;

        await _unitOfWork.Suppliers.AddAsync(supplier, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Suppliers", supplier.SupplierId.ToString(), null, supplier.CompanyName, cancellationToken);
        return supplier;
    }

    public async Task UpdateAsync(Supplier supplier, CancellationToken cancellationToken = default)
    {
        _unitOfWork.Suppliers.Update(supplier);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "Suppliers", supplier.SupplierId.ToString(), null, supplier.CompanyName, cancellationToken);
    }

    public async Task DeactivateAsync(int supplierId, CancellationToken cancellationToken = default)
    {
        var supplier = await _unitOfWork.Suppliers.GetByIdAsync(supplierId, cancellationToken);
        if (supplier is null) return;

        if (supplier.CurrentBalance != 0 || supplier.CurrentGoldBalance != 0)
            throw new BusinessRuleException("Cannot deactivate a supplier with an outstanding cash or gold balance.");

        supplier.IsActive = false;
        _unitOfWork.Suppliers.Update(supplier);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Delete", "Suppliers", supplierId.ToString(), null, "Deactivated", cancellationToken);
    }
}
