<?php
/**
 * Zarghoon Jewellers - Global Configuration
 *
 * Central place for site-wide constants. Nothing in the rest of the
 * project should hard-code a URL, path, currency symbol, or pagination
 * number - it should reference a constant defined here instead.
 */

// ---------------------------------------------------------------
// Environment
// ---------------------------------------------------------------
// Set to false on a live production server so PHP/database errors are
// never shown to visitors.
define('APP_DEBUG', true);

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

date_default_timezone_set('Asia/Karachi');

// ---------------------------------------------------------------
// Site identity
// ---------------------------------------------------------------
define('SITE_NAME', 'Zarghoon Jewellers');
define('SITE_TAGLINE', 'Fine Jewellery');

// IMPORTANT: change this to your real domain before going live, e.g.
// 'https://zarghoonjewellers.com' (no trailing slash).
define('SITE_URL', 'http://localhost:8000');

// ---------------------------------------------------------------
// Currency
// ---------------------------------------------------------------
define('CURRENCY', 'PKR');

// NOTE: some PHP builds already register a built-in global constant named
// CURRENCY_SYMBOL (via the standard/intl extension, holding an unrelated
// integer value used internally by NumberFormatter). We still define our
// own CURRENCY_SYMBOL for spec-compliance, guarded so it never triggers a
// redefinition warning/fatal - but because that guard means our value may
// silently NOT win on such builds, the rest of the app deliberately uses
// DEFAULT_CURRENCY_SYMBOL (never colliding) as the real, reliable fallback
// wherever a currency symbol is needed in code.
if (!defined('CURRENCY_SYMBOL')) {
    define('CURRENCY_SYMBOL', 'Rs.');
}
define('DEFAULT_CURRENCY_SYMBOL', 'Rs.');

// ---------------------------------------------------------------
// Filesystem / upload paths
// ---------------------------------------------------------------
define('ROOT_PATH', dirname(__DIR__));
define('UPLOAD_PATH', ROOT_PATH . '/uploads/');
define('UPLOAD_URL', SITE_URL . '/uploads/');

define('PRODUCTS_UPLOAD_PATH', UPLOAD_PATH . 'products/');
define('CATEGORIES_UPLOAD_PATH', UPLOAD_PATH . 'categories/');
define('BANNERS_UPLOAD_PATH', UPLOAD_PATH . 'banners/');
define('LOGO_UPLOAD_PATH', UPLOAD_PATH . 'logo/');

define('PRODUCTS_UPLOAD_URL', UPLOAD_URL . 'products/');
define('CATEGORIES_UPLOAD_URL', UPLOAD_URL . 'categories/');
define('BANNERS_UPLOAD_URL', UPLOAD_URL . 'banners/');
define('LOGO_UPLOAD_URL', UPLOAD_URL . 'logo/');

// Upload constraints (used by the secure image upload helper in functions.php)
define('MAX_UPLOAD_SIZE', 4 * 1024 * 1024); // 4MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp']);
define('MAX_IMAGE_DIMENSION', 4000); // px, guards against decompression-bomb style images

// ---------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------
define('ITEMS_PER_PAGE', 12);        // storefront product grids
define('ADMIN_ITEMS_PER_PAGE', 20);  // admin panel tables

// ---------------------------------------------------------------
// Secure session bootstrap
// ---------------------------------------------------------------
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('zj_session');
    session_start();
}
