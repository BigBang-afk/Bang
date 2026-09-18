-- ============================================================
-- ZARGHOON JEWELLERS - Phase 6 Migration
-- Cart + Checkout + Orders + Admin Order Management
--
-- This migration ONLY adds two new tables. It does not alter, drop, or
-- touch the existing orders/order_items tables or any data in them -
-- those tables (created in Phase 1) already have every column Phase 6
-- needs: order_number, customer_name, mobile, email, address, city,
-- notes, subtotal, discount, total, payment_method, order_status, and
-- (on order_items) the full historical snapshot fields (product_name,
-- sku, purity, net_weight, quantity, unit_price, total_price).
--
-- order_status_history: an append-only audit trail of every status
-- change (Pending -> Confirmed -> Processing -> ...), including who
-- made the change (changed_by, an admin id, NULL for the order's own
-- creation) and an optional note.
--
-- order_admin_notes: internal admin-only notes on an order. These are
-- never queried or displayed by any customer-facing page (order.php,
-- orders.php, order-success.php) - only admin/order-view.php reads
-- from this table.
--
-- HOW TO RUN:
--   mysql -u <db_user> -p zarghoon_jewellers < database/migrations/phase6.sql
-- or paste this file's contents into phpMyAdmin's SQL tab for the
-- zarghoon_jewellers database. Safe to run more than once - both
-- CREATE TABLE statements use IF NOT EXISTS and never modify existing
-- rows in any table.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS order_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    old_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by INT UNSIGNED NULL,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_status_history_admin FOREIGN KEY (changed_by) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_order_status_history_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_admin_notes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    admin_id INT UNSIGNED NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_admin_notes_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_admin_notes_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_order_admin_notes_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
