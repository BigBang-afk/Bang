-- ============================================================
-- ZARGHOON JEWELLERS - Database Schema + Demo Data
-- MySQL 5.7+ / MariaDB 10.3+
--
-- Import via cPanel phpMyAdmin, or:
--   mysql -u USER -p DBNAME < database.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- admins
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('super_admin','admin') NOT NULL DEFAULT 'admin',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- users (customers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    image VARCHAR(255) NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_status (status),
    INDEX idx_categories_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- collections
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    image VARCHAR(255) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collections_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
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
    price_mode ENUM('auto','manual') NOT NULL DEFAULT 'auto',
    stock_status ENUM('in_stock','out_of_stock','made_to_order') NOT NULL DEFAULT 'in_stock',
    featured TINYINT(1) NOT NULL DEFAULT 0,
    best_seller TINYINT(1) NOT NULL DEFAULT 0,
    new_arrival TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    seo_title VARCHAR(180) NULL,
    seo_description VARCHAR(255) NULL,
    og_image VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
    INDEX idx_products_status (status),
    INDEX idx_products_category (category_id),
    INDEX idx_products_collection (collection_id),
    INDEX idx_products_featured (featured),
    INDEX idx_products_best_seller (best_seller),
    INDEX idx_products_new_arrival (new_arrival),
    INDEX idx_products_created (created_at),
    FULLTEXT INDEX ft_products_search (name, sku, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- product_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_main TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_images_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- gold_rates (history; latest row per karat = current rate)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gold_rates (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    karat ENUM('24K','22K','21K','18K') NOT NULL,
    rate_per_gram DECIMAL(12,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gold_rates_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_gold_rates_karat (karat),
    INDEX idx_gold_rates_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- wishlists
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_wishlist (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- cart_items (persistent cart for logged-in customers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_cart_item (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    user_id INT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- order_items (snapshot pricing at time of order)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    purity VARCHAR(10) NOT NULL,
    net_weight DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    gold_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- banners (hero, luxury collection banner, instagram grid)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type ENUM('hero','collection','instagram') NOT NULL,
    title VARCHAR(150) NULL,
    subtitle VARCHAR(150) NULL,
    description TEXT NULL,
    image VARCHAR(255) NULL,
    button_text VARCHAR(60) NULL,
    button_url VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banners_type (type),
    INDEX idx_banners_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- settings (key/value store for shop-wide + homepage text content)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value MEDIUMTEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- messages (contact form + product enquiries)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(20) NULL,
    subject VARCHAR(150) NULL,
    message TEXT NOT NULL,
    product_id INT UNSIGNED NULL,
    status ENUM('new','read','replied') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_messages_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- activity_log (admin dashboard "recent activity" feed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DEMO / SEED DATA
-- ============================================================

-- ---- Admin account ----------------------------------------
-- Username: admin   Password: Admin@12345
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN (see admin/settings.php "Change Password").
INSERT INTO admins (username, password_hash, name, role, status) VALUES
('admin', '$2y$12$VN2d/G3J28n3FHpmjdLYTeCwVcC7TZ5.j7/TL2VqE584Ls.ck.Gsi', 'Store Administrator', 'super_admin', 'active');

-- ---- Demo customers ------------------------------------------
-- All demo customers share password: Customer@123 (for testing only - change/remove in production)
INSERT INTO users (username, mobile, email, password_hash, status) VALUES
('ahmed.khan', '03001234567', 'ahmed.khan@example.com', '$2y$12$/JYXo.j7n/ZJQVtPeLufRucDYD7Wmpyi87uMeyP.olV8RosgEopYC', 'active'),
('sara.baloch', '03011234567', 'sara.baloch@example.com', '$2y$12$/JYXo.j7n/ZJQVtPeLufRucDYD7Wmpyi87uMeyP.olV8RosgEopYC', 'active'),
('bilal.raisani', '03021234567', NULL, '$2y$12$/JYXo.j7n/ZJQVtPeLufRucDYD7Wmpyi87uMeyP.olV8RosgEopYC', 'active'),
('ayesha.tareen', '03031234567', 'ayesha.tareen@example.com', '$2y$12$/JYXo.j7n/ZJQVtPeLufRucDYD7Wmpyi87uMeyP.olV8RosgEopYC', 'active'),
('usman.marri', '03041234567', NULL, '$2y$12$/JYXo.j7n/ZJQVtPeLufRucDYD7Wmpyi87uMeyP.olV8RosgEopYC', 'active');

-- ---- Categories (images are placeholders - replace in Admin > Categories) ----
INSERT INTO categories (name, slug, image, description, sort_order, status) VALUES
('Rings', 'rings', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', 'Elegant gold rings for every occasion.', 1, 'active'),
('Necklaces', 'necklaces', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80', 'Statement necklaces crafted in fine gold.', 2, 'active'),
('Earrings', 'earrings', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', 'Timeless earrings from studs to danglers.', 3, 'active'),
('Bracelets', 'bracelets', 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80', 'Delicate bracelets for daily elegance.', 4, 'active'),
('Bangles', 'bangles', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80', 'Traditional and modern gold bangles.', 5, 'active'),
('Chains', 'chains', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80', 'Fine gold chains in classic designs.', 6, 'active'),
('Pendants', 'pendants', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80', 'Beautifully crafted gold pendants.', 7, 'active'),
('Bridal Collection', 'bridal-collection', 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=800&q=80', 'Exquisite sets for your special day.', 8, 'active'),
('Men''s Collection', 'mens-collection', 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=800&q=80', 'Refined gold jewellery for men.', 9, 'active'),
('Kids Collection', 'kids-collection', 'https://images.unsplash.com/photo-1602751584547-51a51191ec0e?w=800&q=80', 'Delicate, safe designs for children.', 10, 'active');

-- ---- Collections ----
INSERT INTO collections (name, slug, description, image, status, sort_order) VALUES
('Modern Gold Collection', 'modern-gold-collection', 'A blend of modern designs and timeless elegance for every occasion.', 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=1200&q=80', 'active', 1),
('Heritage Collection', 'heritage-collection', 'Traditional craftsmanship rooted in Balochi and South Asian heritage.', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1200&q=80', 'active', 2),
('Bridal Radiance', 'bridal-radiance', 'Complete bridal sets designed to make your day unforgettable.', 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=1200&q=80', 'active', 3);

-- ---- Gold rates (PKR per gram) ----
INSERT INTO gold_rates (karat, rate_per_gram, effective_date, created_by) VALUES
('24K', 28500.00, CURDATE(), 1),
('22K', 26125.00, CURDATE(), 1),
('21K', 24937.50, CURDATE(), 1),
('18K', 21375.00, CURDATE(), 1);

-- ---- Products (15 demo products; images are Unsplash placeholders - replace via Admin > Products) ----
-- Pricing follows: price = (net_weight * gold_rate) + making_charges + stone_charges + other_charges - discount
INSERT INTO products
(sku, name, slug, category_id, collection_id, description, short_description, purity, gross_weight, net_weight, gold_rate, making_charges, stone_charges, other_charges, discount, price, price_mode, stock_status, featured, best_seller, new_arrival, status, seo_title, seo_description) VALUES
('ZJ-RG-001','Classic Gold Pendant','classic-gold-pendant',7,1,'A timeless pendant handcrafted in 21K gold with a polished finish, perfect for everyday elegance or gifting.','Timeless polished gold pendant.','21K',4.500,4.250,24937.50,8000.00,0.00,1500.00,0.00,115484.00,'auto','in_stock',1,1,0,'active','Classic Gold Pendant - Zarghoon Jewellers','Shop the Classic Gold Pendant in 21K gold, handcrafted by Zarghoon Jewellers, Quetta.'),
('ZJ-RG-002','Royal Halo Ring','royal-halo-ring',1,1,'An elegant halo-style ring in radiant 21K gold, designed to catch the light from every angle.','Elegant halo-style statement ring.','21K',5.200,4.900,24937.50,10000.00,3000.00,1000.00,0.00,136194.00,'auto','in_stock',1,0,1,'active','Royal Halo Ring - Zarghoon Jewellers','Discover the Royal Halo Ring, a radiant 21K gold ring from Zarghoon Jewellers.'),
('ZJ-NK-001','Layla Chain Necklace','layla-chain-necklace',2,1,'A graceful layered chain necklace in 21K gold, versatile enough for daywear and evening occasions alike.','Graceful layered chain necklace.','21K',12.000,11.400,24937.50,18000.00,0.00,2000.00,0.00,304288.00,'auto','in_stock',1,1,1,'active','Layla Chain Necklace - Zarghoon Jewellers','Layla Chain Necklace in fine 21K gold, crafted by Zarghoon Jewellers.'),
('ZJ-ER-001','Aurora Drop Earrings','aurora-drop-earrings',3,2,'Delicate drop earrings finished in 18K gold with a subtle shimmer, ideal for both casual and formal wear.','Delicate 18K gold drop earrings.','18K',3.800,3.500,21375.00,7000.00,2000.00,500.00,0.00,84312.00,'auto','in_stock',0,1,0,'active','Aurora Drop Earrings - Zarghoon Jewellers','Aurora Drop Earrings in 18K gold, available at Zarghoon Jewellers Quetta.'),
('ZJ-BR-001','Meherban Tennis Bracelet','meherban-tennis-bracelet',4,2,'A refined tennis bracelet in 21K gold designed for understated luxury and daily wear.','Refined 21K gold tennis bracelet.','21K',6.500,6.100,24937.50,12000.00,0.00,1000.00,0.00,165119.00,'auto','in_stock',0,0,1,'active','Meherban Tennis Bracelet - Zarghoon Jewellers','Meherban Tennis Bracelet, a refined 21K gold piece from Zarghoon Jewellers.'),
('ZJ-BN-001','Sarafa Heritage Bangle','sarafa-heritage-bangle',5,2,'Inspired by traditional Sarafa Market craftsmanship, this bangle pairs bold form with fine 22K gold.','Traditional 22K gold bangle.','22K',15.000,14.200,26125.00,20000.00,0.00,2500.00,0.00,393575.00,'auto','in_stock',1,1,0,'active','Sarafa Heritage Bangle - Zarghoon Jewellers','Sarafa Heritage Bangle in 22K gold, a tribute to Quetta''s Sarafa Market craftsmanship.'),
('ZJ-CH-001','Everline Rope Chain','everline-rope-chain',6,1,'A durable and stylish rope-pattern chain in 21K gold, suitable for pendants or standalone wear.','Stylish 21K gold rope chain.','21K',9.000,8.500,24937.50,14000.00,0.00,1500.00,0.00,227469.00,'auto','in_stock',0,0,1,'active','Everline Rope Chain - Zarghoon Jewellers','Everline Rope Chain in 21K gold, available at Zarghoon Jewellers.'),
('ZJ-PD-001','Nasreen Filigree Pendant','nasreen-filigree-pendant',7,2,'Intricate filigree work defines this 21K gold pendant, a nod to fine traditional artistry.','Intricate 21K gold filigree pendant.','21K',5.000,4.700,24937.50,11000.00,0.00,1000.00,0.00,129205.00,'auto','in_stock',0,1,0,'active','Nasreen Filigree Pendant - Zarghoon Jewellers','Nasreen Filigree Pendant, intricate 21K gold artistry from Zarghoon Jewellers.'),
('ZJ-BD-001','Zainab Bridal Set','zainab-bridal-set',8,3,'A complete bridal set including necklace, earrings and tikka, crafted in 22K gold with elaborate detailing.','Complete 22K gold bridal set.','22K',45.000,42.500,26125.00,60000.00,15000.00,5000.00,10000.00,1180312.50,'auto','in_stock',1,1,1,'active','Zainab Bridal Set - Zarghoon Jewellers','Zainab Bridal Set, a complete 22K gold bridal ensemble from Zarghoon Jewellers.'),
('ZJ-BD-002','Farah Bridal Necklace Set','farah-bridal-necklace-set',8,3,'An opulent bridal necklace set in 22K gold with matching earrings, designed for grand occasions.','Opulent 22K gold bridal necklace set.','22K',38.000,36.000,26125.00,50000.00,12000.00,4000.00,5000.00,1001500.00,'auto','in_stock',1,0,0,'active','Farah Bridal Necklace Set - Zarghoon Jewellers','Farah Bridal Necklace Set in 22K gold, from Zarghoon Jewellers bridal collection.'),
('ZJ-MN-001','Sikandar Signet Ring','sikandar-signet-ring',9,1,'A bold signet ring in 21K gold designed for the modern man, combining heritage style with contemporary lines.','Bold 21K gold men''s signet ring.','21K',8.000,7.600,24937.50,13000.00,0.00,1500.00,0.00,204525.00,'auto','in_stock',0,1,0,'active','Sikandar Signet Ring - Zarghoon Jewellers','Sikandar Signet Ring, a bold 21K gold piece for men from Zarghoon Jewellers.'),
('ZJ-MN-002','Jahangir Gold Chain','jahangir-gold-chain',9,NULL,'A substantial curb-link chain in 21K gold, a classic choice for men''s everyday and formal wear.','Substantial 21K gold curb chain.','21K',20.000,19.000,24937.50,22000.00,0.00,2000.00,0.00,497812.50,'auto','in_stock',0,0,1,'active','Jahangir Gold Chain - Zarghoon Jewellers','Jahangir Gold Chain, a substantial 21K gold curb-link chain for men.'),
('ZJ-KD-001','Little Star Kids Earrings','little-star-kids-earrings',10,NULL,'Lightweight, child-safe stud earrings in 18K gold with rounded edges for comfort.','Lightweight 18K gold kids'' studs.','18K',1.200,1.100,21375.00,3000.00,500.00,300.00,0.00,26312.50,'auto','in_stock',0,0,1,'active','Little Star Kids Earrings - Zarghoon Jewellers','Little Star Kids Earrings in 18K gold, safe and lightweight for children.'),
('ZJ-KD-002','Baby Bangle Set','baby-bangle-set',10,NULL,'A pair of delicate 18K gold bangles sized for infants and toddlers, a cherished traditional gift.','Delicate 18K gold baby bangle pair.','18K',3.000,2.800,21375.00,6000.00,0.00,500.00,0.00,66350.00,'auto','in_stock',0,0,0,'active','Baby Bangle Set - Zarghoon Jewellers','Baby Bangle Set in 18K gold, a cherished traditional gift from Zarghoon Jewellers.'),
('ZJ-EC-001','Anmol Statement Necklace','anmol-statement-necklace',2,2,'A bold statement necklace in 22K gold featuring layered chains and a central medallion.','Bold 22K gold statement necklace.','22K',25.000,23.500,26125.00,32000.00,8000.00,3000.00,0.00,657937.50,'manual','made_to_order',1,0,1,'active','Anmol Statement Necklace - Zarghoon Jewellers','Anmol Statement Necklace, a bold 22K gold piece made to order at Zarghoon Jewellers.');

-- ---- Product images (first image per product = main) ----
INSERT INTO product_images (product_id, image_path, is_main, sort_order) VALUES
(1,'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1000&q=80',1,1),
(2,'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1000&q=80',1,1),
(3,'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80',1,1),
(4,'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&q=80',1,1),
(5,'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1000&q=80',1,1),
(6,'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1000&q=80',1,1),
(7,'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1000&q=80',1,1),
(8,'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1000&q=80',1,1),
(9,'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=1000&q=80',1,1),
(10,'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=1000&q=80',1,1),
(11,'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=1000&q=80',1,1),
(12,'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1000&q=80',1,1),
(13,'https://images.unsplash.com/photo-1602751584547-51a51191ec0e?w=1000&q=80',1,1),
(14,'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1000&q=80',1,1),
(15,'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80',1,1);

-- ---- Homepage banners ----
INSERT INTO banners (type, title, subtitle, description, image, button_text, button_url, sort_order, status) VALUES
('hero', 'Crafted to Shine Forever', 'TIMELESS ELEGANCE', 'Discover exquisite gold jewellery crafted to celebrate life''s most precious moments.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80', 'Shop Collection', 'shop.php', 1, 'active'),
('collection', 'Modern Gold Collection', 'NEW COLLECTION', 'A blend of modern designs and timeless elegance for every occasion.', 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=1600&q=80', 'Discover Collection', 'collections.php?slug=modern-gold-collection', 1, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80', NULL, NULL, 1, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80', NULL, NULL, 2, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80', NULL, NULL, 3, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&q=80', NULL, NULL, 4, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80', NULL, NULL, 5, 'active'),
('instagram', NULL, NULL, NULL, 'https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=500&q=80', NULL, NULL, 6, 'active');

-- ---- Settings (shop info + homepage text content, editable from Admin) ----
INSERT INTO settings (setting_key, setting_value) VALUES
('shop_name', 'Zarghoon Jewellers'),
('shop_tagline', 'Fine Jewellery'),
('logo', ''),
('favicon', ''),
('address', 'Liaquat Bazar, Sarafa Market, Quetta, Pakistan'),
('phone', '+92 300 1234567'),
('whatsapp_number', '923001234567'),
('email', 'info@zarghoonjewellers.com'),
('instagram_url', 'https://instagram.com/zarghoon_jewellers'),
('instagram_username', 'zarghoon_jewellers'),
('facebook_url', 'https://facebook.com/zarghoonjewellers'),
('youtube_url', ''),
('currency_symbol', 'Rs.'),
('shipping_info', 'We offer secure, insured delivery across Pakistan. Orders are carefully packaged and typically dispatched within 2-3 business days after confirmation.'),
('return_policy', 'Items may be returned within 7 days of delivery in original, unused condition with all packaging and certification intact. Custom and made-to-order pieces are non-returnable. Please contact us before initiating a return.'),
('about_title', 'A Trusted Name in Fine Jewellery'),
('about_subtitle', 'OUR STORY'),
('about_text', 'Zarghoon Jewellers is a fine jewellery house based in the historic Sarafa Market of Liaquat Bazar, Quetta - a marketplace long known for skilled goldsmiths and trusted trade. We bring together traditional craftsmanship and contemporary design to create pieces meant to be treasured for generations. Every item we offer reflects our commitment to authenticity, quality, and honest service to our customers. (Edit this text anytime from Admin > Settings.)'),
('about_image', 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=1000&q=80'),
('trust_badges', '[{"title":"Authentic Gold","description":"Quality you can trust"},{"title":"Exceptional Craftsmanship","description":"Made with precision"},{"title":"Dedicated Support","description":"Personal customer service"}]'),
('why_zarghoon', '[{"title":"Authentic Gold","description":"Every piece is verified for purity and authenticity."},{"title":"Exceptional Craftsmanship","description":"Handcrafted by skilled artisans with decades of experience."},{"title":"Secure Shopping","description":"Your data and transactions are protected at every step."},{"title":"Dedicated Support","description":"Our team is here to help before and after your purchase."}]'),
('pricing_formula_note', 'Final Price = (Net Weight x Gold Rate) + Making Charges + Stone Charges + Other Charges - Discount'),
('meta_description', 'Zarghoon Jewellers - Fine gold jewellery handcrafted in Quetta. Rings, necklaces, earrings, bangles, bridal sets and more.'),
('og_image', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80');

-- ---- Sample contact messages ----
INSERT INTO messages (name, email, phone, subject, message, status) VALUES
('Imran Khan', 'imran@example.com', '03005551234', 'Custom Ring Enquiry', 'Hello, I would like a custom-made engagement ring in 21K gold. Please advise on pricing and timeline.', 'new'),
('Fatima Noor', 'fatima@example.com', '03015552345', 'Bridal Set Availability', 'Is the Zainab Bridal Set available in a smaller weight? Please share options.', 'read');
