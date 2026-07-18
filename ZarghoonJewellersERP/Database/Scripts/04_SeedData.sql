/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 04_SeedData.sql
   Purpose: Seeds baseline reference data so the application is usable on
            first run: roles, permissions, an administrator login, stock
            categories, a cash account, shop settings and today's gold rate.

   Default login created by this script:
       Username : admin
       Password : Admin@123     (change immediately after first login -
                                  MustChangePassword is set to 1 below)
   ========================================================================= */

USE ZarghoonJewellersDB;
GO

/* ---------------------------------------------------------------- Roles */
INSERT INTO erp.Roles (RoleName, Description, IsSystemRole) VALUES
    ('Administrator', 'Full system access', 1),
    ('Manager',        'Store manager - sales, purchase & reports', 0),
    ('Salesman',       'Point of sale / invoicing only', 0),
    ('Accountant',     'Ledgers, expenses, income & reports', 0),
    ('KarigarSupervisor', 'Manages repair orders and karigar workflow', 0);
GO

/* ---------------------------------------------------------- Permissions
   One row per module - RolePermissions grants the CRUD verbs per role. */
INSERT INTO erp.Permissions (PermissionName, ModuleName, Description) VALUES
    ('Dashboard.View',      'Dashboard',    'View dashboard'),
    ('Customers.Manage',    'Customers',    'Manage customers'),
    ('Suppliers.Manage',    'Suppliers',    'Manage suppliers'),
    ('Karigar.Manage',      'Karigar',      'Manage karigars'),
    ('Employees.Manage',    'Employees',    'Manage employees'),
    ('Stock.Manage',        'Stock',        'Manage stock/inventory'),
    ('Invoices.Manage',     'Invoices',     'Create & manage sales invoices'),
    ('Purchases.Manage',    'Purchases',    'Create & manage purchases'),
    ('CashLedger.Manage',   'CashLedger',   'View & post cash ledger entries'),
    ('GoldLedger.Manage',   'GoldLedger',   'View & post gold ledger entries'),
    ('BankAccounts.Manage', 'BankAccounts', 'Manage bank accounts'),
    ('Expenses.Manage',     'Expenses',     'Manage expenses'),
    ('Income.Manage',       'Income',       'Manage income'),
    ('RepairOrders.Manage', 'RepairOrders', 'Manage repair orders'),
    ('GoldRate.Manage',     'GoldRate',     'Update daily gold rate'),
    ('UsdtTransactions.Manage', 'Usdt',     'Manage USDT transactions'),
    ('Reports.View',        'Reports',      'View reports'),
    ('Settings.Manage',     'Settings',     'Manage application settings'),
    ('Users.Manage',        'Users',        'Manage users, roles & permissions'),
    ('AuditLog.View',       'AuditLog',     'View audit trail');
GO

-- Administrator: full access to every permission
INSERT INTO erp.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete, CanPrint)
SELECT r.RoleId, p.PermissionId, 1, 1, 1, 1, 1
FROM erp.Roles r CROSS JOIN erp.Permissions p
WHERE r.RoleName = 'Administrator';

-- Salesman: dashboard, customers, invoices, stock (view), repair orders
INSERT INTO erp.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete, CanPrint)
SELECT r.RoleId, p.PermissionId,
       1,
       CASE WHEN p.ModuleName IN ('Invoices','Customers','RepairOrders') THEN 1 ELSE 0 END,
       CASE WHEN p.ModuleName IN ('Invoices','Customers','RepairOrders') THEN 1 ELSE 0 END,
       0,
       CASE WHEN p.ModuleName = 'Invoices' THEN 1 ELSE 0 END
FROM erp.Roles r CROSS JOIN erp.Permissions p
WHERE r.RoleName = 'Salesman'
  AND p.ModuleName IN ('Dashboard','Customers','Invoices','Stock','RepairOrders');

-- Accountant: ledgers, expenses, income, reports, gold rate, bank accounts
INSERT INTO erp.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete, CanPrint)
SELECT r.RoleId, p.PermissionId, 1, 1, 1, 0, 1
FROM erp.Roles r CROSS JOIN erp.Permissions p
WHERE r.RoleName = 'Accountant'
  AND p.ModuleName IN ('Dashboard','CashLedger','GoldLedger','BankAccounts','Expenses','Income','Reports','GoldRate','Usdt');

-- Manager: everything except Users/Settings administration
INSERT INTO erp.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete, CanPrint)
SELECT r.RoleId, p.PermissionId, 1, 1, 1, 1, 1
FROM erp.Roles r CROSS JOIN erp.Permissions p
WHERE r.RoleName = 'Manager'
  AND p.ModuleName NOT IN ('Users','Settings');

-- KarigarSupervisor: karigar + repair orders + gold ledger (view)
INSERT INTO erp.RolePermissions (RoleId, PermissionId, CanView, CanAdd, CanEdit, CanDelete, CanPrint)
SELECT r.RoleId, p.PermissionId,
       1,
       CASE WHEN p.ModuleName IN ('RepairOrders','Karigar') THEN 1 ELSE 0 END,
       CASE WHEN p.ModuleName IN ('RepairOrders','Karigar') THEN 1 ELSE 0 END,
       0, 1
FROM erp.Roles r CROSS JOIN erp.Permissions p
WHERE r.RoleName = 'KarigarSupervisor'
  AND p.ModuleName IN ('Dashboard','Karigar','RepairOrders','GoldLedger');
GO

/* ------------------------------------------------------------- Users
   Password: Admin@123
   Hash algorithm: PBKDF2-HMAC-SHA256, 100000 iterations, 32-byte derived key
   (see ZarghoonJewellers.Common.Security.PasswordHasher for the matching
   verification code). */
INSERT INTO erp.Users (Username, PasswordHash, PasswordSalt, PasswordIterations, FullName, Email, RoleId, IsActive, MustChangePassword)
SELECT 'admin',
       0xCE25578F59355C4ABFBD1E06CC03D948292927A56381C9C575FF502D2FFA3F07,
       0x8F4C2A913D7E5B60112C9AEE441F8302,
       100000,
       'System Administrator',
       'admin@zarghoonjewellers.local',
       r.RoleId,
       1,
       1
FROM erp.Roles r WHERE r.RoleName = 'Administrator';
GO

/* ------------------------------------------------------- Stock Categories */
INSERT INTO erp.StockCategories (CategoryName, Description) VALUES
    ('Rings',            'Gold & diamond rings'),
    ('Necklaces',        'Necklace sets'),
    ('Bangles',          'Gold bangles & kadas'),
    ('Earrings',         'Tops, jhumkas, studs'),
    ('Chains',           'Gold chains'),
    ('Bracelets',        'Bracelets & bands'),
    ('Sets',             'Complete jewellery sets'),
    ('Coins & Bars',     'Investment gold coins and bars'),
    ('Pendants',         'Pendants & lockets');
GO

/* -------------------------------------------------------------- Accounts */
INSERT INTO erp.BankAccounts (BankName, AccountTitle, AccountNumber, Branch, OpeningBalance, CurrentBalance) VALUES
    ('Meezan Bank', 'Zarghoon Jewellers', '0000-0000-000001', 'Main Branch', 0, 0);
GO

/* ---------------------------------------------------------------- Settings */
INSERT INTO erp.Settings (SettingKey, SettingValue, Description) VALUES
    ('ShopName',            'Zarghoon Jewellers',  'Displayed on invoices, reports and the login screen'),
    ('ShopAddress',         '',                     'Shop address printed on invoices'),
    ('ShopPhone',           '',                     'Shop contact number'),
    ('InvoicePrefix',       'INV-',                 'Prefix used when generating invoice numbers'),
    ('PurchasePrefix',      'PUR-',                 'Prefix used when generating purchase numbers'),
    ('RepairOrderPrefix',   'RO-',                  'Prefix used when generating repair order numbers'),
    ('DefaultGoldPurity',   '22K',                  'Default purity pre-selected on new stock items'),
    ('CurrencySymbol',      'PKR',                  'Currency symbol used across the application'),
    ('LowStockThresholdPct','10',                    'Percent of MinimumStockLevel used to flag near-low stock'),
    ('FiscalYearStartMonth','7',                     'Month (1-12) the fiscal year begins'),
    ('ThemeMode',           'DarkGold',              'Active UI theme');
GO

/* -------------------------------------------------------- Daily Gold Rate
   Seeded with a representative rate for day one; the GoldRate module lets
   staff update this every trading day. */
INSERT INTO erp.DailyGoldRates (RateDate, Rate24K, Rate22K, Rate21K, Rate18K, UsdPerOunce, UsdToPkr, EnteredBy)
SELECT CAST(SYSDATETIME() AS DATE), 27500.00, 25208.00, 24063.00, 20625.00, 2400.00, 278.50, u.UserId
FROM erp.Users u WHERE u.Username = 'admin';
GO
