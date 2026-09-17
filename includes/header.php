<?php
/**
 * Storefront header. Include after setting (optional):
 *   $pageTitle, $metaDescription, $ogImage, $canonicalUrl, $activeNav, $jsonLd
 */
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/auth.php';

$shopName = get_setting('shop_name', SITE_NAME);
$shopTagline = get_setting('shop_tagline', SITE_TAGLINE);
$pageTitle = $pageTitle ?? $shopName . ' - ' . $shopTagline;
$metaDescription = $metaDescription ?? get_setting('meta_description', '');
$ogImage = $ogImage ?? get_setting('og_image', '');
$activeNav = $activeNav ?? '';
$logo = get_setting('logo', '');
$favicon = get_setting('favicon', '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($pageTitle) ?></title>
<meta name="description" content="<?= e($metaDescription) ?>">
<link rel="canonical" href="<?= e($canonicalUrl ?? (BASE_URL . $_SERVER['REQUEST_URI'])) ?>">
<meta property="og:title" content="<?= e($pageTitle) ?>">
<meta property="og:description" content="<?= e($metaDescription) ?>">
<?php if ($ogImage): ?><meta property="og:image" content="<?= e(image_url($ogImage)) ?>"><?php endif; ?>
<meta property="og:type" content="website">
<meta property="og:site_name" content="<?= e($shopName) ?>">
<?php if ($favicon): ?><link rel="icon" href="<?= e(image_url($favicon)) ?>"><?php else: ?>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💎</text></svg>">
<?php endif; ?>
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/style.css">
<?php if (!empty($jsonLd)): ?>
<script type="application/ld+json"><?= $jsonLd ?></script>
<?php endif; ?>
<script>window.BASE_URL = <?= json_encode(BASE_URL) ?>;</script>
</head>
<body>

<header class="site-header">
    <div class="header-inner">
        <button class="hamburger icon-btn" aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <nav class="main-nav">
            <a href="<?= BASE_URL ?>/index.php" class="<?= $activeNav === 'home' ? 'active' : '' ?>">Home</a>
            <a href="<?= BASE_URL ?>/shop.php" class="<?= $activeNav === 'shop' ? 'active' : '' ?>">Shop</a>
            <a href="<?= BASE_URL ?>/collections.php" class="<?= $activeNav === 'collections' ? 'active' : '' ?>">Collections</a>
        </nav>

        <div class="brand">
            <a href="<?= BASE_URL ?>/index.php">
                <?php if ($logo): ?>
                    <img src="<?= e(image_url($logo)) ?>" alt="<?= e($shopName) ?>" style="height:52px;object-fit:contain;">
                <?php else: ?>
                    <span class="brand-name"><?= e($shopName) ?></span>
                    <span class="brand-tagline"><?= e($shopTagline) ?></span>
                <?php endif; ?>
            </a>
        </div>

        <nav class="main-nav">
            <a href="<?= BASE_URL ?>/about.php" class="<?= $activeNav === 'about' ? 'active' : '' ?>">About Us</a>
            <a href="<?= BASE_URL ?>/journal.php" class="<?= $activeNav === 'journal' ? 'active' : '' ?>">Journal</a>
            <a href="<?= BASE_URL ?>/contact.php" class="<?= $activeNav === 'contact' ? 'active' : '' ?>">Contact</a>
        </nav>

        <div class="header-actions">
            <button class="icon-btn search-toggle" aria-label="Search">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <a class="icon-btn" href="<?= BASE_URL ?>/<?= is_logged_in() ? 'account.php' : 'login.php' ?>" aria-label="Account">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </a>
            <a class="icon-btn" href="<?= BASE_URL ?>/wishlist.php" aria-label="Wishlist">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.8.7 4.9 2.3C11.5 4.7 13.3 3.7 15.3 4c3.5.5 5 4 3.5 7.7C16.5 16.4 12 21 12 21z"/></svg>
                <?php if (is_logged_in()): ?><span class="icon-badge wishlist-count-badge"><?= (int) wishlist_count() ?></span><?php endif; ?>
            </a>
            <a class="icon-btn" href="<?= BASE_URL ?>/cart.php" aria-label="Cart">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                <span class="icon-badge cart-count-badge"><?= (int) cart_count() ?></span>
            </a>
        </div>
    </div>

    <div class="search-panel">
        <form action="<?= BASE_URL ?>/search.php" method="get">
            <input type="text" name="q" placeholder="Search rings, necklaces, SKU..." value="<?= e($_GET['q'] ?? '') ?>" required minlength="2">
            <button type="submit" class="btn btn-primary">Search</button>
        </form>
    </div>
</header>

<div class="mobile-nav">
    <button class="mobile-nav-close" aria-label="Close menu">&times;</button>
    <a href="<?= BASE_URL ?>/index.php">Home</a>
    <a href="<?= BASE_URL ?>/shop.php">Shop</a>
    <a href="<?= BASE_URL ?>/collections.php">Collections</a>
    <a href="<?= BASE_URL ?>/about.php">About Us</a>
    <a href="<?= BASE_URL ?>/journal.php">Journal</a>
    <a href="<?= BASE_URL ?>/contact.php">Contact</a>
    <a href="<?= BASE_URL ?>/<?= is_logged_in() ? 'account.php' : 'login.php' ?>"><?= is_logged_in() ? 'My Account' : 'Login / Register' ?></a>
    <a href="<?= BASE_URL ?>/wishlist.php">Wishlist</a>
    <a href="<?= BASE_URL ?>/cart.php">Cart</a>
</div>

<?php foreach (get_flashes() as $f): ?>
    <div class="container" style="padding-top:20px;">
        <div class="alert alert-<?= e($f['type']) ?>" data-autohide><?= e($f['message']) ?></div>
    </div>
<?php endforeach; ?>
