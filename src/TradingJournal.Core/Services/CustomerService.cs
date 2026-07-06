using Microsoft.EntityFrameworkCore;
using TradingJournal.Core.Data;
using TradingJournal.Core.Models;

namespace TradingJournal.Core.Services;

public class CustomerService : ICustomerService
{
    private readonly JournalDbContext _db;

    public CustomerService(JournalDbContext db)
    {
        _db = db;
    }

    public async Task<List<Customer>> GetAllAsync()
    {
        return await _db.Customers.OrderBy(c => c.Name).ToListAsync();
    }

    public async Task<Customer> AddAsync(string name, string? phone, string? notes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Customer name is required.", nameof(name));

        var customer = new Customer
        {
            Name = name.Trim(),
            Phone = phone?.Trim(),
            Notes = notes?.Trim()
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return customer;
    }

    public async Task DeleteAsync(int customerId)
    {
        var customer = await _db.Customers.FindAsync(customerId);
        if (customer is not null)
        {
            _db.Customers.Remove(customer);
            await _db.SaveChangesAsync();
        }
    }
}
