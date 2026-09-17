<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/product_card.php';

$pdo = db();

$hero = $pdo->query('SELECT * FROM banners WHERE type = "hero" AND status = "active" ORDER BY sort_order LIMIT 1')->fetch() ?: [];
$collectionBanner = $pdo->query('SELECT * FROM banners WHERE type = "collection" AND status = "active" ORDER BY sort_order LIMIT 1')->fetch() ?: [];
$instagramImages = $pdo->query('SELECT * FROM banners WHERE type = "instagram" AND status = "active" ORDER BY sort_order LIMIT 6')->fetchAll();

$categories = $pdo->query('SELECT * FROM categories WHERE status = "active" ORDER BY sort_order ASC LIMIT 10')->fetchAll();

$productSelect = 'SELECT p.*, (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image FROM products p WHERE p.status = "active"';
$bestSellers = $pdo->query($productSelect . ' AND p.best_seller = 1 ORDER BY p.created_at DESC LIMIT 8')->fetchAll();
$newArrivals = $pdo->query($productSelect . ' AND p.new_arrival = 1 ORDER BY p.created_at DESC LIMIT 8')->fetchAll();

$trustBadges = get_setting_json('trust_badges', []);
$whyItems = get_setting_json('why_zarghoon', []);

$icons = [
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12l3 5-9 13L3 8z"/><path d="M3 8h18M9 3l3 5 3-5M9 8l3 13 3-13"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2 3 6v6c0 5 3.8 9 9 10 5.2-1 9-5 9-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>',
];

$pageTitle = get_setting('shop_name', SITE_NAME) . ' - ' . get_setting('shop_tagline', SITE_TAGLINE);
$metaDescription = get_setting('meta_description', '');
$activeNav = 'home';
$jsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'JewelryStore',
    'name' => get_setting('shop_name', SITE_NAME),
    'image' => image_url(get_setting('og_image')),
    'address' => [
        '@type' => 'PostalAddress',
        'streetAddress' => get_setting('address'),
        'addressLocality' => 'Quetta',
        'addressCountry' => 'PK',
    ],
    'telephone' => get_setting('phone'),
    'url' => BASE_URL . '/index.php',
]);
require __DIR__ . '/includes/header.php';
?>

<section class="hero">
    <div class="hero-grid">
        <div class="hero-content">
            <?php if (!empty($hero['subtitle'])): ?><span class="eyebrow"><?= e($hero['subtitle']) ?></span><?php endif; ?>
            <h1><?= e($hero['title'] ?? 'Crafted to Shine Forever') ?></h1>
            <p class="lead"><?= e($hero['description'] ?? "Discover exquisite gold jewellery crafted to celebrate life's most precious moments.") ?></p>
            <div class="hero-actions">
                <a href="<?= BASE_URL ?>/<?= e($hero['button_url'] ?? 'shop.php') ?>" class="btn btn-primary"><?= e($hero['button_text'] ?? 'Shop Collection') ?></a>
                <a href="<?= BASE_URL ?>/about.php" class="btn btn-outline">Explore Our Story</a>
            </div>
        </div>
        <div class="hero-media">
            <img src="<?= e(image_url($hero['image'] ?? null)) ?>" alt="Zarghoon Jewellers hero">
        </div>
    </div>
</section>

<?php if ($trustBadges): ?>
<section class="trust-strip">
    <div class="container">
        <div class="trust-grid">
            <?php foreach ($trustBadges as $i => $badge): ?>
                <div class="trust-item">
                    <span class="icon"><?= $icons[$i % count($icons)] ?></span>
                    <div>
                        <h4><?= e($badge['title']) ?></h4>
                        <p><?= e($badge['description']) ?></p>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<section class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Our Selection</span>
            <h2>Shop by Category</h2>
            <hr class="gold-rule">
        </div>
        <div class="category-grid">
            <?php foreach ($categories as $cat): ?>
                <a class="category-card reveal" href="<?= BASE_URL ?>/category.php?slug=<?= e($cat['slug']) ?>">
                    <img src="<?= e(image_url($cat['image'])) ?>" alt="<?= e($cat['name']) ?>" loading="lazy">
                    <div class="category-info">
                        <h3><?= e($cat['name']) ?></h3>
                        <span>Explore Collection &rarr;</span>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<?php if ($bestSellers): ?>
<section class="section" style="background:var(--card);">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Fan Favorites</span>
            <h2>Best Sellers</h2>
            <p>Our Most Loved Pieces</p>
            <hr class="gold-rule">
        </div>
        <div class="product-grid">
            <?php foreach ($bestSellers as $p): render_product_card($p); endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if (!empty($collectionBanner)): ?>
<section class="luxury-banner">
    <div class="luxury-banner-grid">
        <div class="luxury-banner-content">
            <?php if (!empty($collectionBanner['subtitle'])): ?><span class="eyebrow"><?= e($collectionBanner['subtitle']) ?></span><?php endif; ?>
            <h2><?= e($collectionBanner['title'] ?? 'Modern Gold Collection') ?></h2>
            <p><?= e($collectionBanner['description'] ?? '') ?></p>
            <a href="<?= BASE_URL ?>/<?= e($collectionBanner['button_url'] ?? 'collections.php') ?>" class="btn btn-gold"><?= e($collectionBanner['button_text'] ?? 'Discover Collection') ?></a>
        </div>
        <div class="luxury-banner-media">
            <img src="<?= e(image_url($collectionBanner['image'] ?? null)) ?>" alt="<?= e($collectionBanner['title'] ?? 'Collection') ?>" loading="lazy">
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($newArrivals): ?>
<section class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Just In</span>
            <h2>New Arrivals</h2>
            <hr class="gold-rule">
        </div>
        <div class="product-grid">
            <?php foreach ($newArrivals as $p): render_product_card($p); endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($whyItems): ?>
<section class="section section-dark">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Our Promise</span>
            <h2>Why Zarghoon</h2>
            <hr class="gold-rule">
        </div>
        <div class="why-grid">
            <?php foreach ($whyItems as $i => $item): ?>
                <div class="why-card reveal">
                    <div class="icon"><?= $icons[$i % count($icons)] ?></div>
                    <h4><?= e($item['title']) ?></h4>
                    <p><?= e($item['description']) ?></p>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<section class="section">
    <div class="container">
        <div class="about-grid">
            <div class="about-media reveal">
                <img src="<?= e(image_url(get_setting('about_image'))) ?>" alt="About Zarghoon Jewellers" loading="lazy">
            </div>
            <div class="about-content reveal">
                <span class="eyebrow"><?= e(get_setting('about_subtitle', 'Our Story')) ?></span>
                <h2><?= e(get_setting('about_title', 'A Trusted Name in Fine Jewellery')) ?></h2>
                <p><?= nl2br(e(get_setting('about_text', ''))) ?></p>
                <a href="<?= BASE_URL ?>/about.php" class="btn btn-outline">Read Our Full Story</a>
            </div>
        </div>
    </div>
</section>

<?php if ($instagramImages): ?>
<section class="section section-tight" style="background:var(--card);">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">@<?= e(get_setting('instagram_username', 'zarghoon_jewellers')) ?></span>
            <h2>Follow Zarghoon Jewellers</h2>
            <hr class="gold-rule">
        </div>
        <div class="insta-grid">
            <?php foreach ($instagramImages as $img): ?>
                <a href="<?= e($img['button_url'] ?: get_setting('instagram_url', '#')) ?>" target="_blank" rel="noopener">
                    <img src="<?= e(image_url($img['image'])) ?>" alt="Instagram post" loading="lazy">
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
