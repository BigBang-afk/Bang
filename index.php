<?php
/**
 * Zarghoon Jewellers - Homepage
 *
 * Every section below is admin-manageable (Phase 7): hero slides,
 * category list, featured/best-seller/new-arrival products, the
 * collection banner, "Why Zarghoon" features, the About section, the
 * Instagram gallery, the newsletter form, and the gold rate display are
 * all read from the database/settings rather than hard-coded, and each
 * section only renders when isHomepageSectionActive() says it should
 * (admin/homepage.php). No marketing copy in this file is load-bearing -
 * it only appears as a fallback when the admin hasn't configured a
 * section yet.
 */
require_once __DIR__ . '/includes/functions.php';

$currentUser = getCurrentUser();
$wishlistProductIds = $currentUser ? getUserWishlistProductIds((int) $currentUser['id']) : [];

$pageTitle = getSetting('site_title', SITE_NAME . ' - Fine Gold Jewellery');
$pageMetaDescription = getSetting('meta_description', 'Fine gold jewellery crafted with trust - ' . SITE_NAME . '.');
$ogImage = getSetting('og_image', '');
if ($ogImage) {
    $pageOgImage = BANNERS_UPLOAD_URL . $ogImage;
}

require __DIR__ . '/includes/header.php';

$heroSlides = isHomepageSectionActive('hero') ? getActiveHeroSlides() : [];
$categories = isHomepageSectionActive('categories') ? getActiveCategories() : [];
$featuredProducts = isHomepageSectionActive('featured') ? getFeaturedProducts(1, (int) getSetting('homepage_featured_count', '8'))['items'] : [];
$bestSellers = isHomepageSectionActive('best_sellers') ? getBestSellingProducts(1, (int) getSetting('homepage_best_sellers_count', '8'))['items'] : [];
$newArrivals = isHomepageSectionActive('new_arrivals') ? getNewArrivals(1, (int) getSetting('homepage_new_arrivals_count', '8'))['items'] : [];
$features = isHomepageSectionActive('features') ? getActiveHomepageFeatures() : [];
$galleryTiles = isHomepageSectionActive('instagram') ? getActiveGalleryTiles() : [];
$goldRates = isHomepageSectionActive('gold_rates') ? getCurrentGoldRates() : [];
?>

<?php if ($heroSlides): ?>
<section class="hero-slider" data-hero-slider>
    <?php foreach ($heroSlides as $i => $slide): ?>
        <div class="hero-slide <?= $i === 0 ? 'active' : '' ?>" data-hero-slide>
            <?php if ($slide['image']): ?>
                <img class="hero-slide-media" src="<?= e(BANNERS_UPLOAD_URL . $slide['image']) ?>" alt="<?= e($slide['title']) ?>">
            <?php else: ?>
                <div class="hero-slide-media hero-slide-media-placeholder"></div>
            <?php endif; ?>
            <div class="hero-slide-overlay"></div>
            <div class="hero-slide-content">
                <div class="container">
                    <?php if ($slide['subtitle']): ?><span class="eyebrow" style="color:var(--light-gold);"><?= e($slide['subtitle']) ?></span><?php endif; ?>
                    <h1><?= e($slide['title']) ?></h1>
                    <?php if ($slide['description']): ?><p><?= e($slide['description']) ?></p><?php endif; ?>
                    <div class="hero-slide-buttons">
                        <?php if ($slide['button1_text'] && $slide['button1_url']): ?>
                            <a href="<?= e($slide['button1_url']) ?>" class="btn btn-gold"><?= e($slide['button1_text']) ?></a>
                        <?php endif; ?>
                        <?php if ($slide['button2_text'] && $slide['button2_url']): ?>
                            <a href="<?= e($slide['button2_url']) ?>" class="btn btn-outline btn-outline-light"><?= e($slide['button2_text']) ?></a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    <?php endforeach; ?>

    <?php if (count($heroSlides) > 1): ?>
        <button type="button" class="hero-nav hero-nav-prev" data-hero-prev aria-label="Previous slide">&lsaquo;</button>
        <button type="button" class="hero-nav hero-nav-next" data-hero-next aria-label="Next slide">&rsaquo;</button>
        <div class="hero-dots" data-hero-dots>
            <?php foreach ($heroSlides as $i => $slide): ?>
                <button type="button" class="hero-dot <?= $i === 0 ? 'active' : '' ?>" data-hero-dot="<?= $i ?>" aria-label="Go to slide <?= $i + 1 ?>"></button>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>
<?php endif; ?>

<?php if ($categories): ?>
<section data-reveal class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Shop by Category</span>
            <h2>Find Your Perfect Piece</h2>
        </div>
        <div class="homepage-category-grid">
            <?php foreach ($categories as $cat): ?>
                <a href="<?= SITE_URL ?>/category.php?slug=<?= e($cat['slug']) ?>" class="homepage-category-card">
                    <?php if ($cat['image']): ?>
                        <img src="<?= e(CATEGORIES_UPLOAD_URL . $cat['image']) ?>" alt="<?= e($cat['name']) ?>">
                    <?php else: ?>
                        <span class="collection-card-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span>
                    <?php endif; ?>
                    <div class="homepage-category-card-body">
                        <h3><?= e($cat['name']) ?></h3>
                        <span class="homepage-category-link">Explore Collection &rarr;</span>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($featuredProducts): ?>
<section data-reveal class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Featured Collection</span>
            <h2>Handpicked for You</h2>
        </div>
        <div class="product-grid">
            <?php foreach ($featuredProducts as $product): include __DIR__ . '/includes/product-card.php'; endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if (count($bestSellers) > 0): ?>
<section data-reveal class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Customer Favourites</span>
            <h2>Best Sellers</h2>
            <p class="text-muted">Our most loved pieces.</p>
        </div>
        <div class="product-grid">
            <?php foreach ($bestSellers as $product): include __DIR__ . '/includes/product-card.php'; endforeach; ?>
        </div>
        <div style="text-align:center;margin-top:32px;">
            <a href="<?= SITE_URL ?>/shop.php?sort=featured" class="btn btn-outline">View All</a>
        </div>
    </div>
</section>
<?php endif; ?>

<?php $collectionTitle = getSetting('collection_title', ''); if ($collectionTitle || getSetting('collection_image', '')): ?>
<section data-reveal class="collection-banner">
    <?php $collectionImage = getSetting('collection_image', ''); ?>
    <?php if ($collectionImage): ?>
        <img src="<?= e(BANNERS_UPLOAD_URL . $collectionImage) ?>" alt="<?= e(getSetting('collection_subtitle', '')) ?>" class="collection-banner-image">
    <?php endif; ?>
    <div class="collection-banner-overlay"></div>
    <div class="collection-banner-content">
        <div class="container" style="text-align:center;">
            <hr class="gold-rule" style="margin:0 auto 20px;">
            <?php if ($collectionTitle): ?><span class="eyebrow" style="color:var(--light-gold);"><?= e($collectionTitle) ?></span><?php endif; ?>
            <?php if (getSetting('collection_subtitle', '')): ?><h2><?= e(getSetting('collection_subtitle', '')) ?></h2><?php endif; ?>
            <?php if (getSetting('collection_description', '')): ?><p><?= e(getSetting('collection_description', '')) ?></p><?php endif; ?>
            <?php if (getSetting('collection_button_text', '') && getSetting('collection_button_url', '')): ?>
                <a href="<?= e(getSetting('collection_button_url', '')) ?>" class="btn btn-gold"><?= e(getSetting('collection_button_text', '')) ?></a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if (count($newArrivals) > 0): ?>
<section data-reveal class="section">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Just In</span>
            <h2>New Arrivals</h2>
            <p class="text-muted">Recently added pieces.</p>
        </div>
        <div class="product-grid">
            <?php foreach ($newArrivals as $product): include __DIR__ . '/includes/product-card.php'; endforeach; ?>
        </div>
        <div style="text-align:center;margin-top:32px;">
            <a href="<?= SITE_URL ?>/shop.php?sort=newest" class="btn btn-outline">View All</a>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($features): ?>
<section data-reveal class="section bg-card">
    <div class="container">
        <div class="section-heading">
            <span class="eyebrow">Why Zarghoon</span>
            <h2>The Zarghoon Promise</h2>
        </div>
        <div class="features-grid">
            <?php foreach ($features as $f): ?>
                <div class="feature-card">
                    <div class="feature-icon"><?= renderHomepageFeatureIcon($f['icon']) ?></div>
                    <h3><?= e($f['title']) ?></h3>
                    <?php if ($f['description']): ?><p class="text-muted"><?= e($f['description']) ?></p><?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($goldRates): ?>
<section data-reveal class="section gold-rate-section">
    <div class="container" style="text-align:center;">
        <span class="eyebrow">Today's Gold Rate</span>
        <h2>Live From Zarghoon Jewellers</h2>
        <div class="gold-rate-public-grid">
            <?php foreach (['24K', '22K', '21K', '18K'] as $karat): ?>
                <?php if (isset($goldRates[$karat])): ?>
                    <div class="gold-rate-public-card">
                        <div class="karat"><?= $karat ?></div>
                        <div class="rate"><?= formatPrice((float) $goldRates[$karat]['rate']) ?> /g</div>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>
        <p class="text-muted" style="font-size:0.82rem;margin-top:16px;"><?= e(getSetting('gold_rate_notice', 'Rates are subject to market changes. Please confirm the final price with ' . SITE_NAME . '.')) ?></p>
    </div>
</section>
<?php endif; ?>

<?php $aboutHeading = getSetting('about_heading', ''); if ($aboutHeading): ?>
<section data-reveal class="section about-section">
    <div class="container about-layout">
        <div class="about-image">
            <?php $aboutImage = getSetting('about_image', ''); ?>
            <?php if ($aboutImage): ?>
                <img src="<?= e(BANNERS_UPLOAD_URL . $aboutImage) ?>" alt="<?= e($aboutHeading) ?>">
            <?php else: ?>
                <div class="collection-card-placeholder" style="height:100%;border-radius:var(--radius-md);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></div>
            <?php endif; ?>
        </div>
        <div class="about-content">
            <span class="eyebrow">About Zarghoon Jewellers</span>
            <h2><?= e($aboutHeading) ?></h2>
            <?php if (getSetting('about_description', '')): ?><p class="text-muted"><?= nl2br(e(getSetting('about_description', ''))) ?></p><?php endif; ?>
            <?php if (getSetting('about_button_text', '') && getSetting('about_button_url', '')): ?>
                <a href="<?= e(getSetting('about_button_url', '')) ?>" class="btn btn-outline"><?= e(getSetting('about_button_text', '')) ?></a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($galleryTiles): ?>
<section data-reveal class="section instagram-section">
    <div class="container" style="text-align:center;">
        <span class="eyebrow">Follow Zarghoon Jewellers</span>
        <h2>@<?= e(getSetting('instagram_username', 'zarghoon_jewellers')) ?></h2>
        <div class="instagram-grid">
            <?php foreach ($galleryTiles as $tile): ?>
                <?php $tileLink = $tile['link'] ?: getSetting('instagram_url', '#'); ?>
                <a href="<?= e($tileLink) ?>" target="_blank" rel="noopener" class="instagram-tile">
                    <img src="<?= e(GALLERY_UPLOAD_URL . $tile['image']) ?>" alt="<?= e($tile['alt_text'] ?: 'Zarghoon Jewellers') ?>" loading="lazy">
                </a>
            <?php endforeach; ?>
        </div>
        <?php if (getSetting('instagram_url', '')): ?>
            <a href="<?= e(getSetting('instagram_url', '')) ?>" target="_blank" rel="noopener" class="btn btn-outline" style="margin-top:24px;">Follow on Instagram</a>
        <?php endif; ?>
    </div>
</section>
<?php endif; ?>

<?php if (isHomepageSectionActive('newsletter')): ?>
<section data-reveal class="section-tight newsletter-section">
    <div class="container" style="text-align:center;">
        <span class="eyebrow" style="color:var(--light-gold);">Join Our World</span>
        <h2 style="color:var(--white);">Stay Inspired</h2>
        <p>Be the first to know about new collections, jewellery inspiration and exclusive offers.</p>
        <form method="post" action="<?= SITE_URL ?>/newsletter-subscribe.php" class="newsletter-form">
            <?= csrfField() ?>
            <input type="hidden" name="redirect" value="/">
            <input type="email" name="email" placeholder="Your email address" required>
            <button type="submit" class="btn btn-gold">Subscribe</button>
        </form>
    </div>
</section>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
