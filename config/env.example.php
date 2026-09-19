<?php
/**
 * Zarghoon Jewellers - Production environment overrides (Phase 10)
 *
 * HOW TO USE:
 *   1. Copy this file to config/env.php on your hosting account
 *      (cPanel File Manager or FTP - never through a public upload form).
 *   2. Fill in your REAL values below.
 *   3. Leave config/env.php OUT of git - it is already listed in
 *      .gitignore, and it never leaves your server.
 *
 * config/env.php is also blocked from direct HTTP access by the root
 * .htaccess (see the "config|includes|database" rewrite rule), so even
 * if someone requests it by URL, Apache refuses the request outright.
 *
 * Local development needs NONE of this - without a config/env.php file,
 * config/config.php and config/database.php fall back to safe local
 * defaults automatically, so a fresh git clone keeps working exactly as
 * it always has.
 *
 * Only define the constants you actually need to override. Anything left
 * out keeps its default from config/config.php / config/database.php.
 */

// ---------------------------------------------------------------
// Environment
// ---------------------------------------------------------------
define('APP_ENV', 'production');
// APP_DEBUG is derived automatically from APP_ENV (off in production).
// Uncomment only for a moment of live troubleshooting, then remove again:
// define('APP_DEBUG', true);

// ---------------------------------------------------------------
// Site URL - your real domain, no trailing slash
// ---------------------------------------------------------------
define('SITE_URL', 'https://YOUR-DOMAIN.com');

// ---------------------------------------------------------------
// Database - from cPanel > MySQL Databases (see DEPLOYMENT.md)
// cPanel usually prefixes both the database name and the username with
// your cPanel account name, e.g. "cpaneluser_zarghoon" - copy the exact
// names cPanel shows you, do not assume "zarghoon_jewellers" is literal.
// ---------------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'cpaneluser_zarghoon');
define('DB_USER', 'cpaneluser_zjadmin');
define('DB_PASS', 'REPLACE-WITH-A-STRONG-PASSWORD');

// ---------------------------------------------------------------
// Email / SMTP is NOT configured here. It lives entirely in
// Admin > Settings > Email once you're logged in, the same way
// shop_name/phone/whatsapp_number do - so a non-technical shop owner can
// set it up (or leave it blank) without ever touching a file. See
// includes/mailer.php.
// ---------------------------------------------------------------
