-- ============================================================
-- ZARGHOON JEWELLERS - Phase 6b Migration
-- Expanded payment methods (Cart/Checkout/Orders follow-up)
--
-- Phase 1 already created orders.payment_method as an ENUM with only
-- 'cash_on_delivery' and 'bank_transfer', and orders.user_id was
-- already NULLable (ON DELETE SET NULL) - so guest checkout needs NO
-- schema change at all. The only schema change this follow-up requires
-- is widening the payment_method ENUM to include the two additional
-- methods the expanded Phase 6 spec asks for: Store Pickup and Pay at
-- Store.
--
-- This does not touch any existing row: MODIFY COLUMN on a MySQL ENUM
-- only changes the set of allowed values going forward, and every
-- value already stored ('cash_on_delivery' / 'bank_transfer') remains
-- valid under the new, wider list.
--
-- HOW TO RUN:
--   mysql -u <db_user> -p zarghoon_jewellers < database/migrations/phase6b.sql
-- Safe to run more than once.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE orders
    MODIFY COLUMN payment_method ENUM('cash_on_delivery', 'bank_transfer', 'store_pickup', 'pay_at_store')
        NOT NULL DEFAULT 'cash_on_delivery';
