/* ============================================================================
   Zarghoon Jewellers ERP
   Script : 03_Indexes.sql
   Purpose: Non-clustered indexes to support the dashboard aggregations and
            the most common lookup/search paths used by the application.
   ========================================================================= */

USE ZarghoonJewellersDB;
GO

-- Invoices are queried heavily by date range (dashboard "today's sale") and by customer
CREATE NONCLUSTERED INDEX IX_Invoices_InvoiceDate ON erp.Invoices (InvoiceDate) INCLUDE (TotalAmount, PaidAmount, Status);
CREATE NONCLUSTERED INDEX IX_Invoices_CustomerId ON erp.Invoices (CustomerId);

CREATE NONCLUSTERED INDEX IX_InvoiceDetails_InvoiceId ON erp.InvoiceDetails (InvoiceId);
CREATE NONCLUSTERED INDEX IX_InvoiceDetails_StockId ON erp.InvoiceDetails (StockId);

-- Purchases mirror the invoice access pattern for the "today's purchase" card
CREATE NONCLUSTERED INDEX IX_Purchases_PurchaseDate ON erp.Purchases (PurchaseDate) INCLUDE (TotalAmount, PaidAmount, Status);
CREATE NONCLUSTERED INDEX IX_Purchases_SupplierId ON erp.Purchases (SupplierId);

CREATE NONCLUSTERED INDEX IX_PurchaseDetails_PurchaseId ON erp.PurchaseDetails (PurchaseId);
CREATE NONCLUSTERED INDEX IX_PurchaseDetails_StockId ON erp.PurchaseDetails (StockId);

-- Stock: low stock alerts and category browsing
CREATE NONCLUSTERED INDEX IX_Stock_CategoryId ON erp.Stock (CategoryId);
CREATE NONCLUSTERED INDEX IX_Stock_IsActive_Quantity ON erp.Stock (IsActive, Quantity) INCLUDE (MinimumStockLevel, ItemName, PurchaseValue);
CREATE NONCLUSTERED INDEX IX_Stock_KarigarId ON erp.Stock (KarigarId);
CREATE NONCLUSTERED INDEX IX_Stock_SupplierId ON erp.Stock (SupplierId);

-- Ledgers: running-balance & dashboard cash/gold position queries
CREATE NONCLUSTERED INDEX IX_CashLedger_TransactionDate ON erp.CashLedger (TransactionDate);
CREATE NONCLUSTERED INDEX IX_CashLedger_ReferenceType_ReferenceId ON erp.CashLedger (ReferenceType, ReferenceId);

CREATE NONCLUSTERED INDEX IX_GoldLedger_EntityType_EntityId ON erp.GoldLedger (EntityType, EntityId);
CREATE NONCLUSTERED INDEX IX_GoldLedger_TransactionDate ON erp.GoldLedger (TransactionDate);

-- Customers / Suppliers: search & balance widgets
CREATE NONCLUSTERED INDEX IX_Customers_FullName ON erp.Customers (FullName);
CREATE NONCLUSTERED INDEX IX_Customers_CurrentBalance ON erp.Customers (CurrentBalance) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Suppliers_CompanyName ON erp.Suppliers (CompanyName);

-- RepairOrders: pending-order dashboard widget
CREATE NONCLUSTERED INDEX IX_RepairOrders_Status ON erp.RepairOrders (Status) INCLUDE (PromisedDate, CustomerId);

-- Expenses / Income: date range reporting
CREATE NONCLUSTERED INDEX IX_Expenses_ExpenseDate ON erp.Expenses (ExpenseDate);
CREATE NONCLUSTERED INDEX IX_Income_IncomeDate ON erp.Income (IncomeDate);

-- AuditLogs: recent activity & per-user history
CREATE NONCLUSTERED INDEX IX_AuditLogs_ActionDate ON erp.AuditLogs (ActionDate DESC);
CREATE NONCLUSTERED INDEX IX_AuditLogs_UserId ON erp.AuditLogs (UserId);

-- DailyGoldRates: latest-rate lookup
CREATE NONCLUSTERED INDEX IX_DailyGoldRates_RateDate_DESC ON erp.DailyGoldRates (RateDate DESC);
GO
