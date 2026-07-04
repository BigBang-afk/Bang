-- =====================================================================
-- Zarghoon Jewelry Pro - Module 6
-- Creates the repairs table used by the Repair form.
-- Run this in phpMyAdmin: select the zarghoon_jewelry database,
-- open the SQL tab, paste, click Go.
-- =====================================================================

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS repairs (
    RepairID        INT AUTO_INCREMENT PRIMARY KEY,
    ReceiptNumber   VARCHAR(20) NOT NULL UNIQUE,
    CustomerName    VARCHAR(100) NOT NULL,
    CustomerPhone   VARCHAR(20),
    ItemDescription VARCHAR(200) NOT NULL,
    Weight          DECIMAL(10,3) NOT NULL DEFAULT 0,
    EstimatedCost   DECIMAL(10,2) NOT NULL DEFAULT 0,
    AdvancePaid     DECIMAL(10,2) NOT NULL DEFAULT 0,
    Status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
    ReceivedDate    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DeliveryDate    DATE NULL,
    Notes           VARCHAR(255)
);
