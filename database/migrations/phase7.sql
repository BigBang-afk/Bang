-- ============================================================
-- ZARGHOON JEWELLERS - Phase 7 Migration
-- Homepage CMS + Gold Rate Management + Website Content
--
-- New tables (all IF NOT EXISTS, InnoDB, utf8mb4):
--   homepage_hero_slides  - the homepage hero slider (1..N slides)
--   homepage_features     - the "Why Zarghoon" benefit tiles
--   homepage_gallery      - manually-managed Instagram-style image tiles
--   newsletter_subscribers - newsletter sign-ups
--   homepage_sections     - which homepage sections render, and in what
--                           order (Part 25/26 - a single source of truth
--                           rather than 11 separate settings rows)
--
-- Also widens the existing messages.status ENUM to add 'archived'
-- (Part 23) - purely additive, exactly like Phase 6b's payment_method
-- widening: every value already stored remains valid.
--
-- This migration does not touch any existing row in any table. Several
-- new `settings` rows are inserted with INSERT IGNORE, so it is safe to
-- run even if some of those keys already exist (e.g. re-running this
-- file, or an admin having already configured a value by hand) - it
-- will never overwrite an existing setting.
--
-- HOW TO RUN:
--   mysql -u <db_user> -p zarghoon_jewellers < database/migrations/phase7.sql
-- Safe to run more than once.
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- homepage_hero_slides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homepage_hero_slides (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(200) NULL,
    description VARCHAR(400) NULL,
    image VARCHAR(255) NULL,
    button1_text VARCHAR(60) NULL,
    button1_url VARCHAR(255) NULL,
    button2_text VARCHAR(60) NULL,
    button2_url VARCHAR(255) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hero_slides_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- homepage_features ("Why Zarghoon")
-- `icon` stores a whitelisted keyword (e.g. "shield", "gem"), never raw
-- HTML/SVG - the admin form only offers a fixed <select> of known icons,
-- which the homepage template maps to an inline SVG. This keeps CMS
-- input to plain text/whitelisted values only, per Part 31.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homepage_features (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(300) NULL,
    icon VARCHAR(30) NOT NULL DEFAULT 'gem',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_homepage_features_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- homepage_gallery (manually-managed Instagram-style tiles - Part 11
-- explicitly forbids faking a live Instagram feed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homepage_gallery (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    image VARCHAR(255) NOT NULL,
    link VARCHAR(255) NULL,
    alt_text VARCHAR(150) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_homepage_gallery_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- newsletter_subscribers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    status ENUM('subscribed', 'unsubscribed') NOT NULL DEFAULT 'subscribed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- homepage_sections
-- Single source of truth for "does this homepage section render, and
-- in what order" (Parts 25/26) - one row per section, rather than 11
-- parallel settings rows plus a separate ordering table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homepage_sections (
    section_key VARCHAR(50) NOT NULL PRIMARY KEY,
    section_title VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO homepage_sections (section_key, section_title, sort_order, status) VALUES
('hero', 'Hero Slider', 1, 'active'),
('categories', 'Shop by Category', 2, 'active'),
('featured', 'Featured Collection', 3, 'active'),
('best_sellers', 'Best Sellers', 4, 'active'),
('collection', 'Collection Banner', 5, 'active'),
('new_arrivals', 'New Arrivals', 6, 'active'),
('features', 'Why Zarghoon', 7, 'active'),
('gold_rates', 'Today''s Gold Rate', 8, 'active'),
('about', 'About Section', 9, 'active'),
('instagram', 'Instagram Gallery', 10, 'active'),
('newsletter', 'Newsletter', 11, 'active');

-- ------------------------------------------------------------
-- messages.status: widen to add 'archived' (Part 23). Existing 'new',
-- 'read', 'replied' rows remain valid under the wider list.
-- ------------------------------------------------------------
ALTER TABLE messages
    MODIFY COLUMN status ENUM('new', 'read', 'replied', 'archived') NOT NULL DEFAULT 'new';

-- ------------------------------------------------------------
-- New settings rows (Parts 8, 10, 11, 19, 20, 30). INSERT IGNORE only -
-- never overwrites a value an admin may already have configured.
-- ------------------------------------------------------------
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('site_title', 'Zarghoon Jewellers - Fine Gold Jewellery'),
('meta_description', 'Fine gold jewellery crafted with trust - Zarghoon Jewellers, Liaquat Bazar, Sarafa Market, Quetta.'),
('og_image', ''),
('footer_description', 'Fine gold jewellery crafted with trust, from Liaquat Bazar, Sarafa Market, Quetta.'),
('copyright_text', 'All rights reserved.'),
('logo', ''),
('favicon', ''),
('tiktok', ''),
('gold_rate_ticker_enabled', '0'),
('gold_rate_notice', 'Rates are subject to market changes. Please confirm the final price with Zarghoon Jewellers.'),
('homepage_featured_count', '8'),
('homepage_best_sellers_count', '8'),
('homepage_new_arrivals_count', '8'),
('about_heading', 'Our Story'),
('about_description', 'For years, Zarghoon Jewellers has served Quetta''s Sarafa Market with a simple promise: authentic gold, honest pricing, and craftsmanship you can trust for every occasion.'),
('about_image', ''),
('about_button_text', 'Explore Our Collection'),
('about_button_url', '/shop.php'),
('collection_title', 'New Collection'),
('collection_subtitle', 'Modern Gold Collection'),
('collection_description', 'A blend of modern designs and timeless elegance.'),
('collection_image', ''),
('collection_button_text', 'Discover Collection'),
('collection_button_url', '/shop.php'),
('instagram_username', 'zarghoon_jewellers'),
('instagram_url', 'https://instagram.com/zarghoon_jewellers');
