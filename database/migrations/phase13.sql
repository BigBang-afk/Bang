-- Phase 13: Loyalty points, old gold exchange estimator, budget calculator
--
-- loyalty_points_log is an append-only ledger (same philosophy as
-- gold_rates and admin_activity_logs elsewhere in this project) - a
-- customer's point balance is always SUM(points) from this table, never
-- a separate mutable counter that could drift out of sync.

CREATE TABLE IF NOT EXISTS loyalty_points_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NULL,
    points INT NOT NULL,
    type ENUM('earned', 'redeemed', 'reversed') NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loyalty_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_loyalty_log_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_loyalty_log_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tracked as their own columns (separate from the existing per-item
-- `discount`) so a redemption is always auditable on the order itself,
-- not folded invisibly into a number that already means something else.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT UNSIGNED NOT NULL DEFAULT 0 AFTER discount,
    ADD COLUMN IF NOT EXISTS loyalty_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER loyalty_points_redeemed;

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('loyalty_enabled', '0'),
('loyalty_points_per_rupees', '1000'),
('loyalty_point_value', '10'),
('gold_exchange_deduction_percent', '0');
