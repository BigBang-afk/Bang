-- =====================================================================
-- Zarghoon Jewelry Pro - Module 1
-- Creates the database and the users table used by the Login form.
-- Run this whole file in phpMyAdmin: SQL tab -> paste -> Go
-- =====================================================================

CREATE DATABASE IF NOT EXISTS zarghoon_jewelry
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE zarghoon_jewelry;

CREATE TABLE IF NOT EXISTS users (
    UserID        INT AUTO_INCREMENT PRIMARY KEY,
    Username      VARCHAR(50)  NOT NULL UNIQUE,
    PasswordHash  VARCHAR(64)  NOT NULL,      -- SHA-256 hash, always 64 hex characters
    FullName      VARCHAR(100) NOT NULL,
    Role          VARCHAR(20)  NOT NULL DEFAULT 'Admin',
    IsActive      TINYINT(1)   NOT NULL DEFAULT 1,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default admin login: username = admin , password = admin123
-- (PasswordHash below is the SHA-256 hash of "admin123")
INSERT INTO users (Username, PasswordHash, FullName, Role, IsActive)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Shop Administrator',
    'Admin',
    1
)
ON DUPLICATE KEY UPDATE Username = Username;
