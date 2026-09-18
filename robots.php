<?php
/**
 * Dynamic robots.txt (Phase 9). Served at /robots.txt via the rewrite rule
 * in .htaccess, rather than a static file, so it always reflects the
 * site's real SITE_URL and stays in one place alongside sitemap.php.
 *
 * Disallows every private/account/transactional route - none of these
 * should ever be indexed - while leaving the public catalog fully
 * crawlable.
 */
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: text/plain; charset=UTF-8');
?>
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /config/
Disallow: /includes/
Disallow: /database/
Disallow: /login.php
Disallow: /register.php
Disallow: /logout.php
Disallow: /forgot-password.php
Disallow: /reset-password.php
Disallow: /account.php
Disallow: /account-edit.php
Disallow: /account-password.php
Disallow: /orders.php
Disallow: /order.php
Disallow: /order-success.php
Disallow: /order-print.php
Disallow: /cart.php
Disallow: /checkout.php
Disallow: /wishlist.php
Disallow: /wishlist-toggle.php
Disallow: /add-to-cart.php
Disallow: /newsletter-subscribe.php

Sitemap: <?= SITE_URL ?>/sitemap.xml
