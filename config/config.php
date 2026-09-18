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
define('COLLECTIONS_UPLOAD_PATH', UPLOAD_PATH . 'collections/'); // added Phase 3 for collection images
define('BANNERS_UPLOAD_PATH', UPLOAD_PATH . 'banners/');
define('LOGO_UPLOAD_PATH', UPLOAD_PATH . 'logo/');

define('PRODUCTS_UPLOAD_URL', UPLOAD_URL . 'products/');
define('CATEGORIES_UPLOAD_URL', UPLOAD_URL . 'categories/');
define('COLLECTIONS_UPLOAD_URL', UPLOAD_URL . 'collections/');
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
// Admin security (Phase 2)
// ---------------------------------------------------------------
// Admin sessions are force-logged-out after this many seconds of
// inactivity. Refreshed on every authenticated admin request, so an
// admin actively using the dashboard is never interrupted.
define('ADMIN_SESSION_TIMEOUT', 1800); // 30 minutes

// Basic brute-force throttling for admin/login.php. Session-scoped (not
// a permanent account lock) - see includes/auth.php.
define('ADMIN_LOGIN_MAX_ATTEMPTS', 5);
define('ADMIN_LOGIN_LOCKOUT_SECONDS', 60);

// ---------------------------------------------------------------
// Customer account security (Phase 4)
// ---------------------------------------------------------------
// Minimum password length for customer accounts. Length is enforced
// server-side; uppercase/lowercase/number is recommended in the
// registration form's copy but not force-rejected, per the spec's
// "do not make password requirements unnecessarily difficult".
define('PASSWORD_MIN_LENGTH', 8);

// Basic brute-force throttling for login.php (customer login). Session-
// scoped, same pattern as the admin throttle above but tracked under
// separate session keys so a customer and an admin failing to log in
// in the same browser never affect each other's lockout state.
define('LOGIN_MAX_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_SECONDS', 60);

// How long a password reset token (see forgot-password.php /
// reset-password.php) stays valid after being issued.
define('PASSWORD_RESET_EXPIRY', 3600); // 1 hour

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
