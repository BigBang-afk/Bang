<?php
/**
 * Public site header/layout wrapper (Phase 4).
 *
 * Every public-facing page must require includes/functions.php itself
 * first (this file assumes it is already loaded, matching the same
 * pattern as includes/admin-header.php), then optionally set
 * $pageTitle before requiring this file. Pairs with includes/footer.php,
 * which closes the <main> opened below.
 *
 * NOTE: the full storefront (shop/category/product/cart) has not been
 * built yet as of Phase 4 - see the Phase 4 final report. This header
 * therefore only links to pages that actually exist right now: the
 * temporary placeholder homepage, login/register, and the customer
 * account pages. Shop/Category/Cart/Wishlist navigation will be added
 * once those pages are built in a later phase, rather than linking to
 * pages that don't exist yet.
 */
require_once __DIR__ . '/functions.php';

$pageTitle = $pageTitle ?? SITE_NAME;
$headerCurrentUser = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($pageTitle) ?> | <?= e(SITE_NAME) ?></title>
<meta name="csrf-token" content="<?= e(generateCsrfToken()) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/style.css">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/responsive.css">
</head>
<body>
<header class="site-header">
    <div class="container site-header-inner">
        <a href="<?= SITE_URL ?>/" class="site-logo">
            <span class="site-logo-name"><?= e(SITE_NAME) ?></span>
            <span class="site-logo-tag"><?= e(SITE_TAGLINE) ?></span>
        </a>

        <nav class="site-nav">
            <?php if ($headerCurrentUser): ?>
                <span class="site-nav-hi">Hi, <?= e(explode(' ', trim($headerCurrentUser['full_name']))[0]) ?></span>
                <a href="<?= SITE_URL ?>/account.php" class="site-nav-link">My Account</a>
                <a href="<?= SITE_URL ?>/logout.php" class="site-nav-link">Logout</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/login.php" class="site-nav-link">Login</a>
                <a href="<?= SITE_URL ?>/register.php" class="btn btn-gold btn-sm">Register</a>
            <?php endif; ?>
        </nav>

        <button type="button" class="site-account-icon" data-account-menu-toggle aria-label="Account menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
        </button>
    </div>

    <div class="site-account-menu" id="site-account-menu">
        <?php if ($headerCurrentUser): ?>
            <a href="<?= SITE_URL ?>/account.php">My Account</a>
            <a href="<?= SITE_URL ?>/account.php#orders">My Orders</a>
            <a href="<?= SITE_URL ?>/account.php#wishlist">Wishlist</a>
            <a href="<?= SITE_URL ?>/logout.php">Logout</a>
        <?php else: ?>
            <a href="<?= SITE_URL ?>/login.php">Login</a>
            <a href="<?= SITE_URL ?>/register.php">Register</a>
        <?php endif; ?>
    </div>
</header>

<main class="site-main">
    <?php foreach ((flash() ?: []) as $f): ?>
        <div class="container"><div class="alert alert-<?= e($f['type']) ?>" data-autohide><?= e($f['message']) ?></div></div>
    <?php endforeach; ?>
