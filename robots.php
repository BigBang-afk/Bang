<?php
require_once __DIR__ . '/config/config.php';
header('Content-Type: text/plain; charset=UTF-8');
?>
User-agent: *
Disallow: /admin/
Disallow: /ajax/
Disallow: /cart.php
Disallow: /checkout.php
Disallow: /account.php
Disallow: /orders.php
Disallow: /wishlist.php
Disallow: /login.php
Disallow: /register.php
Disallow: /config/
Disallow: /includes/
Disallow: /uploads/
Allow: /uploads/products/
Allow: /uploads/categories/
Allow: /uploads/banners/
Allow: /uploads/settings/

Sitemap: <?= BASE_URL ?>/sitemap.xml
