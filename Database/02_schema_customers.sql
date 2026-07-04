-- =====================================================================
-- Zarghoon Jewelry Pro - Module 3
-- Creates the customers table used by the Customer form.
-- Run this in phpMyAdmin: select the zarghoon_jewelry database,
-- open the SQL tab, paste, click Go.
-- =====================================================================

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS customers (
    CustomerID    INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName  VARCHAR(100) NOT NULL,
    PhoneNumber   VARCHAR(20),
    Address       VARCHAR(255),
    Email         VARCHAR(100),
    CreatedDate   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
