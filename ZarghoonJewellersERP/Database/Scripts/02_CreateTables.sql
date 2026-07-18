/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 02_CreateTables.sql
   Purpose: Creates all normalized tables (3NF) for the ERP with primary
            keys, foreign keys, check constraints and sane defaults.
   Order  : Tables are created in dependency order (parents before children).
   ========================================================================= */

USE ZarghoonJewellersDB;
GO

/* ----------------------------------------------------------------------
   1. SECURITY: Roles / Permissions / RolePermissions / Users
   -------------------------------------------------------------------- */

CREATE TABLE erp.Roles
(
    RoleId          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
    RoleName        NVARCHAR(50)        NOT NULL,
    Description     NVARCHAR(255)       NULL,
    IsSystemRole    BIT                 NOT NULL CONSTRAINT DF_Roles_IsSystemRole DEFAULT (0),
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Roles_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
);
GO

CREATE TABLE erp.Permissions
(
    PermissionId    INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Permissions PRIMARY KEY,
    PermissionName  NVARCHAR(100)       NOT NULL,
    ModuleName      NVARCHAR(50)        NOT NULL,
    Description     NVARCHAR(255)       NULL,
    CONSTRAINT UQ_Permissions_PermissionName UNIQUE (PermissionName)
);
GO

CREATE TABLE erp.RolePermissions
(
    RolePermissionId INT IDENTITY(1,1)  NOT NULL CONSTRAINT PK_RolePermissions PRIMARY KEY,
    RoleId          INT                 NOT NULL,
    PermissionId    INT                 NOT NULL,
    CanView         BIT                 NOT NULL CONSTRAINT DF_RolePermissions_CanView DEFAULT (1),
    CanAdd          BIT                 NOT NULL CONSTRAINT DF_RolePermissions_CanAdd DEFAULT (0),
    CanEdit         BIT                 NOT NULL CONSTRAINT DF_RolePermissions_CanEdit DEFAULT (0),
    CanDelete       BIT                 NOT NULL CONSTRAINT DF_RolePermissions_CanDelete DEFAULT (0),
    CanPrint        BIT                 NOT NULL CONSTRAINT DF_RolePermissions_CanPrint DEFAULT (0),
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES erp.Roles (RoleId) ON DELETE CASCADE,
    CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES erp.Permissions (PermissionId) ON DELETE CASCADE,
    CONSTRAINT UQ_RolePermissions_Role_Permission UNIQUE (RoleId, PermissionId)
);
GO

CREATE TABLE erp.Users
(
    UserId          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Username        NVARCHAR(50)        NOT NULL,
    PasswordHash    VARBINARY(64)       NOT NULL,
    PasswordSalt    VARBINARY(32)       NOT NULL,
    PasswordIterations INT              NOT NULL CONSTRAINT DF_Users_PasswordIterations DEFAULT (100000),
    FullName        NVARCHAR(100)       NOT NULL,
    Email           NVARCHAR(100)       NULL,
    Phone           NVARCHAR(20)        NULL,
    RoleId          INT                 NOT NULL,
    ProfileImagePath NVARCHAR(260)      NULL,
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    MustChangePassword BIT              NOT NULL CONSTRAINT DF_Users_MustChangePassword DEFAULT (0),
    LastLoginDate   DATETIME2(0)        NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Users_CreatedDate DEFAULT (SYSDATETIME()),
    CreatedBy       INT                 NULL,
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES erp.Roles (RoleId),
    CONSTRAINT UQ_Users_Username UNIQUE (Username)
);
GO

/* Self-referencing FK added after the table exists (created by / audit trail) */
ALTER TABLE erp.Users
    ADD CONSTRAINT FK_Users_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId);
GO

/* ----------------------------------------------------------------------
   2. PEOPLE: Employees / Karigar (artisans) / Customers / Suppliers
   -------------------------------------------------------------------- */

CREATE TABLE erp.Employees
(
    EmployeeId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Employees PRIMARY KEY,
    EmployeeCode    NVARCHAR(20)        NOT NULL,
    FullName        NVARCHAR(100)       NOT NULL,
    Designation     NVARCHAR(100)       NULL,
    Department      NVARCHAR(100)       NULL,
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(100)       NULL,
    Address         NVARCHAR(255)       NULL,
    CNIC            NVARCHAR(20)        NULL,
    JoiningDate     DATE                NULL,
    Salary          DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Employees_Salary DEFAULT (0),
    UserId          INT                 NULL,
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Employees_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Employees_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Employees_EmployeeCode UNIQUE (EmployeeCode),
    CONSTRAINT FK_Employees_Users FOREIGN KEY (UserId) REFERENCES erp.Users (UserId)
);
GO

CREATE TABLE erp.Karigars
(
    KarigarId       INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Karigars PRIMARY KEY,
    KarigarCode     NVARCHAR(20)        NOT NULL,
    FullName        NVARCHAR(100)       NOT NULL,
    Phone           NVARCHAR(20)        NULL,
    Address         NVARCHAR(255)       NULL,
    CNIC            NVARCHAR(20)        NULL,
    SpecialtyType   NVARCHAR(100)       NULL,           -- e.g. Ring Maker, Setting, Polishing
    JoiningDate     DATE                NULL,
    OpeningGoldBalance  DECIMAL(18,3)   NOT NULL CONSTRAINT DF_Karigars_OpeningGoldBalance DEFAULT (0),
    CurrentGoldBalance  DECIMAL(18,3)   NOT NULL CONSTRAINT DF_Karigars_CurrentGoldBalance DEFAULT (0), -- +ve = karigar owes gold to shop
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Karigars_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Karigars_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Karigars_KarigarCode UNIQUE (KarigarCode)
);
GO

CREATE TABLE erp.Customers
(
    CustomerId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Customers PRIMARY KEY,
    CustomerCode    NVARCHAR(20)        NOT NULL,
    FullName        NVARCHAR(100)       NOT NULL,
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(100)       NULL,
    Address         NVARCHAR(255)       NULL,
    City            NVARCHAR(50)        NULL,
    CNIC            NVARCHAR(20)        NULL,
    CustomerType    NVARCHAR(20)        NOT NULL CONSTRAINT DF_Customers_CustomerType DEFAULT ('Retail'),
    OpeningBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Customers_OpeningBalance DEFAULT (0),
    CurrentBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Customers_CurrentBalance DEFAULT (0), -- +ve = customer owes shop
    CurrentGoldBalance DECIMAL(18,3)    NOT NULL CONSTRAINT DF_Customers_CurrentGoldBalance DEFAULT (0), -- +ve = shop owes gold to customer
    CreditLimit     DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Customers_CreditLimit DEFAULT (0),
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Customers_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Customers_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Customers_CustomerCode UNIQUE (CustomerCode),
    CONSTRAINT CK_Customers_CustomerType CHECK (CustomerType IN ('Retail','Wholesale','VIP'))
);
GO

CREATE TABLE erp.Suppliers
(
    SupplierId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Suppliers PRIMARY KEY,
    SupplierCode    NVARCHAR(20)        NOT NULL,
    CompanyName     NVARCHAR(150)       NOT NULL,
    ContactPerson   NVARCHAR(100)       NULL,
    Phone           NVARCHAR(20)        NULL,
    Email           NVARCHAR(100)       NULL,
    Address         NVARCHAR(255)       NULL,
    City            NVARCHAR(50)        NULL,
    OpeningBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Suppliers_OpeningBalance DEFAULT (0),
    CurrentBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Suppliers_CurrentBalance DEFAULT (0), -- +ve = shop owes supplier
    CurrentGoldBalance DECIMAL(18,3)    NOT NULL CONSTRAINT DF_Suppliers_CurrentGoldBalance DEFAULT (0),
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Suppliers_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Suppliers_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Suppliers_SupplierCode UNIQUE (SupplierCode)
);
GO

/* ----------------------------------------------------------------------
   3. INVENTORY: StockCategories / Stock / Barcodes / Images
   -------------------------------------------------------------------- */

CREATE TABLE erp.StockCategories
(
    CategoryId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_StockCategories PRIMARY KEY,
    CategoryName    NVARCHAR(100)       NOT NULL,
    Description     NVARCHAR(255)       NULL,
    ParentCategoryId INT                NULL,
    IsActive        BIT                 NOT NULL CONSTRAINT DF_StockCategories_IsActive DEFAULT (1),
    CONSTRAINT UQ_StockCategories_CategoryName UNIQUE (CategoryName),
    CONSTRAINT FK_StockCategories_Parent FOREIGN KEY (ParentCategoryId) REFERENCES erp.StockCategories (CategoryId)
);
GO

CREATE TABLE erp.Stock
(
    StockId         INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Stock PRIMARY KEY,
    ItemCode        NVARCHAR(30)        NOT NULL,
    CategoryId      INT                 NOT NULL,
    ItemName        NVARCHAR(150)       NOT NULL,
    MetalType       NVARCHAR(20)        NOT NULL CONSTRAINT DF_Stock_MetalType DEFAULT ('Gold'),
    Purity          NVARCHAR(10)        NOT NULL CONSTRAINT DF_Stock_Purity DEFAULT ('22K'), -- 24K/22K/21K/18K etc.
    GrossWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_Stock_GrossWeight DEFAULT (0),
    StoneWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_Stock_StoneWeight DEFAULT (0),
    NetWeight       AS (GrossWeight - StoneWeight) PERSISTED,
    MakingChargeType NVARCHAR(20)       NOT NULL CONSTRAINT DF_Stock_MakingChargeType DEFAULT ('PerGram'),
    MakingChargeValue DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Stock_MakingChargeValue DEFAULT (0),
    StoneValue      DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Stock_StoneValue DEFAULT (0),
    Quantity        INT                 NOT NULL CONSTRAINT DF_Stock_Quantity DEFAULT (1),
    UnitOfMeasure   NVARCHAR(10)        NOT NULL CONSTRAINT DF_Stock_UnitOfMeasure DEFAULT ('Gram'),
    PurchaseRate    DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Stock_PurchaseRate DEFAULT (0),
    PurchaseValue   DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Stock_PurchaseValue DEFAULT (0),
    SaleRate        DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Stock_SaleRate DEFAULT (0),
    MinimumStockLevel DECIMAL(18,3)     NOT NULL CONSTRAINT DF_Stock_MinimumStockLevel DEFAULT (0),
    KarigarId       INT                 NULL,
    SupplierId      INT                 NULL,
    VaultLocation   NVARCHAR(100)       NULL,
    IsActive        BIT                 NOT NULL CONSTRAINT DF_Stock_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Stock_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Stock_ItemCode UNIQUE (ItemCode),
    CONSTRAINT FK_Stock_StockCategories FOREIGN KEY (CategoryId) REFERENCES erp.StockCategories (CategoryId),
    CONSTRAINT FK_Stock_Karigars FOREIGN KEY (KarigarId) REFERENCES erp.Karigars (KarigarId),
    CONSTRAINT FK_Stock_Suppliers FOREIGN KEY (SupplierId) REFERENCES erp.Suppliers (SupplierId),
    CONSTRAINT CK_Stock_MetalType CHECK (MetalType IN ('Gold','Silver','Platinum','Diamond','Other')),
    CONSTRAINT CK_Stock_MakingChargeType CHECK (MakingChargeType IN ('PerGram','Fixed','Percentage'))
);
GO

CREATE TABLE erp.Barcodes
(
    BarcodeId       INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Barcodes PRIMARY KEY,
    StockId         INT                 NOT NULL,
    BarcodeValue    NVARCHAR(50)        NOT NULL,
    BarcodeType     NVARCHAR(20)        NOT NULL CONSTRAINT DF_Barcodes_BarcodeType DEFAULT ('Code128'),
    GeneratedDate   DATETIME2(0)        NOT NULL CONSTRAINT DF_Barcodes_GeneratedDate DEFAULT (SYSDATETIME()),
    IsPrinted       BIT                 NOT NULL CONSTRAINT DF_Barcodes_IsPrinted DEFAULT (0),
    CONSTRAINT UQ_Barcodes_BarcodeValue UNIQUE (BarcodeValue),
    CONSTRAINT FK_Barcodes_Stock FOREIGN KEY (StockId) REFERENCES erp.Stock (StockId) ON DELETE CASCADE,
    CONSTRAINT CK_Barcodes_BarcodeType CHECK (BarcodeType IN ('Code128','Code39','QR','EAN13'))
);
GO

/* Polymorphic image store shared by Stock, Customers, Employees, Karigar, etc.
   EntityType + EntityId identify the owning row without a hard FK, keeping
   the table generic and reusable across modules. */
CREATE TABLE erp.Images
(
    ImageId         INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Images PRIMARY KEY,
    EntityType      NVARCHAR(30)        NOT NULL,   -- 'Stock','Customer','Employee','Karigar','Supplier'
    EntityId        INT                 NOT NULL,
    FileName        NVARCHAR(260)       NOT NULL,
    FilePath        NVARCHAR(500)       NULL,
    ImageData       VARBINARY(MAX)      NULL,
    ThumbnailData   VARBINARY(MAX)      NULL,
    IsPrimary       BIT                 NOT NULL CONSTRAINT DF_Images_IsPrimary DEFAULT (0),
    UploadedDate    DATETIME2(0)        NOT NULL CONSTRAINT DF_Images_UploadedDate DEFAULT (SYSDATETIME())
);
GO
CREATE INDEX IX_Images_EntityType_EntityId ON erp.Images (EntityType, EntityId);
GO

/* ----------------------------------------------------------------------
   4. FINANCE: BankAccounts
   -------------------------------------------------------------------- */

CREATE TABLE erp.BankAccounts
(
    BankAccountId   INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_BankAccounts PRIMARY KEY,
    BankName        NVARCHAR(100)       NOT NULL,
    AccountTitle    NVARCHAR(150)       NOT NULL,
    AccountNumber   NVARCHAR(50)        NOT NULL,
    IBAN            NVARCHAR(50)        NULL,
    Branch          NVARCHAR(100)       NULL,
    OpeningBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_BankAccounts_OpeningBalance DEFAULT (0),
    CurrentBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_BankAccounts_CurrentBalance DEFAULT (0),
    IsActive        BIT                 NOT NULL CONSTRAINT DF_BankAccounts_IsActive DEFAULT (1),
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_BankAccounts_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_BankAccounts_AccountNumber UNIQUE (AccountNumber)
);
GO

/* ----------------------------------------------------------------------
   5. TRANSACTIONS: Invoices / InvoiceDetails / Purchases / PurchaseDetails
   -------------------------------------------------------------------- */

CREATE TABLE erp.Invoices
(
    InvoiceId       INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Invoices PRIMARY KEY,
    InvoiceNumber   NVARCHAR(30)        NOT NULL,
    InvoiceDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Invoices_InvoiceDate DEFAULT (SYSDATETIME()),
    CustomerId      INT                 NOT NULL,
    GoldRateAtSale  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_GoldRateAtSale DEFAULT (0),
    TotalGrossWeight DECIMAL(18,3)      NOT NULL CONSTRAINT DF_Invoices_TotalGrossWeight DEFAULT (0),
    TotalNetWeight  DECIMAL(18,3)       NOT NULL CONSTRAINT DF_Invoices_TotalNetWeight DEFAULT (0),
    SubTotal        DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_SubTotal DEFAULT (0),
    MakingChargeTotal DECIMAL(18,2)     NOT NULL CONSTRAINT DF_Invoices_MakingChargeTotal DEFAULT (0),
    DiscountAmount  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_DiscountAmount DEFAULT (0),
    TaxAmount       DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_TaxAmount DEFAULT (0),
    TotalAmount     DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_TotalAmount DEFAULT (0),
    PaidAmount      DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Invoices_PaidAmount DEFAULT (0),
    BalanceAmount   AS (TotalAmount - PaidAmount) PERSISTED,
    PaymentMode     NVARCHAR(20)        NOT NULL CONSTRAINT DF_Invoices_PaymentMode DEFAULT ('Cash'),
    OldGoldExchangeWeight DECIMAL(18,3) NOT NULL CONSTRAINT DF_Invoices_OldGoldExchangeWeight DEFAULT (0),
    Status          NVARCHAR(20)        NOT NULL CONSTRAINT DF_Invoices_Status DEFAULT ('Confirmed'),
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Invoices_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Invoices_InvoiceNumber UNIQUE (InvoiceNumber),
    CONSTRAINT FK_Invoices_Customers FOREIGN KEY (CustomerId) REFERENCES erp.Customers (CustomerId),
    CONSTRAINT FK_Invoices_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_Invoices_PaymentMode CHECK (PaymentMode IN ('Cash','Bank','Credit','Mixed')),
    CONSTRAINT CK_Invoices_Status CHECK (Status IN ('Draft','Confirmed','Cancelled','Returned'))
);
GO

CREATE TABLE erp.InvoiceDetails
(
    InvoiceDetailId INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_InvoiceDetails PRIMARY KEY,
    InvoiceId       INT                 NOT NULL,
    StockId         INT                 NOT NULL,
    Purity          NVARCHAR(10)        NOT NULL,
    GrossWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_InvoiceDetails_GrossWeight DEFAULT (0),
    StoneWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_InvoiceDetails_StoneWeight DEFAULT (0),
    NetWeight       AS (GrossWeight - StoneWeight) PERSISTED,
    Rate            DECIMAL(18,2)       NOT NULL CONSTRAINT DF_InvoiceDetails_Rate DEFAULT (0),
    MakingCharge    DECIMAL(18,2)       NOT NULL CONSTRAINT DF_InvoiceDetails_MakingCharge DEFAULT (0),
    StoneValue      DECIMAL(18,2)       NOT NULL CONSTRAINT DF_InvoiceDetails_StoneValue DEFAULT (0),
    Quantity        INT                 NOT NULL CONSTRAINT DF_InvoiceDetails_Quantity DEFAULT (1),
    LineTotal       DECIMAL(18,2)       NOT NULL CONSTRAINT DF_InvoiceDetails_LineTotal DEFAULT (0),
    CONSTRAINT FK_InvoiceDetails_Invoices FOREIGN KEY (InvoiceId) REFERENCES erp.Invoices (InvoiceId) ON DELETE CASCADE,
    CONSTRAINT FK_InvoiceDetails_Stock FOREIGN KEY (StockId) REFERENCES erp.Stock (StockId)
);
GO

CREATE TABLE erp.Purchases
(
    PurchaseId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Purchases PRIMARY KEY,
    PurchaseNumber  NVARCHAR(30)        NOT NULL,
    PurchaseDate    DATETIME2(0)        NOT NULL CONSTRAINT DF_Purchases_PurchaseDate DEFAULT (SYSDATETIME()),
    SupplierId      INT                 NOT NULL,
    GoldRateAtPurchase DECIMAL(18,2)    NOT NULL CONSTRAINT DF_Purchases_GoldRateAtPurchase DEFAULT (0),
    TotalGrossWeight DECIMAL(18,3)      NOT NULL CONSTRAINT DF_Purchases_TotalGrossWeight DEFAULT (0),
    TotalNetWeight  DECIMAL(18,3)       NOT NULL CONSTRAINT DF_Purchases_TotalNetWeight DEFAULT (0),
    SubTotal        DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Purchases_SubTotal DEFAULT (0),
    TotalAmount     DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Purchases_TotalAmount DEFAULT (0),
    PaidAmount      DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Purchases_PaidAmount DEFAULT (0),
    BalanceAmount   AS (TotalAmount - PaidAmount) PERSISTED,
    Status          NVARCHAR(20)        NOT NULL CONSTRAINT DF_Purchases_Status DEFAULT ('Confirmed'),
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Purchases_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Purchases_PurchaseNumber UNIQUE (PurchaseNumber),
    CONSTRAINT FK_Purchases_Suppliers FOREIGN KEY (SupplierId) REFERENCES erp.Suppliers (SupplierId),
    CONSTRAINT FK_Purchases_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_Purchases_Status CHECK (Status IN ('Draft','Confirmed','Cancelled','Returned'))
);
GO

CREATE TABLE erp.PurchaseDetails
(
    PurchaseDetailId INT IDENTITY(1,1)  NOT NULL CONSTRAINT PK_PurchaseDetails PRIMARY KEY,
    PurchaseId      INT                 NOT NULL,
    StockId         INT                 NULL,               -- NULL when it's a brand-new item not yet in Stock
    ItemName        NVARCHAR(150)       NOT NULL,
    Purity          NVARCHAR(10)        NOT NULL,
    GrossWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_PurchaseDetails_GrossWeight DEFAULT (0),
    StoneWeight     DECIMAL(18,3)       NOT NULL CONSTRAINT DF_PurchaseDetails_StoneWeight DEFAULT (0),
    NetWeight       AS (GrossWeight - StoneWeight) PERSISTED,
    Rate            DECIMAL(18,2)       NOT NULL CONSTRAINT DF_PurchaseDetails_Rate DEFAULT (0),
    Quantity        INT                 NOT NULL CONSTRAINT DF_PurchaseDetails_Quantity DEFAULT (1),
    Amount          DECIMAL(18,2)       NOT NULL CONSTRAINT DF_PurchaseDetails_Amount DEFAULT (0),
    CONSTRAINT FK_PurchaseDetails_Purchases FOREIGN KEY (PurchaseId) REFERENCES erp.Purchases (PurchaseId) ON DELETE CASCADE,
    CONSTRAINT FK_PurchaseDetails_Stock FOREIGN KEY (StockId) REFERENCES erp.Stock (StockId)
);
GO

/* ----------------------------------------------------------------------
   6. LEDGERS: CashLedger / GoldLedger / Expenses / Income
   -------------------------------------------------------------------- */

CREATE TABLE erp.CashLedger
(
    CashLedgerId    INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_CashLedger PRIMARY KEY,
    TransactionDate DATETIME2(0)        NOT NULL CONSTRAINT DF_CashLedger_TransactionDate DEFAULT (SYSDATETIME()),
    TransactionType NVARCHAR(10)        NOT NULL,           -- Receipt / Payment
    ReferenceType   NVARCHAR(30)        NOT NULL,           -- Invoice / Purchase / Expense / Income / Manual
    ReferenceId     INT                 NULL,
    Amount          DECIMAL(18,2)       NOT NULL,
    PaymentMode     NVARCHAR(20)        NOT NULL CONSTRAINT DF_CashLedger_PaymentMode DEFAULT ('Cash'),
    BankAccountId   INT                 NULL,
    Description     NVARCHAR(255)       NULL,
    RunningBalance  DECIMAL(18,2)       NOT NULL CONSTRAINT DF_CashLedger_RunningBalance DEFAULT (0),
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_CashLedger_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_CashLedger_BankAccounts FOREIGN KEY (BankAccountId) REFERENCES erp.BankAccounts (BankAccountId),
    CONSTRAINT FK_CashLedger_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_CashLedger_TransactionType CHECK (TransactionType IN ('Receipt','Payment')),
    CONSTRAINT CK_CashLedger_PaymentMode CHECK (PaymentMode IN ('Cash','Bank','Cheque'))
);
GO

CREATE TABLE erp.GoldLedger
(
    GoldLedgerId    INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_GoldLedger PRIMARY KEY,
    TransactionDate DATETIME2(0)        NOT NULL CONSTRAINT DF_GoldLedger_TransactionDate DEFAULT (SYSDATETIME()),
    EntityType      NVARCHAR(20)        NOT NULL,           -- Customer / Supplier / Karigar
    EntityId        INT                 NOT NULL,
    TransactionType NVARCHAR(10)        NOT NULL,           -- Given / Received
    Purity          NVARCHAR(10)        NOT NULL CONSTRAINT DF_GoldLedger_Purity DEFAULT ('24K'),
    Weight          DECIMAL(18,3)       NOT NULL,
    ReferenceType   NVARCHAR(30)        NULL,
    ReferenceId     INT                 NULL,
    Description     NVARCHAR(255)       NULL,
    RunningBalance  DECIMAL(18,3)       NOT NULL CONSTRAINT DF_GoldLedger_RunningBalance DEFAULT (0),
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_GoldLedger_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_GoldLedger_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_GoldLedger_EntityType CHECK (EntityType IN ('Customer','Supplier','Karigar')),
    CONSTRAINT CK_GoldLedger_TransactionType CHECK (TransactionType IN ('Given','Received'))
);
GO

CREATE TABLE erp.Expenses
(
    ExpenseId       INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Expenses PRIMARY KEY,
    ExpenseDate     DATE                NOT NULL CONSTRAINT DF_Expenses_ExpenseDate DEFAULT (CAST(SYSDATETIME() AS DATE)),
    ExpenseCategory NVARCHAR(50)        NOT NULL,
    Description     NVARCHAR(255)       NULL,
    Amount          DECIMAL(18,2)       NOT NULL,
    PaymentMode     NVARCHAR(20)        NOT NULL CONSTRAINT DF_Expenses_PaymentMode DEFAULT ('Cash'),
    BankAccountId   INT                 NULL,
    ApprovedBy      INT                 NULL,
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Expenses_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Expenses_BankAccounts FOREIGN KEY (BankAccountId) REFERENCES erp.BankAccounts (BankAccountId),
    CONSTRAINT FK_Expenses_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT FK_Expenses_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId)
);
GO

CREATE TABLE erp.Income
(
    IncomeId        INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Income PRIMARY KEY,
    IncomeDate      DATE                NOT NULL CONSTRAINT DF_Income_IncomeDate DEFAULT (CAST(SYSDATETIME() AS DATE)),
    IncomeCategory  NVARCHAR(50)        NOT NULL,
    Description     NVARCHAR(255)       NULL,
    Amount          DECIMAL(18,2)       NOT NULL,
    PaymentMode     NVARCHAR(20)        NOT NULL CONSTRAINT DF_Income_PaymentMode DEFAULT ('Cash'),
    BankAccountId   INT                 NULL,
    ReceivedBy      INT                 NULL,
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_Income_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_Income_BankAccounts FOREIGN KEY (BankAccountId) REFERENCES erp.BankAccounts (BankAccountId),
    CONSTRAINT FK_Income_ReceivedBy FOREIGN KEY (ReceivedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT FK_Income_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId)
);
GO

/* ----------------------------------------------------------------------
   7. SERVICE: RepairOrders
   -------------------------------------------------------------------- */

CREATE TABLE erp.RepairOrders
(
    RepairOrderId   INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_RepairOrders PRIMARY KEY,
    OrderNumber     NVARCHAR(30)        NOT NULL,
    CustomerId      INT                 NOT NULL,
    ItemDescription NVARCHAR(255)       NOT NULL,
    MetalType       NVARCHAR(20)        NOT NULL CONSTRAINT DF_RepairOrders_MetalType DEFAULT ('Gold'),
    Purity          NVARCHAR(10)        NULL,
    Weight          DECIMAL(18,3)       NOT NULL CONSTRAINT DF_RepairOrders_Weight DEFAULT (0),
    KarigarId       INT                 NULL,
    ReceivedDate    DATETIME2(0)        NOT NULL CONSTRAINT DF_RepairOrders_ReceivedDate DEFAULT (SYSDATETIME()),
    PromisedDate    DATE                NULL,
    DeliveredDate   DATETIME2(0)        NULL,
    RepairCharges   DECIMAL(18,2)       NOT NULL CONSTRAINT DF_RepairOrders_RepairCharges DEFAULT (0),
    AdvancePaid     DECIMAL(18,2)       NOT NULL CONSTRAINT DF_RepairOrders_AdvancePaid DEFAULT (0),
    Status          NVARCHAR(20)        NOT NULL CONSTRAINT DF_RepairOrders_Status DEFAULT ('Pending'),
    Notes           NVARCHAR(500)       NULL,
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_RepairOrders_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_RepairOrders_OrderNumber UNIQUE (OrderNumber),
    CONSTRAINT FK_RepairOrders_Customers FOREIGN KEY (CustomerId) REFERENCES erp.Customers (CustomerId),
    CONSTRAINT FK_RepairOrders_Karigars FOREIGN KEY (KarigarId) REFERENCES erp.Karigars (KarigarId),
    CONSTRAINT FK_RepairOrders_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_RepairOrders_Status CHECK (Status IN ('Pending','InProgress','Completed','Delivered','Cancelled'))
);
GO

/* ----------------------------------------------------------------------
   8. SYSTEM: Settings / AuditLogs / DailyGoldRates / UsdtTransactions
   -------------------------------------------------------------------- */

CREATE TABLE erp.Settings
(
    SettingId       INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Settings PRIMARY KEY,
    SettingKey      NVARCHAR(100)       NOT NULL,
    SettingValue    NVARCHAR(500)       NULL,
    Description     NVARCHAR(255)       NULL,
    ModifiedDate    DATETIME2(0)        NOT NULL CONSTRAINT DF_Settings_ModifiedDate DEFAULT (SYSDATETIME()),
    ModifiedBy      INT                 NULL,
    CONSTRAINT UQ_Settings_SettingKey UNIQUE (SettingKey),
    CONSTRAINT FK_Settings_Users FOREIGN KEY (ModifiedBy) REFERENCES erp.Users (UserId)
);
GO

CREATE TABLE erp.AuditLogs
(
    AuditLogId      BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    UserId          INT                 NULL,
    ActionType      NVARCHAR(20)        NOT NULL,          -- Insert/Update/Delete/Login/Logout
    TableName       NVARCHAR(100)       NULL,
    RecordId        NVARCHAR(50)        NULL,
    OldValues       NVARCHAR(MAX)       NULL,
    NewValues       NVARCHAR(MAX)       NULL,
    IPAddress       NVARCHAR(50)        NULL,
    ActionDate      DATETIME2(0)        NOT NULL CONSTRAINT DF_AuditLogs_ActionDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES erp.Users (UserId)
);
GO

CREATE TABLE erp.DailyGoldRates
(
    GoldRateId      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_DailyGoldRates PRIMARY KEY,
    RateDate        DATE                NOT NULL,
    Rate24K         DECIMAL(18,2)       NOT NULL,
    Rate22K         DECIMAL(18,2)       NOT NULL,
    Rate21K         DECIMAL(18,2)       NOT NULL,
    Rate18K         DECIMAL(18,2)       NOT NULL,
    UsdPerOunce     DECIMAL(18,2)       NOT NULL CONSTRAINT DF_DailyGoldRates_UsdPerOunce DEFAULT (0),
    UsdToPkr        DECIMAL(18,4)       NOT NULL CONSTRAINT DF_DailyGoldRates_UsdToPkr DEFAULT (0),
    EnteredBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_DailyGoldRates_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_DailyGoldRates_RateDate UNIQUE (RateDate),
    CONSTRAINT FK_DailyGoldRates_Users FOREIGN KEY (EnteredBy) REFERENCES erp.Users (UserId)
);
GO

CREATE TABLE erp.UsdtTransactions
(
    UsdtTransactionId INT IDENTITY(1,1)  NOT NULL CONSTRAINT PK_UsdtTransactions PRIMARY KEY,
    TransactionDate DATETIME2(0)        NOT NULL CONSTRAINT DF_UsdtTransactions_TransactionDate DEFAULT (SYSDATETIME()),
    TransactionType NVARCHAR(10)        NOT NULL,          -- Buy / Sell
    AmountUsdt      DECIMAL(18,6)       NOT NULL,
    RateInPkr       DECIMAL(18,4)       NOT NULL,
    TotalPkr        AS (AmountUsdt * RateInPkr) PERSISTED,
    WalletAddress   NVARCHAR(100)       NULL,
    ReferenceNote   NVARCHAR(255)       NULL,
    BankAccountId   INT                 NULL,
    CreatedBy       INT                 NOT NULL,
    CreatedDate     DATETIME2(0)        NOT NULL CONSTRAINT DF_UsdtTransactions_CreatedDate DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_UsdtTransactions_BankAccounts FOREIGN KEY (BankAccountId) REFERENCES erp.BankAccounts (BankAccountId),
    CONSTRAINT FK_UsdtTransactions_Users FOREIGN KEY (CreatedBy) REFERENCES erp.Users (UserId),
    CONSTRAINT CK_UsdtTransactions_TransactionType CHECK (TransactionType IN ('Buy','Sell'))
);
GO
