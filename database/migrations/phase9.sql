-- Phase 9: SEO + Performance + Security Audit + Production Hardening
--
-- Adds admin_activity_logs, an append-only audit trail of admin actions
-- (product/category/collection/gold-rate/order/settings changes, admin
-- login attempts). Never stores passwords, CSRF tokens, or any other
-- sensitive auth data - only a short human-readable description of what
-- changed. admin_id is nullable and ON DELETE SET NULL so a log entry
-- survives even if the admin account that created it is later removed.

CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id INT UNSIGNED NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_activity_admin (admin_id),
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
