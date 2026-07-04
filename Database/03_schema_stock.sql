-- =====================================================================
-- Zarghoon Jewelry Pro - Module 4
-- Creates categories, karats (lookup tables) and the stock table.
-- Run this in phpMyAdmin: select the zarghoon_jewelry database,
-- open the SQL tab, paste, click Go.
-- =====================================================================

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS categories (
    CategoryID    INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS karats (
    KaratID    INT AUTO_INCREMENT PRIMARY KEY,
    KaratName  VARCHAR(20) NOT NULL UNIQUE,
    Purity     DECIMAL(5,2) NOT NULL DEFAULT 0   -- e.g. 91.60 for 22K
);

CREATE TABLE IF NOT EXISTS stock (
    StockID        INT AUTO_INCREMENT PRIMARY KEY,
    ItemCode       VARCHAR(30) NOT NULL UNIQUE,
    ItemName       VARCHAR(100) NOT NULL,
    CategoryID     INT,
    KaratID        INT,
    Weight         DECIMAL(10,3) NOT NULL DEFAULT 0,
    MakingCharges  DECIMAL(10,2) NOT NULL DEFAULT 0,
    Quantity       INT NOT NULL DEFAULT 1,
    CreatedDate    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CategoryID) REFERENCES categories(CategoryID),
    FOREIGN KEY (KaratID) REFERENCES karats(KaratID)
);

-- Default categories (edit/add more later from the Settings module)
INSERT INTO categories (CategoryName) VALUES
    ('Ring'), ('Necklace'), ('Bangle'), ('Earring'),
    ('Chain'), ('Bracelet'), ('Set'), ('Other')
ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName);

-- Default karat/purity settings (edit later from the Settings module)
INSERT INTO karats (KaratName, Purity) VALUES
    ('24K', 99.90), ('22K', 91.60), ('21K', 87.50),
    ('18K', 75.00), ('14K', 58.50)
ON DUPLICATE KEY UPDATE Purity = VALUES(Purity);
