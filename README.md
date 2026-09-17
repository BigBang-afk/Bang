# Zarghoon Jewellers - Fine Jewellery E-Commerce Website

A complete, production-ready jewelry e-commerce website built with **PHP 8+, MySQL, HTML5, CSS3 and vanilla JavaScript** (Bootstrap-free, no frameworks). Built for **Zarghoon Jewellers**, Liaquat Bazar, Sarafa Market, Quetta, Pakistan.

---

## 1. What's Included

- Full customer storefront: homepage, shop, categories, collections, product pages, search & filters, cart, checkout, wishlist, order history, customer accounts.
- Full admin panel: dashboard, products (multi-image upload), categories, collections, gold rate management with **live auto-pricing**, orders (with printable A4 invoices), customers, messages/enquiries, homepage & banner content management, site settings.
- Gold pricing engine: `Final Price = (Net Weight x Gold Rate) + Making + Stone + Other Charges - Discount`, recalculated live whenever the admin updates gold rates (for products in "Automatic" pricing mode), or manually overridden per product.
- WhatsApp enquiry buttons throughout the site (product cards, product page, cart), using a WhatsApp number configurable from Admin Settings.
- Security: PDO prepared statements everywhere, CSRF tokens on every form, `password_hash()`/`password_verify()`, secure session cookies, upload MIME/size/content validation, PHP execution disabled inside `/uploads`, output escaping, ownership checks on orders/wishlist/cart.
- SEO: per-product SEO title/description/OG image, dynamic `sitemap.xml`, dynamic `robots.txt`, JSON-LD structured data (Product + JewelryStore schema), optional clean URLs via `.htaccess`.
- Demo data: 1 admin, 5 customers, 10 categories, 15 products, 3 collections, gold rates, homepage banners, and settings - all editable/removable from the admin panel.

---

## 2. Requirements

- PHP 8.0+ with the `pdo_mysql`, `gd` or `fileinfo`, and `mbstring` extensions (standard on virtually all cPanel hosting).
- MySQL 5.7+ or MariaDB 10.3+.
- Apache with `mod_rewrite` and `.htaccess` support (standard on cPanel).

---

## 3. Local / Server Installation

1. **Upload the files** to your server (e.g. `public_html/` on cPanel), or clone this repository there.
2. **Create a MySQL database** and a database user with full privileges on it (via cPanel "MySQL Databases").
3. **Import the schema + demo data**:
   ```bash
   mysql -u YOUR_DB_USER -p YOUR_DB_NAME < database.sql
   ```
   Or in phpMyAdmin: Import > choose `database.sql` > Go.
4. **Configure the database connection.** Open `config/config.php` and either:
   - Edit the `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `APP_BASE_URL` constants directly, **or**
   - Set them as environment variables on your host (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_BASE_URL`) - the config file reads these automatically and falls back to the hardcoded defaults if unset.
   - Set `APP_BASE_URL` to your live domain, e.g. `https://zarghoonjewellers.com` (no trailing slash).
5. **Set folder permissions** so PHP can write uploaded images:
   ```bash
   chmod -R 755 uploads/
   ```
6. **Set `APP_DEBUG` to `false`** in `config/config.php` before going live (it already defaults to `false`).
7. Visit your site's homepage - it should load with the demo catalog.

### cPanel-Specific Notes

- Upload files via File Manager or FTP into `public_html` (or a subdomain's document root).
- Use cPanel's "MySQL Databases" tool to create the database and user, then phpMyAdmin to import `database.sql`.
- cPanel PHP is usually already configured with the required extensions; if uploads fail, check `upload_max_filesize` and `post_max_size` in the "Select PHP Version" > "Options" screen (4MB+ recommended).
- `.htaccess` is already included and works out of the box on Apache-based cPanel hosting.

---

## 4. Admin Login Setup

**Default credentials (from the demo seed data):**
- URL: `https://yourdomain.com/admin/login.php`
- Username: `admin`
- Password: `Admin@12345`

### ⚠️ Change this password immediately after your first login:
1. Log in to the admin panel.
2. Go to **Settings** (bottom of the sidebar).
3. Scroll to **"Change My Password"**, enter the current password and your new password.

Alternatively, to set a fresh password directly in the database before going live, generate a new bcrypt hash with PHP:
```bash
php -r "echo password_hash('YourNewStrongPassword', PASSWORD_DEFAULT);"
```
Then update it in the `admins` table (`username = 'admin'`), or simply delete the demo row and insert your own admin account with that hash.

**Admin registration is intentionally not exposed publicly** - new admin accounts must be added directly in the database by whoever controls it.

---

## 5. Day-to-Day Usage Guide

### Adding a Category
Admin > Categories > **+ Add Category** - set name, description, sort order, status, and upload an image (JPG/PNG/WEBP, max 4MB).

### Adding a Product
Admin > Products > **+ Add Product**:
1. Fill in name, SKU (auto-generated, editable), category, collection (optional).
2. Enter purity, gross/net weight.
3. Choose **Pricing Mode**:
   - **Automatic**: price is calculated live from `Net Weight x current Gold Rate + Making + Stone + Other - Discount`. It updates automatically whenever you change the gold rate in Admin > Gold Rates - no need to re-save the product.
   - **Manual**: you set the final price yourself; it never changes automatically.
4. Mark Featured / Best Seller / New Arrival to control homepage placement.
5. Save, then upload one or more images on the edit screen - the first image (or the one you mark) becomes the main image shown on cards.

### Updating Gold Rates
Admin > Gold Rates - enter today's rate per gram for 24K/22K/21K/18K and click **Update Rates**. A full history is kept below. All products using **Automatic** pricing re-price instantly across the entire site.

### Changing Homepage Banners & Content
Admin > Homepage & Banners:
- **Hero Banner**: headline, subtitle, description, button, and hero image.
- **Luxury Collection Banner**: the large black banner section.
- **Instagram Grid**: add/remove the images shown in "Follow Zarghoon Jewellers".

Admin > Settings > "Homepage Content" also controls the About section text/image, the 3 trust badges under the hero, and the 4 "Why Zarghoon" cards.

### Changing the WhatsApp Number
Admin > Settings > General Settings > **WhatsApp Number** - enter digits only with country code (e.g. `923001234567` for a Pakistani `0300...` number). This number is used by every WhatsApp button site-wide (product cards, product pages, cart, footer, floating button).

### Managing Orders
Admin > Orders - view, filter, and open any order to update its status (Pending → Confirmed → Processing → Ready → Completed, or Cancelled) and print an A4 invoice.

---

## 6. Database Overview

See `database.sql` for full definitions. Key tables: `admins`, `users` (customers), `categories`, `collections`, `products`, `product_images`, `gold_rates` (history), `wishlists`, `cart_items`, `orders`, `order_items`, `banners`, `settings` (key/value site content), `messages` (enquiries), `activity_log`.

---

## 7. Security Checklist

- [x] All database queries use PDO prepared statements (no string-concatenated SQL).
- [x] CSRF tokens required and verified on every state-changing form/AJAX POST.
- [x] Passwords hashed with `password_hash()` / verified with `password_verify()` - never stored in plain text.
- [x] Secure session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` when served over HTTPS.
- [x] Session ID regenerated on every login (admin and customer) to prevent session fixation.
- [x] Basic login throttling (temporary lockout after repeated failed attempts) for both admin and customer login.
- [x] File uploads validated by real MIME sniffing (`finfo`) and `getimagesize()`, not by filename/extension alone; random filenames prevent overwrite/path traversal; `/uploads/.htaccess` disables PHP execution in the upload directory.
- [x] All output escaped with `htmlspecialchars()` via the `e()` helper.
- [x] Authorization checks: customers can only view/modify their own cart, wishlist, and orders; all `/admin` pages require an authenticated admin session.
- [x] Admin registration is not publicly exposed.
- [x] `APP_DEBUG` should be `false` in production so database/PHP errors are never shown to visitors.

**Before going fully live**, also:
- [ ] Change the default admin password (see Section 4).
- [ ] Remove or change the 5 demo customer accounts if not needed.
- [ ] Serve the site over HTTPS (required for secure cookies to work as intended).
- [ ] Set real gold rates, categories, products, and homepage content (replace all Unsplash placeholder images).
- [ ] Review PHP's `upload_max_filesize`/`post_max_size` on your host.

---

## 8. Testing Checklist

**Storefront**
- [ ] Homepage loads with hero, categories, best sellers, collection banner, new arrivals, why-us, about, and Instagram sections.
- [ ] Shop/category/search pages filter correctly by category, purity, availability, and price; pagination works.
- [ ] Product page shows correct price, gallery, WhatsApp enquiry link (with product name/SKU/price), and related products.
- [ ] Add to cart (as guest and as logged-in customer), update quantity, remove item.
- [ ] Checkout creates an order and clears the cart; guest and logged-in checkout both work.
- [ ] Wishlist add/remove (requires login) and "move to cart" work.
- [ ] Register, login (by username or mobile), logout, and profile/password update all work.
- [ ] Contact form submits and appears in Admin > Messages.

**Admin**
- [ ] Admin login works; wrong password is rejected; 5 failed attempts trigger a temporary lockout.
- [ ] Create/edit/delete a category and a collection, including image upload.
- [ ] Create/edit a product, upload multiple images, set a different main image, delete an image.
- [ ] Toggle a product between Automatic and Manual pricing and confirm the price recalculates correctly.
- [ ] Update a gold rate and confirm affected product prices change on the storefront immediately.
- [ ] View and update an order's status; print its invoice.
- [ ] View a customer's profile and order history; toggle their active/inactive status.
- [ ] Update homepage banners/content and confirm the homepage reflects the change.
- [ ] Change the WhatsApp number and confirm WhatsApp links site-wide update.
- [ ] Change the admin password and confirm re-login with the new password.

---

## 9. Notes & Scope

- The **Journal** page is intentionally static editorial content (not database-backed), since a blog/CMS was outside the requested database schema. It can be edited directly in `journal.php`.
- Demo product/category/banner images are placeholder Unsplash URLs, clearly meant to be replaced - upload your own real photography from the relevant Admin screens (Products, Categories, Collections, Banners, Settings).
- Clean URLs (e.g. `/product/some-slug`) are available via the included `.htaccess` rewrite rules; all pages also work with their plain `?slug=` query-string form, which is what internal links use for maximum host compatibility.
