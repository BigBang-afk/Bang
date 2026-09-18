-- ============================================================
-- ZARGHOON JEWELLERS - Phase 4 Migration
-- Customer authentication + account system
--
-- This migration ONLY adds a new table. It does not alter, drop, or
-- touch any existing table or data - the `users` table already has
-- every column Phase 4 needs (username, mobile, email, password,
-- full_name, status, created_at), so no ALTER TABLE is required there.
--
-- password_resets stores the secure password-reset token architecture
-- described in includes/auth.php (createPasswordResetToken() /
-- findValidPasswordResetToken() / markPasswordResetTokenUsed()):
--   - token_hash stores only a SHA-256 hash of the reset token, never
--     the raw token, so a database leak alone can never be used to
--     reset a password.
--   - expires_at enforces a time limit (see PASSWORD_RESET_EXPIRY in
--     config/config.php).
--   - used_at enforces single-use tokens (NULL = still unused).
--
-- HOW TO RUN:
--   mysql -u <db_user> -p zarghoon_jewellers < database/migrations/phase4.sql
-- or paste this file's contents into phpMyAdmin's SQL tab for the
-- zarghoon_jewellers database. Safe to run more than once - it only
-- creates the table if it does not already exist and never modifies
-- existing rows in any table.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uniq_password_resets_token_hash (token_hash),
    INDEX idx_password_resets_user_id (user_id),
    INDEX idx_password_resets_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
