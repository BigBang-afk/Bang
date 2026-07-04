-- =====================================================================
-- Zarghoon Jewelry Pro - Module 5
-- Creates the sales (invoice header) and sales_items (invoice lines)
-- tables used by the Sales Billing form.
-- Run this in phpMyAdmin: select the zarghoon_jewelry database,
-- open the SQL tab, paste, click Go.
-- =====================================================================

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS sales (
    SaleID          INT AUTO_INCREMENT PRIMARY KEY,
    InvoiceNumber   VARCHAR(20) NOT NULL UNIQUE,
    CustomerID      INT NULL,
    SaleDate        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TotalAmount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    ReceivedAmount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    BalanceAmount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (CustomerID) REFERENCES customers(CustomerID)
);

CREATE TABLE IF NOT EXISTS sales_items (
    SaleItemID     INT AUTO_INCREMENT PRIMARY KEY,
    SaleID         INT NOT NULL,
    StockID        INT NULL,
    ItemName       VARCHAR(100) NOT NULL,
    Karat          VARCHAR(20),
    Weight         DECIMAL(10,3) NOT NULL DEFAULT 0,
    Quantity       INT NOT NULL DEFAULT 1,
    RatePerGram    DECIMAL(10,2) NOT NULL DEFAULT 0,
    MakingCharges  DECIMAL(10,2) NOT NULL DEFAULT 0,
    LineTotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (SaleID) REFERENCES sales(SaleID),
    FOREIGN KEY (StockID) REFERENCES stock(StockID)
);
