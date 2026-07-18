using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.Common;

namespace ZarghoonJewellers.Presentation.Forms.Suppliers;

/// <summary>Supplier master-data screen, routed through <see cref="ISupplierService"/> for
/// code generation and balance/audit consistency - same shell pattern as <see cref="Customers.UcCustomers"/>.</summary>
public class UcSuppliers : SimpleCrudControl<Supplier>
{
    public UcSuppliers(ISupplierService supplierService) : base(
        loadAll: () => supplierService.GetAllAsync(),
        create: s => supplierService.CreateAsync(s),
        update: s => supplierService.UpdateAsync(s),
        delete: s => supplierService.DeactivateAsync(s.SupplierId),
        title: "Suppliers",
        columns: new List<GridColumnDescriptor<Supplier>>
        {
            new("Code", s => s.SupplierCode),
            new("Company", s => s.CompanyName),
            new("Contact", s => s.ContactPerson),
            new("Phone", s => s.Phone),
            new("Balance", s => s.CurrentBalance.ToString("N0")),
            new("Gold Balance (g)", s => s.CurrentGoldBalance.ToString("N2"))
        },
        editFields: new List<FieldDescriptor<Supplier>>
        {
            new("Company Name", s => s.CompanyName, (s, v) => s.CompanyName = v),
            new("Contact Person", s => s.ContactPerson ?? string.Empty, (s, v) => s.ContactPerson = v),
            new("Phone", s => s.Phone ?? string.Empty, (s, v) => s.Phone = v),
            new("Email", s => s.Email ?? string.Empty, (s, v) => s.Email = v),
            new("Address", s => s.Address ?? string.Empty, (s, v) => s.Address = v),
            new("City", s => s.City ?? string.Empty, (s, v) => s.City = v),
            new("Opening Balance", s => s.OpeningBalance.ToString("0.00"), (s, v) => s.OpeningBalance = decimal.TryParse(v, out var d) ? d : 0)
        },
        canDelete: s => s.CurrentBalance == 0 && s.CurrentGoldBalance == 0)
    {
    }
}
