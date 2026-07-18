# Zarghoon Jewellers ERP

A commercial-grade Windows Desktop jewelry management system built with .NET 8 WinForms,
Entity Framework Core, SQL Server, and a Repository/Unit-of-Work + Clean Architecture layout.

## Architecture

```
ZarghoonJewellersERP.sln
├── Database/Scripts/                    Hand-authored T-SQL (schema, indexes, seed data)
└── src/
    ├── ZarghoonJewellers.Domain/        POCO entities, zero dependencies
    ├── ZarghoonJewellers.DataAccess/    EF Core DbContext, Fluent configs, Repository + UnitOfWork
    ├── ZarghoonJewellers.Business/      Services (business rules), DTOs
    ├── ZarghoonJewellers.Common/        Cross-cutting: security, theming, helpers, exceptions
    └── ZarghoonJewellers.Presentation/  WinForms UI (Guna.UI2, Dark Luxury Gold theme)
```

Dependency direction: `Presentation -> Business -> DataAccess -> Domain`, with `Common`
referenced by every layer above `Domain`. The composition root (`Program.cs`) is the only
place that wires all five projects together via dependency injection.

## Prerequisites

- Visual Studio 2022 (17.8+) with the **.NET desktop development** workload
- .NET 8 SDK
- SQL Server Express (or any SQL Server edition) - LocalDB also works if you adjust the connection string

## Database setup

Run the scripts in `Database/Scripts/` **in order** against your SQL Server instance
(e.g. via SSMS or `sqlcmd`):

1. `01_CreateDatabase.sql` - creates `ZarghoonJewellersDB` and the `erp` schema
2. `02_CreateTables.sql` - all 26 normalized tables with PK/FK/CHECK constraints
3. `03_Indexes.sql` - supporting indexes for the dashboard and common lookups
4. `04_SeedData.sql` - roles, permissions, the default admin login, stock categories,
   a default bank account, application settings, and today's gold rate

```powershell
sqlcmd -S .\SQLEXPRESS -i Database\Scripts\01_CreateDatabase.sql
sqlcmd -S .\SQLEXPRESS -i Database\Scripts\02_CreateTables.sql
sqlcmd -S .\SQLEXPRESS -i Database\Scripts\03_Indexes.sql
sqlcmd -S .\SQLEXPRESS -i Database\Scripts\04_SeedData.sql
```

### Default login

| Username | Password    |
|----------|-------------|
| `admin`  | `Admin@123` |

The account is flagged `MustChangePassword`, so change it immediately after first sign-in
(Users & Roles module -> Reset Password, or wire up a forced change-password prompt).

## Running the app

1. Open `ZarghoonJewellersERP.sln` in Visual Studio 2022.
2. Update the connection string in `src/ZarghoonJewellers.Presentation/appsettings.json`
   if your SQL Server instance name differs from `.\SQLEXPRESS`.
3. Set `ZarghoonJewellers.Presentation` as the startup project.
4. Build (NuGet will restore Guna.UI2.WinForms, EF Core, ZXing.Net, WinForms.DataVisualization, etc.).
5. Run. You'll land on the dark-gold login screen, then the dashboard shell.

## What's implemented

- **Database**: 26 normalized tables covering Customers, Suppliers, Karigar, Employees,
  Stock/Barcodes/Images, Invoices/Purchases (+ detail lines), Cash/Gold ledgers, Bank
  Accounts, Expenses/Income, Repair Orders, Settings, Users/Roles/Permissions, Audit Logs,
  Daily Gold Rates and USDT Transactions.
- **Data access**: generic `IGenericRepository<T>` + entity-specific repositories (Customer,
  Supplier, Stock, Invoice, Purchase, User, CashLedger, GoldLedger, RepairOrder, AuditLog,
  DailyGoldRate) behind a single `IUnitOfWork`, EF Core Fluent API configurations per entity.
- **Business layer**: Auth (PBKDF2 password hashing, permission-aware sessions), Dashboard
  aggregation, Customer/Supplier/Stock CRUD with code generation, transactional Invoice and
  Purchase checkout (stock movement + balance + ledger posting in one DB transaction), Gold
  Rate, Cash Ledger, Gold Ledger, Repair Orders, User management, and a generic CRUD service
  for simpler lookup entities.
- **Presentation**: animated dark-gold login, a shell with animated sidebar navigation and
  a top ribbon (live gold/USD ticker, signed-in user, window controls), a dashboard with 14
  stat cards + a profit trend chart + three live data grids, full POS-style invoice entry,
  purchase entry (restock or new item), and management screens for every remaining module.

## Notable design decisions

- **PBKDF2 over BCrypt**: password hashing uses `Rfc2898DeriveBytes.Pbkdf2` from the .NET
  BCL instead of a third-party crypto package, keeping the security-critical path dependency-free.
- **Barcodes via ZXing.Net**: rather than hand-rolling a Code128/QR encoder (real risk of an
  unverified bit table producing tags that don't scan), `BarcodeHelper` wraps the
  battle-tested ZXing.Net library.
- **Metadata-driven CRUD**: `SimpleCrudControl<TEntity>` + `SimpleEditForm<TEntity>` provide
  one reusable list/edit screen shell (used for Karigar, Employees, Bank Accounts, Expenses,
  Income, Settings, USDT Transactions, Customers, Suppliers) instead of hand-building a
  near-identical WinForms screen per lookup entity.
- **Gold ledger sign convention**: `CurrentGoldBalance` on Customer/Supplier/Karigar is
  positive when the shop owes the entity gold, negative when the entity owes the shop -
  documented on each entity and enforced centrally in `GoldLedgerService`.
