<?php
/**
 * Zarghoon Jewellers - Global Configuration
 *
 * Central place for site-wide constants. Nothing in the rest of the
 * project should hard-code a URL, path, currency symbol, or pagination
 * number - it should reference a constant defined here instead.
 */

// ---------------------------------------------------------------
// Environment (Phase 10)
// ---------------------------------------------------------------
// Production settings (APP_ENV, SITE_URL, DB_*, SMTP_*, ...) belong in
// config/env.php - a file that is NEVER committed (see .gitignore) and is
// also blocked from direct HTTP access by the root .htaccess. Copy
// config/env.example.php to config/env.php on your hosting account and
// fill in real values there; local development needs no such file at all
// and keeps working exactly as before with the defaults below.
if (file_exists(__DIR__ . '/env.php')) {
    require __DIR__ . '/env.php';
}

// 'local' unless env.php (or a real hosting environment variable) says
// otherwise. Everything downstream that needs to know "are we live"
// checks APP_ENV, not a hosting-specific signal.
if (!defined('APP_ENV')) {
    define('APP_ENV', getenv('APP_ENV') ?: 'local');
}

// Defaults to debug-off in production and debug-on everywhere else, so a
// freshly cloned local checkout still shows errors during development
// without anyone having to remember to flip a flag - while a real
// APP_ENV=production (set in config/env.php) is debug-off unless
// explicitly overridden. env.php may still `define('APP_DEBUG', ...)`
// itself if a hosting account needs to override this for a moment of
// live troubleshooting.
if (!defined('APP_DEBUG')) {
    define('APP_DEBUG', APP_ENV !== 'production');
}

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

// Set the real value in config/env.php on production, e.g.
// define('SITE_URL', 'https://zarghoonjewellers.com'); (no trailing slash).
if (!defined('SITE_URL')) {
    define('SITE_URL', getenv('SITE_URL') ?: 'http://localhost:8000');
}

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
define('FAVICON_UPLOAD_PATH', UPLOAD_PATH . 'favicon/'); // added Phase 7
define('GALLERY_UPLOAD_PATH', UPLOAD_PATH . 'gallery/'); // added Phase 7 (Instagram-style tiles)

define('PRODUCTS_UPLOAD_URL', UPLOAD_URL . 'products/');
define('CATEGORIES_UPLOAD_URL', UPLOAD_URL . 'categories/');
define('COLLECTIONS_UPLOAD_URL', UPLOAD_URL . 'collections/');
define('BANNERS_UPLOAD_URL', UPLOAD_URL . 'banners/');
define('LOGO_UPLOAD_URL', UPLOAD_URL . 'logo/');
define('FAVICON_UPLOAD_URL', UPLOAD_URL . 'favicon/'); // added Phase 7
define('GALLERY_UPLOAD_URL', UPLOAD_URL . 'gallery/'); // added Phase 7

// Upload constraints (used by the secure image upload helper in functions.php)
define('MAX_UPLOAD_SIZE', 4 * 1024 * 1024); // 4MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp']);
define('MAX_IMAGE_DIMENSION', 4000); // px, guards against decompression-bomb style images

// ---------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------
define('ITEMS_PER_PAGE', 20);        // storefront product grids (Phase 5 spec: 20 per page)
define('ADMIN_ITEMS_PER_PAGE', 20);  // admin panel tables

// ---------------------------------------------------------------
// Shop / cart (Phase 5-6)
// ---------------------------------------------------------------
// Upper bound on how many of one product a single cart line can hold -
// a sanity cap, not a real stock-quantity system (products only track
// in_stock/out_of_stock/made_to_order, not numeric stock counts).
// (This is the project's MAX_CART_QUANTITY.)
define('CART_MAX_QUANTITY_PER_ITEM', 10);

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

// ---------------------------------------------------------------
// Security headers (Phase 9)
// ---------------------------------------------------------------
// A fresh random value per request, used to allow only this request's own
// server-generated inline <script> tags (the JSON-LD blocks and the admin
// product form's gold-rate array) under the Content-Security-Policy below,
// without falling back to the much weaker 'unsafe-inline'.
define('CSP_NONCE', bin2hex(random_bytes(16)));

// Sent from PHP (rather than only via .htaccess) so every entry point gets
// them consistently regardless of web server (Apache/nginx/php -S), and so
// the nonce above can be embedded. X-Content-Type-Options/X-Frame-Options/
// Referrer-Policy are ALSO set in .htaccess, which additionally covers
// static assets (CSS/JS/images) that never run through PHP.
//
// CSP limitation (documented, not silently ignored): style-src allows
// 'unsafe-inline' because numerous existing pages use inline style="..."
// attributes for one-off layout tweaks (e.g. 404.php, product.php's
// disabled-WhatsApp notice). Locking that down would mean auditing and
// rewriting every inline style into a CSS class, which is a larger change
// than this hardening pass warrants - it is called out in the Phase 9
// report as a known follow-up, not silently dropped.
if (!headers_sent()) {
    header("Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()");
    header(
        "Content-Security-Policy: default-src 'self'; "
        . "script-src 'self' 'nonce-" . CSP_NONCE . "'; "
        . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        . "font-src 'self' https://fonts.gstatic.com; "
        . "img-src 'self' data:; "
        . "connect-src 'self'; "
        . "frame-ancestors 'self'; "
        . "base-uri 'self'; "
        . "form-action 'self';"
    );
}
