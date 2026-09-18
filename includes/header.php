<?php
/**
 * Public site header/layout wrapper.
 *
 * Every public-facing page must require includes/functions.php itself
 * first (this file assumes it is already loaded, matching the same
 * pattern as includes/admin-header.php), then optionally set $pageTitle
 * / $pageMetaDescription / $pageOgImage / $pageJsonLd before requiring
 * this file. Pairs with includes/footer.php, which closes the <main>
 * opened below.
 *
 * $pageJsonLd (Phase 5), when set, must already be a JSON-encoded
 * string (see product.php) - it is printed as-is inside a
 * <script type="application/ld+json"> tag, never re-escaped as HTML
 * text, since JSON and HTML escaping are not the same thing.
 */
require_once __DIR__ . '/functions.php';

$pageTitle = $pageTitle ?? SITE_NAME;
$pageMetaDescription = $pageMetaDescription ?? ('Fine gold jewellery crafted with trust - ' . SITE_NAME . ', ' . SITE_TAGLINE . '.');
$pageOgImage = $pageOgImage ?? null;
$pageJsonLd = $pageJsonLd ?? null;

$headerCurrentUser = getCurrentUser();
$headerCartCount = getCartItemCount();
$headerLogo = getSetting('logo', '');
$headerFavicon = getSetting('favicon', '');
$headerTickerEnabled = getSetting('gold_rate_ticker_enabled', '0') === '1';
$headerGoldRates = $headerTickerEnabled ? getCurrentGoldRates() : [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($pageTitle) ?> | <?= e(SITE_NAME) ?></title>
<meta name="description" content="<?= e($pageMetaDescription) ?>">
<meta name="csrf-token" content="<?= e(generateCsrfToken()) ?>">
<meta property="og:title" content="<?= e($pageTitle) ?> | <?= e(SITE_NAME) ?>">
<meta property="og:description" content="<?= e($pageMetaDescription) ?>">
<meta property="og:type" content="website">
<?php if ($pageOgImage): ?><meta property="og:image" content="<?= e($pageOgImage) ?>"><?php endif; ?>
<?php if ($headerFavicon): ?><link rel="icon" href="<?= e(FAVICON_UPLOAD_URL . $headerFavicon) ?>"><?php endif; ?>
<?php if ($pageJsonLd): ?><script type="application/ld+json"><?= $pageJsonLd ?></script><?php endif; ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/style.css">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/responsive.css">
</head>
<body>
<a href="#main-content" class="skip-link">Skip to content</a>
<?php if ($headerTickerEnabled && $headerGoldRates): ?>
<div class="site-gold-ticker">
    <div class="container site-gold-ticker-inner">
        <?php foreach (['24K', '21K', '18K'] as $karat): ?>
            <?php if (isset($headerGoldRates[$karat])): ?>
                <span><?= $karat ?> <?= formatPrice((float) $headerGoldRates[$karat]['rate']) ?>/g</span>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
</div>
<?php endif; ?>
<header class="site-header">
    <div class="container site-header-inner">
        <a href="<?= SITE_URL ?>/" class="site-logo">
            <?php if ($headerLogo): ?>
                <img src="<?= e(LOGO_UPLOAD_URL . $headerLogo) ?>" alt="<?= e(SITE_NAME) ?>" class="site-logo-image">
            <?php else: ?>
                <span class="site-logo-name"><?= e(SITE_NAME) ?></span>
                <span class="site-logo-tag"><?= e(SITE_TAGLINE) ?></span>
            <?php endif; ?>
        </a>

        <nav class="site-nav" aria-label="Primary">
            <a href="<?= SITE_URL ?>/" class="site-nav-link">Home</a>
            <a href="<?= SITE_URL ?>/shop.php" class="site-nav-link">Shop</a>
            <a href="<?= SITE_URL ?>/collections.php" class="site-nav-link">Collections</a>
            <a href="<?= SITE_URL ?>/about.php" class="site-nav-link">About Us</a>
            <a href="<?= SITE_URL ?>/contact.php" class="site-nav-link">Contact</a>
            <?php if ($headerCurrentUser): ?>
                <span class="site-nav-hi">Hi, <?= e(explode(' ', trim($headerCurrentUser['full_name']))[0]) ?></span>
                <a href="<?= SITE_URL ?>/account.php" class="site-nav-link">My Account</a>
                <a href="<?= SITE_URL ?>/logout.php" class="site-nav-link">Logout</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/login.php" class="site-nav-link">Login</a>
                <a href="<?= SITE_URL ?>/register.php" class="btn btn-gold btn-sm">Register</a>
            <?php endif; ?>
        </nav>

        <div class="site-header-icons">
            <button type="button" class="site-icon-btn" data-search-toggle aria-label="Search" aria-expanded="false" aria-controls="site-search-panel">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <a href="<?= SITE_URL ?>/wishlist.php" class="site-icon-btn" aria-label="Wishlist">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.1 2.3 4.5 5.8 4c2-.3 3.9.7 5 2.4C11.9 4.7 13.8 3.7 15.8 4c3.5.5 5.3 4.1 3.8 7.7C19.5 16.1 12 21 12 21z"/></svg>
            </a>
            <a href="<?= SITE_URL ?>/cart.php" class="site-icon-btn" aria-label="Cart, <?= $headerCartCount ?> item<?= $headerCartCount === 1 ? '' : 's' ?>">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                <span class="site-icon-badge"><?= $headerCartCount > 9 ? '9+' : $headerCartCount ?></span>
            </a>
            <button type="button" class="site-account-icon" data-account-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="site-account-menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="icon-menu"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
        </div>
    </div>

    <div class="site-search-panel" id="site-search-panel">
        <form method="get" action="<?= SITE_URL ?>/shop.php" class="container">
            <input type="text" name="search" placeholder="SEARCH JEWELLERY" aria-label="Search jewellery">
            <button type="submit" class="btn btn-gold btn-sm">Search</button>
        </form>
    </div>

    <div class="site-account-menu-overlay" data-account-menu-close></div>
    <div class="site-account-menu" id="site-account-menu" role="dialog" aria-modal="true" aria-label="Menu">
        <button type="button" class="site-account-menu-close" data-account-menu-close aria-label="Close menu">&times;</button>
        <a href="<?= SITE_URL ?>/">Home</a>
        <a href="<?= SITE_URL ?>/shop.php">Shop</a>
        <a href="<?= SITE_URL ?>/collections.php">Collections</a>
        <a href="<?= SITE_URL ?>/about.php">About Us</a>
        <a href="<?= SITE_URL ?>/contact.php">Contact</a>
        <a href="<?= SITE_URL ?>/cart.php">Cart (<?= $headerCartCount ?>)</a>
        <?php if ($headerCurrentUser): ?>
            <a href="<?= SITE_URL ?>/account.php">My Account</a>
            <a href="<?= SITE_URL ?>/orders.php">My Orders</a>
            <a href="<?= SITE_URL ?>/wishlist.php">Wishlist</a>
            <a href="<?= SITE_URL ?>/logout.php">Logout</a>
        <?php else: ?>
            <a href="<?= SITE_URL ?>/login.php">Login</a>
            <a href="<?= SITE_URL ?>/register.php">Register</a>
        <?php endif; ?>
    </div>
</header>

<main class="site-main" id="main-content">
    <?php foreach ((flash() ?: []) as $f): ?>
        <?php $hasAction = !empty($f['action_url']); ?>
        <div class="container">
            <div class="alert alert-<?= e($f['type']) ?>" <?= $hasAction ? '' : 'data-autohide' ?>>
                <?= e($f['message']) ?>
                <?php if ($hasAction): ?> <a href="<?= e(SITE_URL . $f['action_url']) ?>" class="alert-action"><?= e($f['action_label'] ?? 'View') ?></a><?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
