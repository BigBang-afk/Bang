<?php
/**
 * Zarghoon Jewellers - Core Reusable Functions
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/whatsapp.php';

// ---------------------------------------------------------------
// Input / output safety
// ---------------------------------------------------------------

/**
 * General-purpose input sanitizer: trims whitespace and strips tags.
 * This is a defensive cleanup for stored/processed data - it does NOT
 * replace output escaping. Always still use e()/htmlspecialchars()
 * when printing any value into HTML.
 */
function sanitize($data)
{
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return trim(strip_tags((string) $data));
}

/**
 * Escapes a value for safe output inside HTML. Use this around every
 * variable printed into a page to prevent XSS.
 */
function e($value): string
{
    if (is_array($value)) {
        return '';
    }
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
}

// Note: redirect() lives in auth.php (required above) so that file can
// remain self-sufficient even when included on its own.

// ---------------------------------------------------------------
// Old input + flash messages (for repopulating forms / one-time
// notices after a redirect)
// ---------------------------------------------------------------

/**
 * Stores the current $_POST data in the session so it can be
 * repopulated into a form after a validation-failure redirect.
 * Call this right before redirect() when a form fails validation.
 */
function setOldInput(array $input): void
{
    $_SESSION['old_input'] = $input;
}

/**
 * Retrieves a single previously-submitted form value (set via
 * setOldInput()) after a redirect, then clears it. Returns $default
 * if no old input exists for that key.
 */
function old(string $key, string $default = ''): string
{
    $value = $_SESSION['old_input'][$key] ?? $default;
    return (string) $value;
}

/**
 * Clears all stored old input. Call this once a form has been
 * successfully submitted (or on GET of a fresh form).
 */
function clearOldInput(): void
{
    unset($_SESSION['old_input']);
}

/**
 * Dual-purpose flash message helper.
 * - flash('success', 'Saved!')  -> queues a message (call before redirect()).
 * - flash('success', 'Added to your bag.', 'View Cart', '/cart.php') -> queues
 *   a message with an optional action link (Phase 6), e.g. the "beautiful
 *   notification" shown after adding a product to the cart.
 * - flash()                      -> returns and clears all queued messages.
 */
function flash(?string $type = null, ?string $message = null, ?string $actionLabel = null, ?string $actionUrl = null)
{
    if ($type !== null && $message !== null) {
        $_SESSION['flash_messages'][] = [
            'type' => $type,
            'message' => $message,
            'action_label' => $actionLabel,
            'action_url' => $actionUrl,
        ];
        return null;
    }

    $messages = $_SESSION['flash_messages'] ?? [];
    unset($_SESSION['flash_messages']);
    return $messages;
}

// ---------------------------------------------------------------
// Settings (key/value store)
// ---------------------------------------------------------------
function getSetting(string $key, string $default = ''): string
{
    static $cache = null;

    if ($cache === null) {
        $cache = [];
        foreach (dbFetchAll('SELECT setting_key, setting_value FROM settings') as $row) {
            $cache[$row['setting_key']] = $row['setting_value'];
        }
    }

    return $cache[$key] ?? $default;
}

function updateSetting(string $key, string $value): bool
{
    return dbExecute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [$key, $value]
    );
}

// ---------------------------------------------------------------
// Slugs / identifiers
// ---------------------------------------------------------------

/**
 * Converts a string into a URL-safe slug. If $table is provided, the
 * slug is checked against that table's `slug` column and a numeric
 * suffix is appended until it is unique (optionally ignoring $ignoreId,
 * e.g. the current row when editing).
 */
function generateSlug(string $text, ?string $table = null, ?int $ignoreId = null): string
{
    $slug = strtolower(trim($text));
    $slug = preg_replace('~[^\pL\d]+~u', '-', $slug);
    $slug = iconv('UTF-8', 'ASCII//TRANSLIT', $slug) ?: $slug;
    $slug = preg_replace('~[^-a-z0-9]+~', '', $slug);
    $slug = trim($slug, '-');

    if ($slug === '') {
        $slug = 'item-' . substr(bin2hex(random_bytes(4)), 0, 8);
    }

    if ($table === null) {
        return $slug;
    }

    $baseSlug = $slug;
    $suffix = 1;
    while (true) {
        if ($ignoreId !== null) {
            $exists = dbFetchColumn("SELECT COUNT(*) FROM `$table` WHERE slug = ? AND id != ?", [$slug, $ignoreId]);
        } else {
            $exists = dbFetchColumn("SELECT COUNT(*) FROM `$table` WHERE slug = ?", [$slug]);
        }
        if ((int) $exists === 0) {
            return $slug;
        }
        $suffix++;
        $slug = $baseSlug . '-' . $suffix;
    }
}

function generateOrderNumber(): string
{
    return 'ZJ' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
}

function generateSku(string $prefix = 'ZJ'): string
{
    return strtoupper($prefix) . '-' . strtoupper(bin2hex(random_bytes(3)));
}

/**
 * Generates a professional, unique product SKU, e.g. "ZJ-RIN-00001" for a
 * product in the "Rings" category. Used when the admin leaves the SKU
 * field empty on admin/product-add.php. Falls back to "GEN" when no
 * category is selected. Guarantees uniqueness against the products table.
 */
function generateProductSku(?int $categoryId = null): string
{
    $categoryCode = 'GEN';
    if ($categoryId) {
        $categoryName = dbFetchColumn('SELECT name FROM categories WHERE id = ?', [$categoryId]);
        if ($categoryName) {
            $letters = preg_replace('/[^A-Za-z]/', '', (string) $categoryName);
            $categoryCode = strtoupper(substr($letters !== '' ? $letters : 'GEN', 0, 3));
        }
    }

    $prefix = 'ZJ-' . $categoryCode . '-';
    $sequence = (int) dbFetchColumn('SELECT COUNT(*) FROM products') + 1;

    do {
        $sku = $prefix . str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
        $exists = (int) dbFetchColumn('SELECT COUNT(*) FROM products WHERE sku = ?', [$sku]);
        $sequence++;
    } while ($exists > 0);

    return $sku;
}

// ---------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------
function formatPrice(float $amount): string
{
    return getSetting('currency_symbol', DEFAULT_CURRENCY_SYMBOL) . ' ' . number_format($amount, 0);
}

/**
 * The single, canonical pricing calculation for the whole project - every
 * page that needs a product's price (admin listings, the storefront, the
 * cart, WhatsApp links) must go through this function rather than
 * re-implementing the formula.
 *
 * Gold Value  = Net Weight x Gold Rate
 * Final Price = Gold Value + Making + Stone + Other Charges - Discount
 *
 * - 'auto' pricing_type: uses the CURRENT gold rate for the product's
 *   purity (from the gold_rates table), so updating the daily rate
 *   instantly re-prices every automatically-priced product without
 *   needing to re-save each one. Falls back to the product's last stored
 *   gold_rate snapshot only if no current rate has been recorded yet.
 * - 'manual' pricing_type: the admin's stored final price is always
 *   authoritative and is never recalculated or silently overwritten,
 *   regardless of gold rate changes.
 *
 * Returns the full breakdown, not just the final number, so callers (the
 * admin product form in particular) can display each component.
 */
function calculateProductPrice(array $product): array
{
    $netWeight = (float) ($product['net_weight'] ?? 0);
    $making = (float) ($product['making_charges'] ?? 0);
    $stone = (float) ($product['stone_charges'] ?? 0);
    $other = (float) ($product['other_charges'] ?? 0);
    $discount = (float) ($product['discount'] ?? 0);
    $pricingType = ($product['pricing_type'] ?? 'auto') === 'manual' ? 'manual' : 'auto';

    if ($pricingType === 'manual') {
        $goldRate = (float) ($product['gold_rate'] ?? 0);
        $goldValue = round($netWeight * $goldRate, 2);
        $finalPrice = max(0, (float) ($product['price'] ?? 0));
    } else {
        $goldRate = getGoldRate($product['purity'] ?? '21K') ?? (float) ($product['gold_rate'] ?? 0);
        $goldValue = round($netWeight * $goldRate, 2);
        $finalPrice = max(0, round($goldValue + $making + $stone + $other - $discount, 2));
    }

    return [
        'gold_value' => $goldValue,
        'gold_rate' => $goldRate,
        'making_charges' => $making,
        'stone_charges' => $stone,
        'other_charges' => $other,
        'discount' => $discount,
        'final_price' => $finalPrice,
    ];
}

/**
 * Convenience shortcut for the common case of just needing the final
 * selling price (e.g. for display in a table or a WhatsApp message).
 */
function getProductPrice(array $product): float
{
    return calculateProductPrice($product)['final_price'];
}

// ---------------------------------------------------------------
// Data lookups
// ---------------------------------------------------------------
function getProduct($identifier, string $by = 'id'): ?array
{
    $column = $by === 'slug' ? 'slug' : 'id';
    return dbFetchOne("SELECT * FROM products WHERE $column = ? LIMIT 1", [$identifier]);
}

function getCategory($identifier, string $by = 'id'): ?array
{
    $column = $by === 'slug' ? 'slug' : 'id';
    return dbFetchOne("SELECT * FROM categories WHERE $column = ? LIMIT 1", [$identifier]);
}

function getCollection($identifier, string $by = 'id'): ?array
{
    $column = $by === 'slug' ? 'slug' : 'id';
    return dbFetchOne("SELECT * FROM collections WHERE $column = ? LIMIT 1", [$identifier]);
}

/**
 * Returns the current (most recently added) rate per gram for a given
 * purity (e.g. '21K'), or null if no rate has been recorded yet.
 */
function getGoldRate(string $purity): ?float
{
    $rate = dbFetchColumn(
        'SELECT rate FROM gold_rates WHERE purity = ? ORDER BY effective_date DESC, created_at DESC LIMIT 1',
        [$purity]
    );
    return $rate !== null ? (float) $rate : null;
}

/**
 * Returns the current rate + timestamp for every purity that has at
 * least one recorded rate, keyed by purity (e.g. '24K' => [...]).
 * Used by the admin dashboard's gold rate widget, which needs the
 * "last updated" timestamp in addition to the rate itself.
 */
function getCurrentGoldRates(): array
{
    $rows = dbFetchAll(
        'SELECT g1.purity, g1.rate, g1.effective_date, g1.created_at
         FROM gold_rates g1
         INNER JOIN (
             SELECT purity, MAX(created_at) AS max_created
             FROM gold_rates GROUP BY purity
         ) g2 ON g1.purity = g2.purity AND g1.created_at = g2.max_created
         ORDER BY FIELD(g1.purity, "24K", "22K", "21K", "18K")'
    );

    $rates = [];
    foreach ($rows as $row) {
        $rates[$row['purity']] = $row;
    }
    return $rates;
}

// ---------------------------------------------------------------
// Public category data (Phase 3, Part D)
// These are for the future storefront - always scoped to status =
// "active" so an inactive category never leaks onto the public site.
// Admin pages that need every category regardless of status continue to
// query the categories table directly (see admin/categories.php).
// ---------------------------------------------------------------

/**
 * All active categories, in display order.
 */
function getActiveCategories(): array
{
    return dbFetchAll('SELECT * FROM categories WHERE status = "active" ORDER BY sort_order ASC, name ASC');
}

/**
 * A single active category by its slug, or null if not found/inactive.
 */
function getCategoryBySlug(string $slug): ?array
{
    return dbFetchOne('SELECT * FROM categories WHERE slug = ? AND status = "active" LIMIT 1', [$slug]);
}

/**
 * How many active products currently belong to a category.
 */
function getCategoryProductCount(int $categoryId): int
{
    return (int) dbFetchColumn(
        'SELECT COUNT(*) FROM products WHERE category_id = ? AND status = "active"',
        [$categoryId]
    );
}

// ---------------------------------------------------------------
// Public product data (Phase 3, Part E)
// getProducts() is the single filtering/pagination engine; every other
// getXxxProducts()/searchProducts() helper below is a thin, named
// wrapper around it so the query logic is never duplicated. All of them
// are scoped to status = "active" - admin/products.php queries the
// products table directly since it must also show inactive products.
// ---------------------------------------------------------------

/**
 * Core product listing engine with filtering + pagination.
 *
 * $filters supports: category_id, collection_id, purity, featured (bool),
 * best_seller (bool), new_arrival (bool), price_min/price_max (float),
 * weight_min/weight_max (float, matches net_weight), stock_status
 * (array of 'in_stock'/'out_of_stock'/'made_to_order'), search (string,
 * matches name, SKU, category name, or collection name), sort (one of
 * 'featured', 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc').
 *
 * Returns ['items' => [...], 'total' => int, 'page' => int,
 * 'per_page' => int, 'total_pages' => int].
 */
function getProducts(array $filters = [], int $page = 1, int $perPage = 0): array
{
    $where = ['status = "active"'];
    $params = [];

    if (!empty($filters['category_id'])) {
        $where[] = 'category_id = ?';
        $params[] = (int) $filters['category_id'];
    }
    if (!empty($filters['collection_id'])) {
        $where[] = 'collection_id = ?';
        $params[] = (int) $filters['collection_id'];
    }
    if (!empty($filters['purity'])) {
        $where[] = 'purity = ?';
        $params[] = $filters['purity'];
    }
    if (!empty($filters['featured'])) {
        $where[] = 'featured = 1';
    }
    if (!empty($filters['best_seller'])) {
        $where[] = 'best_seller = 1';
    }
    if (!empty($filters['new_arrival'])) {
        $where[] = 'new_arrival = 1';
    }
    if (isset($filters['price_min']) && $filters['price_min'] !== '') {
        $where[] = 'price >= ?';
        $params[] = (float) $filters['price_min'];
    }
    if (isset($filters['price_max']) && $filters['price_max'] !== '') {
        $where[] = 'price <= ?';
        $params[] = (float) $filters['price_max'];
    }
    if (isset($filters['weight_min']) && $filters['weight_min'] !== '') {
        $where[] = 'net_weight >= ?';
        $params[] = (float) $filters['weight_min'];
    }
    if (isset($filters['weight_max']) && $filters['weight_max'] !== '') {
        $where[] = 'net_weight <= ?';
        $params[] = (float) $filters['weight_max'];
    }
    if (!empty($filters['stock_status']) && is_array($filters['stock_status'])) {
        $allowedStock = ['in_stock', 'out_of_stock', 'made_to_order'];
        $stockValues = array_values(array_intersect($filters['stock_status'], $allowedStock));
        if ($stockValues) {
            $placeholders = implode(',', array_fill(0, count($stockValues), '?'));
            $where[] = "stock_status IN ($placeholders)";
            foreach ($stockValues as $stockValue) {
                $params[] = $stockValue;
            }
        }
    }
    if (!empty($filters['search'])) {
        // Matches product name/SKU directly, or the name of the product's
        // own category/collection - all via prepared placeholders.
        $where[] = '(name LIKE ? OR sku LIKE ?
            OR EXISTS (SELECT 1 FROM categories c WHERE c.id = products.category_id AND c.name LIKE ?)
            OR EXISTS (SELECT 1 FROM collections co WHERE co.id = products.collection_id AND co.name LIKE ?))';
        $like = '%' . $filters['search'] . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    // Whitelisted, never built from raw user input - ORDER BY can't be
    // parameterized via PDO placeholders, so this is the injection-safe way.
    $sortOptions = [
        'featured' => 'featured DESC, created_at DESC',
        'newest' => 'created_at DESC',
        'price_asc' => 'price ASC',
        'price_desc' => 'price DESC',
        'name_asc' => 'name ASC',
        'name_desc' => 'name DESC',
    ];
    $orderBySql = $sortOptions[$filters['sort'] ?? 'featured'] ?? $sortOptions['featured'];

    $total = (int) dbFetchColumn("SELECT COUNT(*) FROM products $whereSql", $params);

    $perPage = $perPage > 0 ? $perPage : ITEMS_PER_PAGE;
    $totalPages = max(1, (int) ceil($total / $perPage));
    $page = max(1, min($page, $totalPages));
    $offset = ($page - 1) * $perPage;

    $items = dbFetchAll(
        "SELECT * FROM products $whereSql ORDER BY $orderBySql LIMIT $perPage OFFSET $offset",
        $params
    );

    return [
        'items' => $items,
        'total' => $total,
        'page' => $page,
        'per_page' => $perPage,
        'total_pages' => $totalPages,
    ];
}

/**
 * A single active product by numeric ID, or null if not found/inactive.
 */
function getProductById(int $id): ?array
{
    return dbFetchOne('SELECT * FROM products WHERE id = ? AND status = "active" LIMIT 1', [$id]);
}

/**
 * A single active product by slug, or null if not found/inactive.
 */
function getProductBySlug(string $slug): ?array
{
    return dbFetchOne('SELECT * FROM products WHERE slug = ? AND status = "active" LIMIT 1', [$slug]);
}

function getFeaturedProducts(int $page = 1, int $perPage = 0): array
{
    return getProducts(['featured' => true], $page, $perPage);
}

function getBestSellingProducts(int $page = 1, int $perPage = 0): array
{
    return getProducts(['best_seller' => true], $page, $perPage);
}

function getNewArrivals(int $page = 1, int $perPage = 0): array
{
    return getProducts(['new_arrival' => true], $page, $perPage);
}

function getProductsByCategory(int $categoryId, int $page = 1, int $perPage = 0): array
{
    return getProducts(['category_id' => $categoryId], $page, $perPage);
}

function getProductsByCollection(int $collectionId, int $page = 1, int $perPage = 0): array
{
    return getProducts(['collection_id' => $collectionId], $page, $perPage);
}

function searchProducts(string $query, int $page = 1, int $perPage = 0): array
{
    return getProducts(['search' => $query], $page, $perPage);
}

// ---------------------------------------------------------------
// Pagination rendering (shared by admin list pages and, later, the
// storefront)
// ---------------------------------------------------------------

/**
 * Renders Prev/1 2 3/Next pagination links. $pagination is the array
 * shape returned by getProducts() or built the same way by an admin
 * list page. $baseUrl should already include any other query-string
 * filters the caller wants preserved (a leading '?' or '&' is added
 * automatically).
 */
function renderPagination(array $pagination, string $baseUrl): void
{
    $totalPages = $pagination['total_pages'] ?? 1;
    if ($totalPages <= 1) {
        return;
    }

    $current = $pagination['page'] ?? 1;
    $sep = (strpos($baseUrl, '?') === false) ? '?' : '&';

    echo '<nav class="pagination" aria-label="Pagination">';

    if ($current > 1) {
        echo '<a href="' . e($baseUrl . $sep . 'page=' . ($current - 1)) . '">&laquo; Prev</a>';
    }

    $start = max(1, $current - 2);
    $end = min($totalPages, $current + 2);

    if ($start > 1) {
        echo '<a href="' . e($baseUrl . $sep . 'page=1') . '">1</a>';
        if ($start > 2) {
            echo '<span>&hellip;</span>';
        }
    }

    for ($i = $start; $i <= $end; $i++) {
        if ($i === $current) {
            echo '<span class="current">' . $i . '</span>';
        } else {
            echo '<a href="' . e($baseUrl . $sep . 'page=' . $i) . '">' . $i . '</a>';
        }
    }

    if ($end < $totalPages) {
        if ($end < $totalPages - 1) {
            echo '<span>&hellip;</span>';
        }
        echo '<a href="' . e($baseUrl . $sep . 'page=' . $totalPages) . '">' . $totalPages . '</a>';
    }

    if ($current < $totalPages) {
        echo '<a href="' . e($baseUrl . $sep . 'page=' . ($current + 1)) . '">Next &raquo;</a>';
    }

    echo '</nav>';
}

// ---------------------------------------------------------------
// Admin dashboard alerts
// ---------------------------------------------------------------

/**
 * Returns real, database-backed counts used for the admin dashboard's
 * "Admin Alerts" panel and the header notification bell:
 * - pending_orders: orders awaiting confirmation
 * - unread_messages: contact/enquiry messages not yet read
 * - new_customers_today: customer accounts registered today
 */
function getAdminAlertCounts(): array
{
    return [
        'pending_orders' => (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "pending"'),
        'unread_messages' => (int) dbFetchColumn('SELECT COUNT(*) FROM messages WHERE status = "new"'),
        'new_customers_today' => (int) dbFetchColumn('SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()'),
    ];
}

// ---------------------------------------------------------------
// Secure image upload
// ---------------------------------------------------------------

/**
 * Validates and stores an uploaded image, returning the new filename
 * (not the full path/URL) on success. Throws RuntimeException with a
 * user-facing message on any validation failure.
 *
 * Security measures:
 * - Rejects anything but a genuine successful upload (UPLOAD_ERR_OK).
 * - Enforces a maximum file size, checked against the actual bytes
 *   written to disk (not the client-reported size field).
 * - Verifies the real MIME type via finfo (content sniffing), not the
 *   filename extension or the browser-supplied Content-Type header.
 * - Verifies the file is a genuine, decodable image via getimagesize(),
 *   and rejects unreasonably large pixel dimensions.
 * - Never uses the original filename: generates a random name with an
 *   extension derived from the detected MIME type, which prevents path
 *   traversal, double-extension tricks, and overwriting existing files.
 */
function secureImageUpload(array $file, string $destinationDir): string
{
    if (!isset($file['error']) || is_array($file['error'])) {
        throw new RuntimeException('Invalid upload parameters.');
    }

    switch ($file['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_NO_FILE:
            throw new RuntimeException('No file was uploaded.');
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            throw new RuntimeException('The uploaded file is too large.');
        default:
            throw new RuntimeException('Upload failed. Please try again.');
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('Invalid upload.');
    }

    // Check real bytes on disk, not the client-supplied size field.
    $actualSize = filesize($file['tmp_name']);
    if ($actualSize === false || $actualSize > MAX_UPLOAD_SIZE) {
        throw new RuntimeException('Image exceeds the maximum allowed size of ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB.');
    }

    // Real MIME type via content sniffing (never trust the filename or
    // the browser-supplied Content-Type header).
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, ALLOWED_IMAGE_TYPES, true)) {
        throw new RuntimeException('Only JPG, PNG, and WEBP images are allowed.');
    }

    // Confirm it is a genuine, decodable image and check dimensions
    // (also defends against non-image files disguised with a valid MIME).
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        throw new RuntimeException('The uploaded file is not a valid image.');
    }
    [$width, $height] = $imageInfo;
    if ($width > MAX_IMAGE_DIMENSION || $height > MAX_IMAGE_DIMENSION) {
        throw new RuntimeException('Image dimensions are too large (max ' . MAX_IMAGE_DIMENSION . 'px).');
    }

    $extensionMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $extension = $extensionMap[$mimeType] ?? null;
    if ($extension === null || !in_array($extension, ALLOWED_IMAGE_EXTENSIONS, true)) {
        throw new RuntimeException('Unsupported image type.');
    }

    if (!is_dir($destinationDir)) {
        mkdir($destinationDir, 0755, true);
    }

    // Random filename: the original filename is never trusted or reused.
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination = rtrim($destinationDir, '/') . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Could not save the uploaded image.');
    }

    chmod($destination, 0644);

    return $filename;
}

/**
 * Deletes a previously uploaded image file (identified by its stored
 * filename) from the given directory, if it exists.
 */
function deleteUploadedImage(?string $filename, string $directory): void
{
    if (empty($filename)) {
        return;
    }
    $path = rtrim($directory, '/') . '/' . basename($filename); // basename() blocks path traversal
    if (is_file($path)) {
        @unlink($path);
    }
}

// ---------------------------------------------------------------
// Public collection data (Phase 5)
// Mirrors the public category functions above - always scoped to
// status = "active" so an inactive collection never leaks onto the
// public site. Admin pages continue to query the collections table
// directly (see admin/collections.php).
// ---------------------------------------------------------------

function getActiveCollections(): array
{
    return dbFetchAll('SELECT * FROM collections WHERE status = "active" ORDER BY name ASC');
}

function getCollectionBySlug(string $slug): ?array
{
    return dbFetchOne('SELECT * FROM collections WHERE slug = ? AND status = "active" LIMIT 1', [$slug]);
}

function getCollectionProductCount(int $collectionId): int
{
    return (int) dbFetchColumn(
        'SELECT COUNT(*) FROM products WHERE collection_id = ? AND status = "active"',
        [$collectionId]
    );
}

// ---------------------------------------------------------------
// Shop filter parsing (Phase 5)
// ---------------------------------------------------------------

/**
 * Turns a raw query-string array (normally $_GET) into a clean,
 * validated $filters array ready to pass to getProducts(). Every value
 * is checked before use: category/collection slugs are resolved
 * through the *BySlug() lookups above (so a bogus slug just matches
 * nothing rather than reaching SQL), purity is checked against the
 * fixed purity list, numeric ranges are validated with filter_var(),
 * and stock statuses are intersected against the real enum values -
 * this is what keeps shop.php/category.php/collections.php from ever
 * building a query out of unsanitized user input.
 *
 * $overrides can force category_slug/collection_slug regardless of
 * what $get contains, which is how category.php/collections.php lock
 * their own filter to the page's own category/collection.
 */
function buildShopFilters(array $get, array $overrides = []): array
{
    $filters = ['search' => trim((string) ($get['search'] ?? ''))];

    $categorySlug = $overrides['category_slug'] ?? ($get['category'] ?? '');
    if ($categorySlug !== '') {
        $cat = getCategoryBySlug((string) $categorySlug);
        if ($cat) {
            $filters['category_id'] = (int) $cat['id'];
        }
    }

    $collectionSlug = $overrides['collection_slug'] ?? ($get['collection'] ?? '');
    if ($collectionSlug !== '') {
        $col = getCollectionBySlug((string) $collectionSlug);
        if ($col) {
            $filters['collection_id'] = (int) $col['id'];
        }
    }

    $purity = $get['purity'] ?? '';
    if (in_array($purity, ['24K', '22K', '21K', '18K'], true)) {
        $filters['purity'] = $purity;
    }

    foreach (['price_min', 'price_max', 'weight_min', 'weight_max'] as $rangeKey) {
        if (isset($get[$rangeKey]) && $get[$rangeKey] !== '') {
            $value = filter_var($get[$rangeKey], FILTER_VALIDATE_FLOAT);
            if ($value !== false && $value >= 0) {
                $filters[$rangeKey] = $value;
            }
        }
    }

    $stock = $get['stock'] ?? [];
    if (is_array($stock)) {
        $stock = array_values(array_intersect($stock, ['in_stock', 'made_to_order']));
        if ($stock) {
            $filters['stock_status'] = $stock;
        }
    }

    $filters['sort'] = is_string($get['sort'] ?? null) ? $get['sort'] : '';

    return $filters;
}

/**
 * Products related to $product by shared category and/or collection,
 * excluding the product itself, for a "You May Also Like" section.
 * When the product has both a category and a collection, matches on
 * both are ranked first.
 */
function getRelatedProducts(array $product, int $limit = 4): array
{
    $categoryId = $product['category_id'] ? (int) $product['category_id'] : null;
    $collectionId = $product['collection_id'] ? (int) $product['collection_id'] : null;

    if (!$categoryId && !$collectionId) {
        return [];
    }

    $where = ['status = "active"', 'id != ?'];
    $params = [(int) $product['id']];

    $matchClauses = [];
    if ($categoryId) {
        $matchClauses[] = 'category_id = ?';
        $params[] = $categoryId;
    }
    if ($collectionId) {
        $matchClauses[] = 'collection_id = ?';
        $params[] = $collectionId;
    }
    $where[] = '(' . implode(' OR ', $matchClauses) . ')';

    $whereSql = 'WHERE ' . implode(' AND ', $where);
    $orderBy = ($categoryId && $collectionId)
        ? '(category_id = ' . $categoryId . ' AND collection_id = ' . $collectionId . ') DESC, created_at DESC'
        : 'created_at DESC';

    return dbFetchAll("SELECT * FROM products $whereSql ORDER BY $orderBy LIMIT $limit", $params);
}

/**
 * Product ids currently in $userId's wishlist, for quickly checking
 * "is this product already saved?" while rendering a grid of cards.
 */
function getUserWishlistProductIds(int $userId): array
{
    return array_map('intval', array_column(
        dbFetchAll('SELECT product_id FROM wishlists WHERE user_id = ?', [$userId]),
        'product_id'
    ));
}

/**
 * Adds or removes $productId from $userId's wishlist, whichever the
 * current state calls for, and returns the new state: true if the
 * product is now saved, false if it was just removed. INSERT IGNORE
 * plus the wishlists table's own unique key is a second line of
 * defense against duplicate rows from a double-submitted click.
 */
function toggleWishlistItem(int $userId, int $productId): bool
{
    if (userHasWishlistItem($userId, $productId)) {
        dbExecute('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [$userId, $productId]);
        return false;
    }
    dbExecute('INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)', [$userId, $productId]);
    return true;
}

// ---------------------------------------------------------------
// Recently viewed products (Phase 5)
// Stored as a small cookie of product ids (most-recent-first, capped
// at RECENTLY_VIEWED_LIMIT) rather than a database table: this is a
// low-value, non-critical convenience for guests and logged-in
// customers alike, and the cookie holds nothing but public product
// ids - no personal information.
// ---------------------------------------------------------------

define('RECENTLY_VIEWED_COOKIE', 'zj_recently_viewed');
define('RECENTLY_VIEWED_LIMIT', 8);

/**
 * True when the current request is over HTTPS, used so cookies set
 * outside config.php's initial session bootstrap (recently-viewed) get
 * the same Secure-flag treatment as the session cookie itself.
 */
function isHttpsRequest(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
}

function getRecentlyViewedIds(): array
{
    $raw = $_COOKIE[RECENTLY_VIEWED_COOKIE] ?? '';
    $ids = array_filter(array_map('intval', explode(',', $raw)), fn ($id) => $id > 0);
    return array_slice(array_values($ids), 0, RECENTLY_VIEWED_LIMIT);
}

function recordRecentlyViewed(int $productId): void
{
    $ids = array_values(array_diff(getRecentlyViewedIds(), [$productId]));
    array_unshift($ids, $productId);
    $ids = array_slice($ids, 0, RECENTLY_VIEWED_LIMIT);

    $value = implode(',', $ids);
    setcookie(RECENTLY_VIEWED_COOKIE, $value, [
        'expires' => time() + 60 * 60 * 24 * 30,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => isHttpsRequest(),
    ]);
    $_COOKIE[RECENTLY_VIEWED_COOKIE] = $value; // available immediately within this same request
}

function getRecentlyViewedProducts(int $excludeId = 0): array
{
    $ids = array_values(array_diff(getRecentlyViewedIds(), [$excludeId]));
    if (!$ids) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $rows = dbFetchAll("SELECT * FROM products WHERE id IN ($placeholders) AND status = \"active\"", $ids);

    $byId = [];
    foreach ($rows as $row) {
        $byId[(int) $row['id']] = $row;
    }

    $ordered = [];
    foreach ($ids as $id) {
        if (isset($byId[$id])) {
            $ordered[] = $byId[$id];
        }
    }
    return $ordered;
}

// ---------------------------------------------------------------
// Guest/customer cart (Phase 5)
// The cart is a session array of [product_id => quantity] only - never
// a price. Every page that displays the cart calls getCartDetails(),
// which re-fetches each product from the database and recalculates its
// price via calculateProductPrice() fresh on every load, so nothing
// the browser might have cached or tampered with is ever trusted.
// Works identically for guests and logged-in customers (both use the
// PHP session), matching the phase's "logged-in users may use the same
// cart" instruction without needing a separate database table.
// ---------------------------------------------------------------

function getCart(): array
{
    return $_SESSION['cart'] ?? [];
}

function getCartItemCount(): int
{
    $count = 0;
    foreach (getCart() as $quantity) {
        $count += (int) $quantity;
    }
    return $count;
}

function addToCart(int $productId, int $quantity = 1): void
{
    $quantity = max(1, $quantity);
    $current = (int) ($_SESSION['cart'][$productId] ?? 0);
    $_SESSION['cart'][$productId] = min(CART_MAX_QUANTITY_PER_ITEM, $current + $quantity);
}

function updateCartQuantity(int $productId, int $quantity): void
{
    if ($quantity <= 0) {
        removeFromCart($productId);
        return;
    }
    $_SESSION['cart'][$productId] = min(CART_MAX_QUANTITY_PER_ITEM, $quantity);
}

function removeFromCart(int $productId): void
{
    unset($_SESSION['cart'][$productId]);
}

/**
 * Returns cart line items built entirely from LIVE, authoritative
 * database data - product name/image/stock/pricing are all re-read
 * here, never taken from the session. Any cart entry whose product no
 * longer exists or has been deactivated is silently dropped from both
 * the return value and the session itself.
 *
 * Each item's price is broken down via the same calculateProductPrice()
 * used everywhere else (Phase 3), so:
 *   - 'unit_price'    = the final per-unit price (post-discount)
 *   - 'unit_discount' = that unit's own discount component
 * and the cart-level totals below are genuine sums of real per-product
 * figures - never an invented coupon/promo system:
 *   - 'subtotal' = pre-discount value (gold value + charges) summed
 *   - 'discount' = each item's own discount, summed
 *   - 'total'    = subtotal - discount (== sum of unit_price * qty)
 */
function getCartDetails(): array
{
    $cart = getCart();
    if (!$cart) {
        return ['items' => [], 'subtotal' => 0.0, 'discount' => 0.0, 'total' => 0.0];
    }

    $ids = array_map('intval', array_keys($cart));
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $products = dbFetchAll("SELECT * FROM products WHERE id IN ($placeholders) AND status = 'active'", $ids);

    $items = [];
    $subtotal = 0.0;
    $discountTotal = 0.0;
    $grandTotal = 0.0;
    $validIds = [];

    foreach ($products as $product) {
        $quantity = (int) ($cart[$product['id']] ?? 0);
        if ($quantity < 1) {
            continue;
        }

        $breakdown = calculateProductPrice($product);
        $unitPrice = $breakdown['final_price'];
        $unitDiscount = $breakdown['discount'];
        $unitPreDiscount = $breakdown['gold_value'] + $breakdown['making_charges'] + $breakdown['stone_charges'] + $breakdown['other_charges'];

        $lineTotal = $unitPrice * $quantity;
        $subtotal += $unitPreDiscount * $quantity;
        $discountTotal += $unitDiscount * $quantity;
        $grandTotal += $lineTotal;

        $validIds[] = (int) $product['id'];
        $items[] = [
            'product' => $product,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'unit_discount' => $unitDiscount,
            'line_total' => $lineTotal,
        ];
    }

    foreach (array_keys($cart) as $id) {
        if (!in_array((int) $id, $validIds, true)) {
            unset($_SESSION['cart'][$id]);
        }
    }

    return [
        'items' => $items,
        'subtotal' => round($subtotal, 2),
        'discount' => round($discountTotal, 2),
        'total' => round($grandTotal, 2),
    ];
}

// ---------------------------------------------------------------
// Orders (Phase 6)
// ---------------------------------------------------------------

/**
 * The whitelisted set of order statuses (matches the orders.order_status
 * ENUM exactly) mapped to their display labels. Every place that
 * validates or renders a status - checkout, admin status changes,
 * customer order pages - goes through this single list, so a status
 * string from user input can never reach SQL unchecked.
 */
function getOrderStatusOptions(): array
{
    return [
        'pending' => 'Pending',
        'confirmed' => 'Confirmed',
        'processing' => 'Processing',
        'ready' => 'Ready',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];
}

/**
 * The whitelisted set of payment methods (matches the orders.payment_method
 * ENUM exactly). No online gateway is integrated this phase - these are all
 * "pay outside the checkout flow" options, and nothing here ever claims a
 * payment has actually been completed.
 */
function getPaymentMethodOptions(): array
{
    return [
        'cash_on_delivery' => 'Cash on Delivery',
        'bank_transfer' => 'Bank Transfer',
        'store_pickup' => 'Store Pickup',
        'pay_at_store' => 'Pay at Store',
    ];
}

/**
 * Generates an order number via the existing Phase 1 generateOrderNumber()
 * (date + random suffix - never relies on the timestamp alone), retrying
 * on the rare chance of a collision until it is confirmed unique against
 * the orders table.
 */
function generateUniqueOrderNumber(): string
{
    do {
        $orderNumber = generateOrderNumber();
    } while ((int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_number = ?', [$orderNumber]) > 0);

    return $orderNumber;
}

/**
 * A single order belonging to $userId, or null if it doesn't exist OR
 * belongs to someone else. Scoping the WHERE clause to user_id directly
 * (rather than fetching by id and comparing in PHP) is what makes this
 * IDOR-safe: a customer requesting another customer's order id simply
 * gets nothing back, indistinguishable from a non-existent order.
 */
function getCustomerOrder(int $orderId, int $userId): ?array
{
    return dbFetchOne('SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1', [$orderId, $userId]);
}

function getOrderItems(int $orderId): array
{
    return dbFetchAll('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [$orderId]);
}

/**
 * Order counts for a customer's account dashboard summary.
 */
function getCustomerOrderCounts(int $userId): array
{
    return [
        'total' => (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE user_id = ?', [$userId]),
        'pending' => (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE user_id = ? AND order_status = "pending"', [$userId]),
        'completed' => (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE user_id = ? AND order_status = "completed"', [$userId]),
    ];
}

// ---------------------------------------------------------------
// Guest order access (Phase 6)
// Guest checkout creates an order with user_id = NULL. Rather than
// exposing guest orders by a guessable/leakable URL token, access is
// granted only to the browser session that actually placed the order:
// checkout.php records the new order id in $_SESSION['guest_orders'],
// and every guest-facing order page below requires BOTH that session
// marker AND a fresh database check that the order truly has no owner -
// so a tampered session value can never expose a registered customer's
// order.
// ---------------------------------------------------------------

function rememberGuestOrder(int $orderId): void
{
    $_SESSION['guest_orders'][] = $orderId;
}

function canGuestAccessOrder(int $orderId): bool
{
    $guestOrders = array_map('intval', $_SESSION['guest_orders'] ?? []);
    return in_array($orderId, $guestOrders, true);
}

/**
 * The single access-controlled lookup every customer-facing order page
 * (order.php, order-success.php, order-print.php) should use: returns
 * the order if the CURRENT VISITOR - logged-in customer or the guest who
 * placed it in this browser session - is allowed to see it, or null
 * otherwise (never distinguishable from "doesn't exist").
 */
function getViewableOrder(int $orderId): ?array
{
    if (isLoggedIn()) {
        $user = getCurrentUser();
        return getCustomerOrder($orderId, (int) $user['id']);
    }

    if (!canGuestAccessOrder($orderId)) {
        return null;
    }

    return dbFetchOne('SELECT * FROM orders WHERE id = ? AND user_id IS NULL LIMIT 1', [$orderId]);
}
