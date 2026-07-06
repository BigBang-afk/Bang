-- GeneralStorePro database schema
-- Idempotent: safe to run on every application startup.

CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    FullName TEXT NOT NULL,
    Role TEXT NOT NULL DEFAULT 'Cashier' CHECK (Role IN ('Admin', 'Manager', 'Cashier')),
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    LastLoginAt TEXT
);

CREATE TABLE IF NOT EXISTS Categories (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL UNIQUE,
    Description TEXT,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS Products (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    SKU TEXT UNIQUE,
    Barcode TEXT UNIQUE,
    CategoryId INTEGER REFERENCES Categories (Id) ON DELETE SET NULL,
    Unit TEXT NOT NULL DEFAULT 'pcs',
    PurchasePrice REAL NOT NULL DEFAULT 0,
    SalePrice REAL NOT NULL DEFAULT 0,
    StockQuantity REAL NOT NULL DEFAULT 0,
    ReorderLevel REAL NOT NULL DEFAULT 0,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS Customers (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Phone TEXT,
    Address TEXT,
    CreditLimit REAL NOT NULL DEFAULT 0,
    OpeningBalance REAL NOT NULL DEFAULT 0,
    CurrentBalance REAL NOT NULL DEFAULT 0,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS Suppliers (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Phone TEXT,
    Address TEXT,
    OpeningBalance REAL NOT NULL DEFAULT 0,
    CurrentBalance REAL NOT NULL DEFAULT 0,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS Sales (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    InvoiceNumber TEXT NOT NULL UNIQUE,
    CustomerId INTEGER REFERENCES Customers (Id) ON DELETE SET NULL,
    UserId INTEGER NOT NULL REFERENCES Users (Id) ON DELETE RESTRICT,
    SaleDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    SubTotal REAL NOT NULL DEFAULT 0,
    DiscountAmount REAL NOT NULL DEFAULT 0,
    TaxAmount REAL NOT NULL DEFAULT 0,
    TotalAmount REAL NOT NULL DEFAULT 0,
    PaidAmount REAL NOT NULL DEFAULT 0,
    DueAmount REAL NOT NULL DEFAULT 0,
    PaymentMethod TEXT NOT NULL DEFAULT 'Cash' CHECK (PaymentMethod IN ('Cash', 'Card', 'Credit', 'Mixed')),
    Status TEXT NOT NULL DEFAULT 'Completed' CHECK (Status IN ('Completed', 'Cancelled', 'Returned')),
    Notes TEXT
);

CREATE TABLE IF NOT EXISTS SaleItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SaleId INTEGER NOT NULL REFERENCES Sales (Id) ON DELETE CASCADE,
    ProductId INTEGER NOT NULL REFERENCES Products (Id) ON DELETE RESTRICT,
    Quantity REAL NOT NULL,
    UnitPrice REAL NOT NULL,
    DiscountAmount REAL NOT NULL DEFAULT 0,
    TotalPrice REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS Purchases (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PurchaseNumber TEXT NOT NULL UNIQUE,
    SupplierId INTEGER NOT NULL REFERENCES Suppliers (Id) ON DELETE RESTRICT,
    UserId INTEGER NOT NULL REFERENCES Users (Id) ON DELETE RESTRICT,
    PurchaseDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    SubTotal REAL NOT NULL DEFAULT 0,
    DiscountAmount REAL NOT NULL DEFAULT 0,
    TaxAmount REAL NOT NULL DEFAULT 0,
    TotalAmount REAL NOT NULL DEFAULT 0,
    PaidAmount REAL NOT NULL DEFAULT 0,
    DueAmount REAL NOT NULL DEFAULT 0,
    Status TEXT NOT NULL DEFAULT 'Completed' CHECK (Status IN ('Completed', 'Cancelled', 'Returned')),
    Notes TEXT
);

CREATE TABLE IF NOT EXISTS PurchaseItems (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PurchaseId INTEGER NOT NULL REFERENCES Purchases (Id) ON DELETE CASCADE,
    ProductId INTEGER NOT NULL REFERENCES Products (Id) ON DELETE RESTRICT,
    Quantity REAL NOT NULL,
    UnitCost REAL NOT NULL,
    TotalCost REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS CustomerPayments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerId INTEGER NOT NULL REFERENCES Customers (Id) ON DELETE CASCADE,
    SaleId INTEGER REFERENCES Sales (Id) ON DELETE SET NULL,
    Amount REAL NOT NULL,
    PaymentMethod TEXT NOT NULL DEFAULT 'Cash' CHECK (PaymentMethod IN ('Cash', 'Card', 'BankTransfer', 'Other')),
    PaymentDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UserId INTEGER REFERENCES Users (Id) ON DELETE SET NULL,
    Notes TEXT
);

CREATE TABLE IF NOT EXISTS SupplierPayments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SupplierId INTEGER NOT NULL REFERENCES Suppliers (Id) ON DELETE CASCADE,
    PurchaseId INTEGER REFERENCES Purchases (Id) ON DELETE SET NULL,
    Amount REAL NOT NULL,
    PaymentMethod TEXT NOT NULL DEFAULT 'Cash' CHECK (PaymentMethod IN ('Cash', 'Card', 'BankTransfer', 'Other')),
    PaymentDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UserId INTEGER REFERENCES Users (Id) ON DELETE SET NULL,
    Notes TEXT
);

CREATE TABLE IF NOT EXISTS Expenses (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Category TEXT NOT NULL,
    Description TEXT,
    Amount REAL NOT NULL,
    ExpenseDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    PaymentMethod TEXT NOT NULL DEFAULT 'Cash' CHECK (PaymentMethod IN ('Cash', 'Card', 'BankTransfer', 'Other')),
    UserId INTEGER REFERENCES Users (Id) ON DELETE SET NULL,
    Notes TEXT
);

CREATE TABLE IF NOT EXISTS CashBook (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TransactionDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    TransactionType TEXT NOT NULL CHECK (TransactionType IN ('In', 'Out')),
    Category TEXT NOT NULL,
    ReferenceType TEXT,
    ReferenceId INTEGER,
    Amount REAL NOT NULL,
    Description TEXT,
    Balance REAL NOT NULL DEFAULT 0,
    UserId INTEGER REFERENCES Users (Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Returns (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ReturnType TEXT NOT NULL CHECK (ReturnType IN ('Sale', 'Purchase')),
    ReferenceId INTEGER NOT NULL,
    ProductId INTEGER NOT NULL REFERENCES Products (Id) ON DELETE RESTRICT,
    Quantity REAL NOT NULL,
    UnitPrice REAL NOT NULL,
    TotalAmount REAL NOT NULL,
    ReturnDate TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    Reason TEXT,
    UserId INTEGER REFERENCES Users (Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Settings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SettingKey TEXT NOT NULL UNIQUE,
    SettingValue TEXT
);

-- Indexes to keep lookups and reports fast as data grows.
CREATE INDEX IF NOT EXISTS IX_Products_CategoryId ON Products (CategoryId);
CREATE INDEX IF NOT EXISTS IX_Products_SKU ON Products (SKU);
CREATE INDEX IF NOT EXISTS IX_Products_Barcode ON Products (Barcode);

CREATE INDEX IF NOT EXISTS IX_Sales_CustomerId ON Sales (CustomerId);
CREATE INDEX IF NOT EXISTS IX_Sales_UserId ON Sales (UserId);
CREATE INDEX IF NOT EXISTS IX_Sales_SaleDate ON Sales (SaleDate);

CREATE INDEX IF NOT EXISTS IX_SaleItems_SaleId ON SaleItems (SaleId);
CREATE INDEX IF NOT EXISTS IX_SaleItems_ProductId ON SaleItems (ProductId);

CREATE INDEX IF NOT EXISTS IX_Purchases_SupplierId ON Purchases (SupplierId);
CREATE INDEX IF NOT EXISTS IX_Purchases_PurchaseDate ON Purchases (PurchaseDate);

CREATE INDEX IF NOT EXISTS IX_PurchaseItems_PurchaseId ON PurchaseItems (PurchaseId);
CREATE INDEX IF NOT EXISTS IX_PurchaseItems_ProductId ON PurchaseItems (ProductId);

CREATE INDEX IF NOT EXISTS IX_CustomerPayments_CustomerId ON CustomerPayments (CustomerId);
CREATE INDEX IF NOT EXISTS IX_SupplierPayments_SupplierId ON SupplierPayments (SupplierId);

CREATE INDEX IF NOT EXISTS IX_Expenses_ExpenseDate ON Expenses (ExpenseDate);
CREATE INDEX IF NOT EXISTS IX_CashBook_TransactionDate ON CashBook (TransactionDate);
CREATE INDEX IF NOT EXISTS IX_Returns_ReferenceId ON Returns (ReferenceId);
