-- ============================================================
-- ZARGHOON JEWELLERS - Database Schema (Phase 1)
-- Database name: zarghoon_jewellers
-- Charset: utf8mb4 (full Unicode support)
-- Engine: InnoDB (required for foreign keys)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- admins
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    last_login DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_admins_username (username),
    UNIQUE KEY uniq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- users (customers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_users_username (username),
    UNIQUE KEY uniq_users_mobile (mobile),
    INDEX idx_users_username (username),
    INDEX idx_users_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT NULL,
    image VARCHAR(255) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_categories_slug (slug),
    INDEX idx_categories_slug (slug),
    INDEX idx_categories_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- collections
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT NULL,
    image VARCHAR(255) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_collections_slug (slug),
    INDEX idx_collections_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    category_id INT UNSIGNED NULL,
    collection_id INT UNSIGNED NULL,
    description TEXT NULL,
    short_description VARCHAR(255) NULL,
    purity VARCHAR(10) NOT NULL DEFAULT '21K',
    gross_weight DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    net_weight DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    gold_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    making_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    stone_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    other_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    pricing_type ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
    stock_status ENUM('in_stock', 'out_of_stock', 'made_to_order') NOT NULL DEFAULT 'in_stock',
    featured TINYINT(1) NOT NULL DEFAULT 0,
    best_seller TINYINT(1) NOT NULL DEFAULT 0,
    new_arrival TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_products_sku (sku),
    UNIQUE KEY uniq_products_slug (slug),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_products_sku (sku),
    INDEX idx_products_slug (slug),
    INDEX idx_products_category_id (category_id),
    INDEX idx_products_collection_id (collection_id),
    INDEX idx_products_status (status),
    INDEX idx_products_featured (featured),
    INDEX idx_products_best_seller (best_seller),
    INDEX idx_products_new_arrival (new_arrival)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- product_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_product_images_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- gold_rates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gold_rates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purity ENUM('24K', '22K', '21K', '18K') NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gold_rates_purity (purity),
    INDEX idx_gold_rates_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- wishlists
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uniq_wishlists_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- orders
-- Note: user_id uses ON DELETE SET NULL (not CASCADE) so that deleting a
-- customer account can never silently destroy historical order records.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    order_number VARCHAR(30) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash_on_delivery', 'bank_transfer') NOT NULL DEFAULT 'cash_on_delivery',
    order_status ENUM('pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_orders_order_number (order_number),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_orders_order_number (order_number),
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_order_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- order_items
-- Note: product data is snapshotted (product_name, sku, purity, net_weight,
-- unit_price) at the time of purchase, and product_id uses ON DELETE SET NULL
-- so deleting a product later can never destroy historical order line items.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    purity VARCHAR(10) NOT NULL,
    net_weight DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_order_items_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- banners
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section VARCHAR(50) NOT NULL,
    title VARCHAR(150) NULL,
    subtitle VARCHAR(150) NULL,
    description TEXT NULL,
    button_text VARCHAR(60) NULL,
    button_url VARCHAR(255) NULL,
    image VARCHAR(255) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banners_section (section),
    INDEX idx_banners_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value MEDIUMTEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    subject VARCHAR(150) NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DEFAULT SETTINGS
-- Replace every CHANGE_ME value from Admin > Settings once Phase 2/3
-- of the admin panel is built (or update these rows directly for now).
-- ============================================================
INSERT INTO settings (setting_key, setting_value) VALUES
('shop_name', 'Zarghoon Jewellers'),
('tagline', 'Fine Jewellery'),
('currency', 'PKR'),
('currency_symbol', 'Rs.'),
('whatsapp_number', 'CHANGE_ME'),
('phone', 'CHANGE_ME'),
('email', 'CHANGE_ME'),
('address', 'Liaquat Bazar, Sarafa Market, Quetta, Pakistan'),
('instagram', 'zarghoon_jewellers'),
('facebook', ''),
('youtube', '');

-- ============================================================
-- DEFAULT GOLD RATES
-- *** THESE ARE DEMO / SAMPLE RATES ONLY. ***
-- They do NOT reflect real, current gold market prices. Replace them
-- with today's actual rates from Admin > Gold Rates before going live,
-- and update them daily.
-- ============================================================
INSERT INTO gold_rates (purity, rate, effective_date) VALUES
('24K', 28500.00, CURDATE()), -- DEMO RATE, NOT REAL
('21K', 24937.50, CURDATE()), -- DEMO RATE, NOT REAL
('18K', 21375.00, CURDATE()); -- DEMO RATE, NOT REAL

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================
INSERT INTO categories (name, slug, description, status, sort_order) VALUES
('Rings', 'rings', 'Elegant gold rings for every occasion.', 'active', 1),
('Necklaces', 'necklaces', 'Statement necklaces crafted in fine gold.', 'active', 2),
('Earrings', 'earrings', 'Timeless earrings from studs to danglers.', 'active', 3),
('Bracelets', 'bracelets', 'Delicate bracelets for daily elegance.', 'active', 4),
('Bangles', 'bangles', 'Traditional and modern gold bangles.', 'active', 5),
('Chains', 'chains', 'Fine gold chains in classic designs.', 'active', 6),
('Pendants', 'pendants', 'Beautifully crafted gold pendants.', 'active', 7),
('Bridal Collection', 'bridal-collection', 'Exquisite sets for your special day.', 'active', 8),
('Men''s Collection', 'mens-collection', 'Refined gold jewellery for men.', 'active', 9),
('Kids Collection', 'kids-collection', 'Delicate, safe designs for children.', 'active', 10);

-- ============================================================
-- NO DEFAULT ADMIN ACCOUNT (Phase 10)
-- Earlier phases shipped a seeded admin account with a fixed, documented
-- password. That is a real security risk on any production install that
-- imports this file as-is - the plaintext password sat in a committed
-- file - so it has been removed rather than "fixed" with a new fixed
-- password (which would only recreate the same problem). This file now
-- creates ZERO admin accounts. Run setup-admin.php once, immediately
-- after importing this schema, to create the first real administrator
-- account - then delete setup-admin.php. See DEPLOYMENT.md.
-- ============================================================
