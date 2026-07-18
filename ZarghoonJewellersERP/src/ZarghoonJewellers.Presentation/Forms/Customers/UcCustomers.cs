using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Customers;

/// <summary>Customer master-data screen. Wraps <see cref="SimpleCrudControl{TEntity}"/> but routes
/// create/update/delete through <see cref="ICustomerService"/> so customer codes are generated
/// server-side and balances/audit entries stay consistent with the rest of the app.</summary>
public class UcCustomers : SimpleCrudControl<Customer>
{
    public UcCustomers(ICustomerService customerService) : base(
        loadAll: () => customerService.GetAllAsync(),
        create: c => customerService.CreateAsync(c),
        update: c => customerService.UpdateAsync(c),
        delete: c => customerService.DeactivateAsync(c.CustomerId),
        title: "Customers",
        columns: new List<GridColumnDescriptor<Customer>>
        {
            new("Code", c => c.CustomerCode),
            new("Name", c => c.FullName),
            new("Phone", c => c.Phone),
            new("City", c => c.City),
            new("Type", c => c.CustomerType),
            new("Balance", c => c.CurrentBalance.ToString("N0")),
            new("Gold Balance (g)", c => c.CurrentGoldBalance.ToString("N2"))
        },
        editFields: new List<FieldDescriptor<Customer>>
        {
            new("Full Name", c => c.FullName, (c, v) => c.FullName = v),
            new("Phone", c => c.Phone ?? string.Empty, (c, v) => c.Phone = v),
            new("Email", c => c.Email ?? string.Empty, (c, v) => c.Email = v),
            new("Address", c => c.Address ?? string.Empty, (c, v) => c.Address = v),
            new("City", c => c.City ?? string.Empty, (c, v) => c.City = v),
            new("CNIC", c => c.CNIC ?? string.Empty, (c, v) => c.CNIC = v),
            new("Customer Type (Retail/Wholesale/VIP)", c => c.CustomerType, (c, v) => c.CustomerType = string.IsNullOrWhiteSpace(v) ? "Retail" : v),
            new("Opening Balance", c => c.OpeningBalance.ToString("0.00"), (c, v) => c.OpeningBalance = decimal.TryParse(v, out var d) ? d : 0),
            new("Credit Limit", c => c.CreditLimit.ToString("0.00"), (c, v) => c.CreditLimit = decimal.TryParse(v, out var d) ? d : 0)
        },
        canDelete: c => c.CurrentBalance == 0 && c.CurrentGoldBalance == 0)
    {
    }
}
