using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class CustomerService : ICustomerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public CustomerService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<Customer>> GetAllAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.Customers.GetAllAsync(cancellationToken);

    public Task<Customer?> GetByIdAsync(int customerId, CancellationToken cancellationToken = default)
        => _unitOfWork.Customers.GetByIdAsync(customerId, cancellationToken);

    public Task<IReadOnlyList<Customer>> SearchAsync(string searchTerm, CancellationToken cancellationToken = default)
        => _unitOfWork.Customers.SearchAsync(searchTerm, cancellationToken);

    public async Task<Customer> CreateAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        customer.CustomerCode = await _unitOfWork.Customers.GenerateNextCustomerCodeAsync(cancellationToken);
        customer.CurrentBalance = customer.OpeningBalance;
        customer.CreatedDate = DateTime.Now;

        await _unitOfWork.Customers.AddAsync(customer, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Insert", "Customers", customer.CustomerId.ToString(), null, customer.FullName, cancellationToken);
        return customer;
    }

    public async Task UpdateAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        _unitOfWork.Customers.Update(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "Customers", customer.CustomerId.ToString(), null, customer.FullName, cancellationToken);
    }

    public async Task DeactivateAsync(int customerId, CancellationToken cancellationToken = default)
    {
        var customer = await _unitOfWork.Customers.GetByIdAsync(customerId, cancellationToken);
        if (customer is null) return;

        if (customer.CurrentBalance != 0 || customer.CurrentGoldBalance != 0)
            throw new BusinessRuleException("Cannot deactivate a customer with an outstanding cash or gold balance.");

        customer.IsActive = false;
        _unitOfWork.Customers.Update(customer);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Delete", "Customers", customerId.ToString(), null, "Deactivated", cancellationToken);
    }
}
