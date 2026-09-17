<?php
/**
 * Shared helper functions used across the whole site.
 */

require_once __DIR__ . '/../config/database.php';

// ---------------------------------------------------------------
// Output / escaping
// ---------------------------------------------------------------
function e($value): string
{
    if (is_array($value)) {
        return ''; // defensively ignore unexpected array input (e.g. a crafted query string)
    }
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
}

// ---------------------------------------------------------------
// CSRF protection
// ---------------------------------------------------------------
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function csrf_verify(): bool
{
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    return !empty($_SESSION['csrf_token']) && is_string($token) && hash_equals($_SESSION['csrf_token'], $token);
}

function require_csrf(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !csrf_verify()) {
        http_response_code(400);
        die('Invalid or expired form submission. Please go back, refresh the page, and try again.');
    }
}

// ---------------------------------------------------------------
// Redirects / flash messages
// ---------------------------------------------------------------
function redirect(string $path): void
{
    header('Location: ' . $path);
    exit;
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function get_flashes(): array
{
    $flashes = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $flashes;
}

// ---------------------------------------------------------------
// Strings
// ---------------------------------------------------------------
function slugify(string $text): string
{
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = trim($text, '-');
    $text = iconv('UTF-8', 'ASCII//TRANSLIT', $text) ?: $text;
    $text = strtolower($text);
    $text = preg_replace('~[^-a-z0-9]+~', '', $text);
    return $text !== '' ? $text : 'item-' . substr(bin2hex(random_bytes(4)), 0, 8);
}

function unique_slug(string $baseSlug, string $table, ?int $ignoreId = null): string
{
    $pdo = db();
    $slug = $baseSlug;
    $i = 1;
    while (true) {
        if ($ignoreId !== null) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE slug = ? AND id != ?");
            $stmt->execute([$slug, $ignoreId]);
        } else {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE slug = ?");
            $stmt->execute([$slug]);
        }
        if ((int) $stmt->fetchColumn() === 0) {
            return $slug;
        }
        $i++;
        $slug = $baseSlug . '-' . $i;
    }
}

function generate_sku(string $prefix = 'ZJ'): string
{
    return strtoupper($prefix) . '-' . strtoupper(bin2hex(random_bytes(3)));
}

function generate_order_number(): string
{
    return 'ZJ' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
}

// ---------------------------------------------------------------
// Currency / formatting
// ---------------------------------------------------------------
function currency(float $amount): string
{
    $symbol = get_setting('currency_symbol', DEFAULT_CURRENCY_SYMBOL);
    return $symbol . ' ' . number_format($amount, 0);
}

function format_weight(float $grams): string
{
    return rtrim(rtrim(number_format($grams, 3), '0'), '.') . 'g';
}

// ---------------------------------------------------------------
// Settings (key/value store, cached per-request)
// ---------------------------------------------------------------
function get_all_settings(): array
{
    static $settings = null;
    if ($settings === null) {
        $settings = [];
        $stmt = db()->query('SELECT setting_key, setting_value FROM settings');
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    }
    return $settings;
}

function get_setting(string $key, $default = '')
{
    $settings = get_all_settings();
    return $settings[$key] ?? $default;
}

function get_setting_json(string $key, array $default = []): array
{
    $raw = get_setting($key, null);
    if (!$raw) {
        return $default;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $default;
}

function set_setting(string $key, string $value): void
{
    $stmt = db()->prepare(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    $stmt->execute([$key, $value]);
}

// ---------------------------------------------------------------
// Gold rates & pricing
// ---------------------------------------------------------------
function get_current_gold_rates(): array
{
    $rows = db()->query(
        'SELECT g1.karat, g1.rate_per_gram, g1.effective_date, g1.created_at
         FROM gold_rates g1
         INNER JOIN (
             SELECT karat, MAX(created_at) AS max_created
             FROM gold_rates GROUP BY karat
         ) g2 ON g1.karat = g2.karat AND g1.created_at = g2.max_created
         ORDER BY FIELD(g1.karat, "24K","22K","21K","18K")'
    )->fetchAll();

    $rates = [];
    foreach ($rows as $row) {
        $rates[$row['karat']] = $row;
    }
    return $rates;
}

function get_rate_for_karat(string $karat): ?float
{
    $rates = get_current_gold_rates();
    return isset($rates[$karat]) ? (float) $rates[$karat]['rate_per_gram'] : null;
}

/**
 * Final Price = (Net Weight x Gold Rate) + Making + Stone + Other - Discount
 */
function calculate_product_price(float $netWeight, float $goldRate, float $making, float $stone, float $other, float $discount): float
{
    $price = ($netWeight * $goldRate) + $making + $stone + $other - $discount;
    return max(0, round($price, 2));
}

/**
 * Returns the live selling price for a product row.
 * - 'manual' price_mode: the admin-set price is authoritative, always.
 * - 'auto' price_mode: recalculated using the CURRENT gold rate for the product's
 *   purity so that updating the gold rate instantly re-prices every auto product,
 *   without needing to re-save each one. Falls back to the stored snapshot rate
 *   if no current rate exists for that purity yet.
 */
function get_effective_price(array $product): float
{
    if (($product['price_mode'] ?? 'auto') === 'manual') {
        return (float) $product['price'];
    }

    $currentRate = get_rate_for_karat($product['purity']);
    $rate = $currentRate ?? (float) $product['gold_rate'];

    return calculate_product_price(
        (float) $product['net_weight'],
        $rate,
        (float) $product['making_charges'],
        (float) $product['stone_charges'],
        (float) $product['other_charges'],
        (float) $product['discount']
    );
}

// ---------------------------------------------------------------
// Image upload validation
// ---------------------------------------------------------------
/**
 * Validates and moves an uploaded image into $destDir, returning the new relative path
 * (relative to /uploads) on success, or throwing RuntimeException with a user-facing message.
 */
function handle_image_upload(array $file, string $destSubDir): string
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

    // Check the actual bytes on disk rather than trusting the client-reported size field.
    $actualSize = filesize($file['tmp_name']);
    if ($actualSize === false || $actualSize > MAX_UPLOAD_BYTES) {
        throw new RuntimeException('Image exceeds the maximum allowed size of 4MB.');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, ALLOWED_IMAGE_MIME, true)) {
        throw new RuntimeException('Only JPG, PNG, and WEBP images are allowed.');
    }

    // Verify it is really a valid image (defends against polyglot files).
    $imageInfo = @getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        throw new RuntimeException('The uploaded file is not a valid image.');
    }

    $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $ext = $extMap[$mime] ?? null;
    if ($ext === null || !in_array($ext, ALLOWED_IMAGE_EXT, true)) {
        throw new RuntimeException('Unsupported image type.');
    }

    $destDirFull = rtrim(UPLOAD_PATH, '/') . '/' . trim($destSubDir, '/');
    if (!is_dir($destDirFull)) {
        mkdir($destDirFull, 0755, true);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $destFull = $destDirFull . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destFull)) {
        throw new RuntimeException('Could not save the uploaded image.');
    }

    chmod($destFull, 0644);

    return trim($destSubDir, '/') . '/' . $filename;
}

/**
 * Resolve a stored image path (which may be a relative /uploads path or a full URL
 * such as the demo Unsplash placeholders) into a browser-usable URL.
 */
function image_url(?string $path): string
{
    if (empty($path)) {
        return BASE_URL . '/assets/images/placeholder.svg';
    }
    if (preg_match('~^https?://~i', $path)) {
        return $path;
    }
    return UPLOAD_URL . '/' . ltrim($path, '/');
}

function delete_uploaded_image(?string $path): void
{
    if (empty($path) || preg_match('~^https?://~i', $path)) {
        return; // never delete external/demo URLs
    }
    $full = rtrim(UPLOAD_PATH, '/') . '/' . ltrim($path, '/');
    if (is_file($full)) {
        @unlink($full);
    }
}

// ---------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------
function valid_mobile(string $mobile): bool
{
    return (bool) preg_match('/^03[0-9]{9}$/', $mobile);
}

function valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// ---------------------------------------------------------------
// Product catalog querying (shared by shop/category/collections/search)
// ---------------------------------------------------------------
/**
 * Shared filtered/paginated product query for storefront listing pages.
 * $options keys: category_id, collection_id, purity, stock_status, search,
 * min_price, max_price, min_weight, max_weight, sort, page, per_page.
 * Note: min/max price filters operate on the stored `price` column (not the
 * live auto-recalculated price) for performance; this is acceptable since
 * gold rate changes are infrequent and the stored price is refreshed on
 * every product save.
 */
function query_products(array $options): array
{
    $where = ['p.status = "active"'];
    $params = [];

    if (!empty($options['category_id'])) { $where[] = 'p.category_id = ?'; $params[] = (int) $options['category_id']; }
    if (!empty($options['collection_id'])) { $where[] = 'p.collection_id = ?'; $params[] = (int) $options['collection_id']; }
    if (!empty($options['purity'])) { $where[] = 'p.purity = ?'; $params[] = $options['purity']; }
    if (!empty($options['stock_status'])) { $where[] = 'p.stock_status = ?'; $params[] = $options['stock_status']; }
    if (!empty($options['search'])) {
        $where[] = '(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ?)';
        $like = '%' . $options['search'] . '%';
        $params[] = $like; $params[] = $like; $params[] = $like;
    }
    if (isset($options['min_price']) && $options['min_price'] !== '') { $where[] = 'p.price >= ?'; $params[] = (float) $options['min_price']; }
    if (isset($options['max_price']) && $options['max_price'] !== '') { $where[] = 'p.price <= ?'; $params[] = (float) $options['max_price']; }
    if (isset($options['min_weight']) && $options['min_weight'] !== '') { $where[] = 'p.net_weight >= ?'; $params[] = (float) $options['min_weight']; }
    if (isset($options['max_weight']) && $options['max_weight'] !== '') { $where[] = 'p.net_weight <= ?'; $params[] = (float) $options['max_weight']; }

    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $sortMap = [
        'newest' => 'p.created_at DESC',
        'price_asc' => 'p.price ASC',
        'price_desc' => 'p.price DESC',
        'name_asc' => 'p.name ASC',
    ];
    $orderSql = $sortMap[$options['sort'] ?? 'newest'] ?? $sortMap['newest'];

    $perPage = (int) ($options['per_page'] ?? 12);
    $page = max(1, (int) ($options['page'] ?? 1));

    $pdo = db();
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p $whereSql");
    $countStmt->execute($params);
    $pagination = paginate((int) $countStmt->fetchColumn(), $perPage, $page);

    $stmt = $pdo->prepare(
        "SELECT p.*, c.name AS category_name,
            (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         $whereSql
         ORDER BY $orderSql
         LIMIT {$pagination['perPage']} OFFSET {$pagination['offset']}"
    );
    $stmt->execute($params);

    return ['items' => $stmt->fetchAll(), 'pagination' => $pagination];
}

// ---------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------
function paginate(int $totalItems, int $perPage, int $currentPage): array
{
    $totalPages = max(1, (int) ceil($totalItems / $perPage));
    $currentPage = max(1, min($currentPage, $totalPages));
    $offset = ($currentPage - 1) * $perPage;
    return compact('totalItems', 'perPage', 'currentPage', 'totalPages', 'offset');
}

// ---------------------------------------------------------------
// Activity log (admin dashboard feed)
// ---------------------------------------------------------------
function log_activity(string $description): void
{
    $stmt = db()->prepare('INSERT INTO activity_log (description) VALUES (?)');
    $stmt->execute([$description]);
}

// ---------------------------------------------------------------
// WhatsApp enquiry links
// ---------------------------------------------------------------
function whatsapp_link(string $message, ?string $number = null): string
{
    $number = $number ?? get_setting('whatsapp_number', '');
    $number = preg_replace('/[^0-9]/', '', $number ?? '');
    return 'https://wa.me/' . $number . '?text=' . rawurlencode($message);
}

function whatsapp_product_link(array $product): string
{
    $url = BASE_URL . '/product.php?slug=' . $product['slug'];
    $message = sprintf(
        "Hello Zarghoon Jewellers, I am interested in %s.\nSKU: %s\nPrice: %s\nLink: %s",
        $product['name'],
        $product['sku'],
        currency(get_effective_price($product)),
        $url
    );
    return whatsapp_link($message);
}
