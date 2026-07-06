using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public interface ICustomerService
{
    Task<List<Customer>> GetAllAsync();
    Task<Customer> AddAsync(string name, string? phone, string? notes);
    Task DeleteAsync(int customerId);
}
