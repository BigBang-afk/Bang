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

// ---------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------
function formatPrice(float $amount): string
{
    return getSetting('currency_symbol', DEFAULT_CURRENCY_SYMBOL) . ' ' . number_format($amount, 0);
}

/**
 * Final Price = (Net Weight x Gold Rate) + Making + Stone + Other - Discount
 */
function calculateProductPrice(float $netWeight, float $goldRate, float $making, float $stone, float $other, float $discount): float
{
    $price = ($netWeight * $goldRate) + $making + $stone + $other - $discount;
    return max(0, round($price, 2));
}

/**
 * Returns the live selling price for a product row.
 * - 'manual' pricing_type: the admin-set price is authoritative, always.
 * - 'auto' pricing_type: recalculated using the CURRENT gold rate for the
 *   product's purity, so updating gold rates re-prices every auto product
 *   instantly without needing to re-save each one individually.
 */
function getProductPrice(array $product): float
{
    if (($product['pricing_type'] ?? 'auto') === 'manual') {
        return (float) $product['price'];
    }

    $currentRate = getGoldRate($product['purity']);
    $rate = $currentRate ?? (float) $product['gold_rate'];

    return calculateProductPrice(
        (float) $product['net_weight'],
        $rate,
        (float) $product['making_charges'],
        (float) $product['stone_charges'],
        (float) $product['other_charges'],
        (float) $product['discount']
    );
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
