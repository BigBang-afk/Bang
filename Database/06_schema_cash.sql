-- =====================================================================
-- Zarghoon Jewelry Pro - Module 7
-- Creates the cash_transactions table used by the Cash In/Out form.
-- Run this in phpMyAdmin: select the zarghoon_jewelry database,
-- open the SQL tab, paste, click Go.
-- =====================================================================

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS cash_transactions (
    TransactionID    INT AUTO_INCREMENT PRIMARY KEY,
    TransactionType  VARCHAR(10) NOT NULL,   -- 'In' or 'Out'
    Category         VARCHAR(50),
    Amount           DECIMAL(12,2) NOT NULL,
    Description      VARCHAR(255),
    TransactionDate  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
