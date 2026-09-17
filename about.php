<?php
require_once __DIR__ . '/includes/functions.php';

$whyItems = get_setting_json('why_zarghoon', []);

$pageTitle = 'About Us - ' . get_setting('shop_name', SITE_NAME);
$metaDescription = get_setting('about_text', '');
$activeNav = 'about';
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / About Us</div>
        <h1>About <?= e(get_setting('shop_name', SITE_NAME)) ?></h1>
    </div>
</div>

<div class="container section-tight">
    <div class="about-grid">
        <div class="about-media reveal">
            <img src="<?= e(image_url(get_setting('about_image'))) ?>" alt="About Zarghoon Jewellers" loading="lazy">
        </div>
        <div class="about-content reveal">
            <span class="eyebrow"><?= e(get_setting('about_subtitle', 'Our Story')) ?></span>
            <h2><?= e(get_setting('about_title', 'A Trusted Name in Fine Jewellery')) ?></h2>
            <p><?= nl2br(e(get_setting('about_text', ''))) ?></p>
        </div>
    </div>
</div>

<section id="craftsmanship" class="section" style="background:var(--card);">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Our Craft</span>
            <h2>Craftsmanship</h2>
            <hr class="gold-rule">
        </div>
        <?php if ($whyItems): ?>
        <div class="why-grid">
            <?php $icons = [
                '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12l3 5-9 13L3 8z"/></svg>',
                '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>',
                '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>',
                '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
            ]; ?>
            <?php foreach ($whyItems as $i => $item): ?>
                <div class="why-card reveal">
                    <div class="icon"><?= $icons[$i % count($icons)] ?></div>
                    <h4><?= e($item['title']) ?></h4>
                    <p><?= e($item['description']) ?></p>
                </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</section>

<section class="section">
    <div class="container" style="text-align:center;">
        <span class="eyebrow">Visit Us</span>
        <h2>Our Store</h2>
        <p style="max-width:520px;margin:0 auto 24px;color:#55524d;"><?= e(get_setting('address', '')) ?></p>
        <div class="hero-actions" style="justify-content:center;">
            <a href="tel:<?= e(preg_replace('/\s+/', '', get_setting('phone', ''))) ?>" class="btn btn-outline">Call Us: <?= e(get_setting('phone', '')) ?></a>
            <a href="https://www.google.com/maps/search/?api=1&query=<?= urlencode(get_setting('address', '')) ?>" target="_blank" rel="noopener" class="btn btn-primary">Get Directions</a>
        </div>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
