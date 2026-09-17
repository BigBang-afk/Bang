<?php
/**
 * Zarghoon Jewellers - Core configuration
 * Edit these constants for your environment. Do not commit real credentials to public repos.
 */

// ---- Environment ----
// Set to false on a live production server.
define('APP_DEBUG', false);

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

// ---- Database ----
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'zarghoon_jewellers');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ---- Paths / URLs ----
// BASE_URL must NOT have a trailing slash. Example: https://zarghoonjewellers.com
define('BASE_URL', rtrim(getenv('APP_BASE_URL') ?: 'http://localhost', '/'));
define('ROOT_PATH', dirname(__DIR__));
define('UPLOAD_PATH', ROOT_PATH . '/uploads');
define('UPLOAD_URL', BASE_URL . '/uploads');

// ---- Site defaults (used only before settings table is seeded) ----
define('SITE_NAME', 'Zarghoon Jewellers');
define('SITE_TAGLINE', 'Fine Jewellery');
define('DEFAULT_CURRENCY_SYMBOL', 'Rs.');

// ---- Uploads ----
define('MAX_UPLOAD_BYTES', 4 * 1024 * 1024); // 4MB
define('ALLOWED_IMAGE_MIME', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_IMAGE_EXT', ['jpg', 'jpeg', 'png', 'webp']);

// ---- Sessions ----
// Secure session cookie settings. HTTPS must be enabled in production for 'secure' => true to work.
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

date_default_timezone_set('Asia/Karachi');
