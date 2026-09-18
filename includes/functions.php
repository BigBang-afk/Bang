<?php
/**
 * Zarghoon Jewellers - Core Reusable Functions
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/auth.php';

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
 * - flash()                      -> returns and clears all queued messages.
 */
function flash(?string $type = null, ?string $message = null)
{
    if ($type !== null && $message !== null) {
        $_SESSION['flash_messages'][] = ['type' => $type, 'message' => $message];
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
 * best_seller (bool), new_arrival (bool), search (string, matches name or
 * SKU), sort (one of 'newest', 'price_asc', 'price_desc', 'name_asc').
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
    if (!empty($filters['search'])) {
        $where[] = '(name LIKE ? OR sku LIKE ?)';
        $like = '%' . $filters['search'] . '%';
        $params[] = $like;
        $params[] = $like;
    }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    // Whitelisted, never built from raw user input - ORDER BY can't be
    // parameterized via PDO placeholders, so this is the injection-safe way.
    $sortOptions = [
        'newest' => 'created_at DESC',
        'price_asc' => 'price ASC',
        'price_desc' => 'price DESC',
        'name_asc' => 'name ASC',
    ];
    $orderBySql = $sortOptions[$filters['sort'] ?? 'newest'] ?? $sortOptions['newest'];

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
