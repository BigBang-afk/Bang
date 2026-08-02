using Microsoft.Extensions.DependencyInjection;
using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Session;
using ZarghoonJewellers.Common.Theming;
using ZarghoonJewellers.Domain.Entities;
using ZarghoonJewellers.Presentation.Forms.AuditLog;
using ZarghoonJewellers.Presentation.Forms.Common;
using ZarghoonJewellers.Presentation.Forms.Customers;
using ZarghoonJewellers.Presentation.Forms.Dashboard;
using ZarghoonJewellers.Presentation.Forms.GoldRate;
using ZarghoonJewellers.Presentation.Forms.Invoices;
using ZarghoonJewellers.Presentation.Forms.Ledgers;
using ZarghoonJewellers.Presentation.Forms.Purchases;
using ZarghoonJewellers.Presentation.Forms.RepairOrders;
using ZarghoonJewellers.Presentation.Forms.Stock;
using ZarghoonJewellers.Presentation.Forms.Suppliers;
using ZarghoonJewellers.Presentation.Forms.UsersRoles;

namespace ZarghoonJewellers.Presentation.Forms.Shell;

/// <summary>
/// Declares every sidebar module in one place: display text, icon, the permission module
/// that gates it, and how to build its content control. Dashboard/Stock/Invoices/Purchases
/// get bespoke UserControls resolved from DI; the simpler master-data screens are built
/// inline here with <see cref="SimpleCrudControl{TEntity}"/> so they don't need a dedicated
/// class each.
/// </summary>
public static class ModuleRegistry
{
    public static List<ModuleDefinition> BuildModules(IServiceProvider sp)
    {
        var session = sp.GetRequiredService<CurrentSession>();

        return new List<ModuleDefinition>
        {
            new()
            {
                Key = "dashboard", DisplayName = "Dashboard", IconLetter = 'D', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "Dashboard", Factory = () => sp.GetRequiredService<UcDashboard>()
            },
            new()
            {
                Key = "customers", DisplayName = "Customers", IconLetter = 'C', IconColor = ThemeColors.Info,
                PermissionModule = "Customers", Factory = () => sp.GetRequiredService<UcCustomers>()
            },
            new()
            {
                Key = "suppliers", DisplayName = "Suppliers", IconLetter = 'S', IconColor = ThemeColors.Warning,
                PermissionModule = "Suppliers", Factory = () => sp.GetRequiredService<UcSuppliers>()
            },
            new()
            {
                Key = "stock", DisplayName = "Stock / Inventory", IconLetter = 'I', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "Stock", Factory = () => sp.GetRequiredService<UcStock>()
            },
            new()
            {
                Key = "invoices", DisplayName = "Invoices / POS", IconLetter = 'N', IconColor = ThemeColors.Success,
                PermissionModule = "Invoices", Factory = () => sp.GetRequiredService<UcInvoices>()
            },
            new()
            {
                Key = "invoicesearch", DisplayName = "Invoice History / Search", IconLetter = 'H', IconColor = ThemeColors.Info,
                PermissionModule = "Invoices", Factory = () => sp.GetRequiredService<UcInvoiceSearch>()
            },
            new()
            {
                Key = "purchases", DisplayName = "Purchases", IconLetter = 'P', IconColor = ThemeColors.Info,
                PermissionModule = "Purchases", Factory = () => sp.GetRequiredService<UcPurchases>()
            },
            new()
            {
                Key = "karigar", DisplayName = "Karigar", IconLetter = 'K', IconColor = ThemeColors.GoldDark,
                PermissionModule = "Karigar", Factory = () => BuildKarigarControl(sp)
            },
            new()
            {
                Key = "employees", DisplayName = "Employees", IconLetter = 'E', IconColor = ThemeColors.Info,
                PermissionModule = "Employees", Factory = () => BuildEmployeeControl(sp)
            },
            new()
            {
                Key = "goldrate", DisplayName = "Daily Gold Rate", IconLetter = 'Z', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "GoldRate", Factory = () => sp.GetRequiredService<UcGoldRate>()
            },
            new()
            {
                Key = "cashledger", DisplayName = "Cash Ledger", IconLetter = '$', IconColor = ThemeColors.Success,
                PermissionModule = "CashLedger", Factory = () => sp.GetRequiredService<UcCashLedger>()
            },
            new()
            {
                Key = "goldledger", DisplayName = "Gold Ledger", IconLetter = 'G', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "GoldLedger", Factory = () => sp.GetRequiredService<UcGoldLedger>()
            },
            new()
            {
                Key = "partyledger", DisplayName = "Customer / Supplier / Karigar Ledger", IconLetter = 'W', IconColor = ThemeColors.Info,
                PermissionModule = "Reports", Factory = () => sp.GetRequiredService<UcPartyLedger>()
            },
            new()
            {
                Key = "customerstatement", DisplayName = "Customer Statement", IconLetter = 'O', IconColor = ThemeColors.Warning,
                PermissionModule = "Reports", Factory = () => sp.GetRequiredService<UcCustomerStatement>()
            },
            new()
            {
                Key = "profitreports", DisplayName = "Profit Reports", IconLetter = 'F', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "Reports", Factory = () => sp.GetRequiredService<UcProfitReports>()
            },
            new()
            {
                Key = "bankaccounts", DisplayName = "Bank Accounts", IconLetter = 'B', IconColor = ThemeColors.Info,
                PermissionModule = "BankAccounts", Factory = () => BuildBankAccountControl(sp)
            },
            new()
            {
                Key = "expenses", DisplayName = "Expenses", IconLetter = 'X', IconColor = ThemeColors.Danger,
                PermissionModule = "Expenses", Factory = () => BuildExpenseControl(sp, session)
            },
            new()
            {
                Key = "income", DisplayName = "Income", IconLetter = '+', IconColor = ThemeColors.Success,
                PermissionModule = "Income", Factory = () => BuildIncomeControl(sp, session)
            },
            new()
            {
                Key = "repairorders", DisplayName = "Repair Orders", IconLetter = 'R', IconColor = ThemeColors.Warning,
                PermissionModule = "RepairOrders", Factory = () => sp.GetRequiredService<UcRepairOrders>()
            },
            new()
            {
                Key = "usdt", DisplayName = "USDT Transactions", IconLetter = 'U', IconColor = ThemeColors.Success,
                PermissionModule = "Usdt", Factory = () => BuildUsdtControl(sp, session)
            },
            new()
            {
                Key = "settings", DisplayName = "Settings", IconLetter = 'T', IconColor = ThemeColors.TextSecondary,
                PermissionModule = "Settings", Factory = () => BuildSettingsControl(sp, session)
            },
            new()
            {
                Key = "usersroles", DisplayName = "Users & Roles", IconLetter = 'A', IconColor = ThemeColors.GoldPrimary,
                PermissionModule = "Users", Factory = () => sp.GetRequiredService<UcUsersRoles>()
            },
            new()
            {
                Key = "auditlog", DisplayName = "Audit Log", IconLetter = 'L', IconColor = ThemeColors.TextSecondary,
                PermissionModule = "AuditLog", Factory = () => sp.GetRequiredService<UcAuditLog>()
            }
        };
    }

    private static Control BuildKarigarControl(IServiceProvider sp)
    {
        var service = sp.GetRequiredService<ICrudService<Karigar>>();
        return new SimpleCrudControl<Karigar>(service, "Karigar",
            new List<GridColumnDescriptor<Karigar>>
            {
                new("Code", k => k.KarigarCode),
                new("Name", k => k.FullName),
                new("Phone", k => k.Phone),
                new("Specialty", k => k.SpecialtyType),
                new("Gold Balance (g)", k => k.CurrentGoldBalance.ToString("N2")),
                new("Active", k => k.IsActive ? "Yes" : "No")
            },
            new List<FieldDescriptor<Karigar>>
            {
                new("Karigar Code", k => k.KarigarCode, (k, v) => k.KarigarCode = v),
                new("Full Name", k => k.FullName, (k, v) => k.FullName = v),
                new("Phone", k => k.Phone ?? string.Empty, (k, v) => k.Phone = v),
                new("Address", k => k.Address ?? string.Empty, (k, v) => k.Address = v),
                new("Specialty", k => k.SpecialtyType ?? string.Empty, (k, v) => k.SpecialtyType = v)
            },
            canDelete: k => k.CurrentGoldBalance == 0);
    }

    private static Control BuildEmployeeControl(IServiceProvider sp)
    {
        var service = sp.GetRequiredService<ICrudService<Employee>>();
        return new SimpleCrudControl<Employee>(service, "Employees",
            new List<GridColumnDescriptor<Employee>>
            {
                new("Code", e => e.EmployeeCode),
                new("Name", e => e.FullName),
                new("Designation", e => e.Designation),
                new("Phone", e => e.Phone),
                new("Salary", e => e.Salary.ToString("N0"))
            },
            new List<FieldDescriptor<Employee>>
            {
                new("Employee Code", e => e.EmployeeCode, (e, v) => e.EmployeeCode = v),
                new("Full Name", e => e.FullName, (e, v) => e.FullName = v),
                new("Designation", e => e.Designation ?? string.Empty, (e, v) => e.Designation = v),
                new("Phone", e => e.Phone ?? string.Empty, (e, v) => e.Phone = v),
                new("Salary", e => e.Salary.ToString("0.00"), (e, v) => e.Salary = decimal.TryParse(v, out var d) ? d : 0)
            });
    }

    private static Control BuildBankAccountControl(IServiceProvider sp)
    {
        var service = sp.GetRequiredService<ICrudService<BankAccount>>();
        return new SimpleCrudControl<BankAccount>(service, "Bank Accounts",
            new List<GridColumnDescriptor<BankAccount>>
            {
                new("Bank", b => b.BankName),
                new("Account Title", b => b.AccountTitle),
                new("Account #", b => b.AccountNumber),
                new("Balance", b => b.CurrentBalance.ToString("N0"))
            },
            new List<FieldDescriptor<BankAccount>>
            {
                new("Bank Name", b => b.BankName, (b, v) => b.BankName = v),
                new("Account Title", b => b.AccountTitle, (b, v) => b.AccountTitle = v),
                new("Account Number", b => b.AccountNumber, (b, v) => b.AccountNumber = v),
                new("Branch", b => b.Branch ?? string.Empty, (b, v) => b.Branch = v),
                new("Opening Balance", b => b.OpeningBalance.ToString("0.00"),
                    (b, v) => { b.OpeningBalance = decimal.TryParse(v, out var d) ? d : 0; b.CurrentBalance = b.OpeningBalance; })
            });
    }

    private static Control BuildExpenseControl(IServiceProvider sp, CurrentSession session)
    {
        var service = sp.GetRequiredService<ICrudService<Expense>>();
        return new SimpleCrudControl<Expense>(
            loadAll: () => service.GetAllAsync(),
            create: e => { e.CreatedBy = session.UserId; e.CreatedDate = DateTime.Now; return service.CreateAsync(e); },
            update: e => service.UpdateAsync(e),
            delete: e => service.DeleteAsync(e),
            title: "Expenses",
            columns: new List<GridColumnDescriptor<Expense>>
            {
                new("Date", e => e.ExpenseDate.ToString("d")),
                new("Category", e => e.ExpenseCategory),
                new("Description", e => e.Description),
                new("Amount", e => e.Amount.ToString("N0"))
            },
            editFields: new List<FieldDescriptor<Expense>>
            {
                new("Category", e => e.ExpenseCategory, (e, v) => e.ExpenseCategory = v),
                new("Description", e => e.Description ?? string.Empty, (e, v) => e.Description = v),
                new("Amount", e => e.Amount.ToString("0.00"), (e, v) => e.Amount = decimal.TryParse(v, out var d) ? d : 0),
                new("Payment Mode (Cash/Bank/Cheque)", e => e.PaymentMode, (e, v) => e.PaymentMode = string.IsNullOrWhiteSpace(v) ? "Cash" : v)
            });
    }

    private static Control BuildIncomeControl(IServiceProvider sp, CurrentSession session)
    {
        var service = sp.GetRequiredService<ICrudService<Income>>();
        return new SimpleCrudControl<Income>(
            loadAll: () => service.GetAllAsync(),
            create: i => { i.CreatedBy = session.UserId; i.CreatedDate = DateTime.Now; return service.CreateAsync(i); },
            update: i => service.UpdateAsync(i),
            delete: i => service.DeleteAsync(i),
            title: "Income",
            columns: new List<GridColumnDescriptor<Income>>
            {
                new("Date", i => i.IncomeDate.ToString("d")),
                new("Category", i => i.IncomeCategory),
                new("Description", i => i.Description),
                new("Amount", i => i.Amount.ToString("N0"))
            },
            editFields: new List<FieldDescriptor<Income>>
            {
                new("Category", i => i.IncomeCategory, (i, v) => i.IncomeCategory = v),
                new("Description", i => i.Description ?? string.Empty, (i, v) => i.Description = v),
                new("Amount", i => i.Amount.ToString("0.00"), (i, v) => i.Amount = decimal.TryParse(v, out var d) ? d : 0),
                new("Payment Mode (Cash/Bank/Cheque)", i => i.PaymentMode, (i, v) => i.PaymentMode = string.IsNullOrWhiteSpace(v) ? "Cash" : v)
            });
    }

    private static Control BuildUsdtControl(IServiceProvider sp, CurrentSession session)
    {
        var service = sp.GetRequiredService<ICrudService<UsdtTransaction>>();
        return new SimpleCrudControl<UsdtTransaction>(
            loadAll: () => service.GetAllAsync(),
            create: u => { u.CreatedBy = session.UserId; u.CreatedDate = DateTime.Now; return service.CreateAsync(u); },
            update: u => service.UpdateAsync(u),
            delete: u => service.DeleteAsync(u),
            title: "USDT Transactions",
            columns: new List<GridColumnDescriptor<UsdtTransaction>>
            {
                new("Date", u => u.TransactionDate.ToString("g")),
                new("Type", u => u.TransactionType),
                new("Amount (USDT)", u => u.AmountUsdt.ToString("N2")),
                new("Rate (PKR)", u => u.RateInPkr.ToString("N2")),
                new("Total (PKR)", u => u.TotalPkr.ToString("N0"))
            },
            editFields: new List<FieldDescriptor<UsdtTransaction>>
            {
                new("Type (Buy/Sell)", u => u.TransactionType, (u, v) => u.TransactionType = v),
                new("Amount (USDT)", u => u.AmountUsdt.ToString("0.000000"), (u, v) => u.AmountUsdt = decimal.TryParse(v, out var d) ? d : 0),
                new("Rate (PKR per USDT)", u => u.RateInPkr.ToString("0.0000"), (u, v) => u.RateInPkr = decimal.TryParse(v, out var d) ? d : 0),
                new("Wallet Address", u => u.WalletAddress ?? string.Empty, (u, v) => u.WalletAddress = v),
                new("Note", u => u.ReferenceNote ?? string.Empty, (u, v) => u.ReferenceNote = v)
            });
    }

    private static Control BuildSettingsControl(IServiceProvider sp, CurrentSession session)
    {
        var service = sp.GetRequiredService<ICrudService<Setting>>();
        return new SimpleCrudControl<Setting>(
            loadAll: () => service.GetAllAsync(),
            create: s => { s.ModifiedBy = session.UserId; s.ModifiedDate = DateTime.Now; return service.CreateAsync(s); },
            update: s => { s.ModifiedBy = session.UserId; s.ModifiedDate = DateTime.Now; return service.UpdateAsync(s); },
            delete: s => service.DeleteAsync(s),
            title: "Settings",
            columns: new List<GridColumnDescriptor<Setting>>
            {
                new("Key", s => s.SettingKey),
                new("Value", s => s.SettingValue),
                new("Description", s => s.Description)
            },
            editFields: new List<FieldDescriptor<Setting>>
            {
                new("Setting Key", s => s.SettingKey, (s, v) => s.SettingKey = v),
                new("Value", s => s.SettingValue ?? string.Empty, (s, v) => s.SettingValue = v),
                new("Description", s => s.Description ?? string.Empty, (s, v) => s.Description = v)
            });
    }
}
