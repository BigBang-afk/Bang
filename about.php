<?php
require_once __DIR__ . '/includes/functions.php';

$aboutHeading = getSetting('about_heading', 'Our Story');
$aboutDescription = getSetting('about_description', '');
$aboutImage = getSetting('about_image', '');
$features = getActiveHomepageFeatures();

$pageTitle = 'About Us';
$pageMetaDescription = $aboutHeading . ' - ' . SITE_NAME . '. Fine gold jewellery from Liaquat Bazar, Sarafa Market, Quetta.';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>About Us</h1>
    </div>
</section>

<section class="section about-section">
    <div class="container about-layout">
        <div class="about-image">
            <?php if ($aboutImage): ?>
                <img src="<?= e(BANNERS_UPLOAD_URL . $aboutImage) ?>" alt="<?= e($aboutHeading) ?>">
            <?php else: ?>
                <div class="collection-card-placeholder" style="height:100%;border-radius:var(--radius-md);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></div>
            <?php endif; ?>
        </div>
        <div class="about-content">
            <span class="eyebrow">Our Story</span>
            <h2><?= e($aboutHeading) ?></h2>
            <?php if ($aboutDescription): ?><p class="text-muted"><?= nl2br(e($aboutDescription)) ?></p><?php endif; ?>
            <a href="<?= SITE_URL ?>/shop.php" class="btn btn-outline">Shop Our Collection</a>
        </div>
    </div>
</section>

<?php if ($features): ?>
<section class="section bg-card" data-reveal>
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

<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow">Visit Us</span>
        <h2>Sarafa Market, Quetta</h2>
        <p class="text-muted"><?= e(getSetting('address', 'Liaquat Bazar, Sarafa Market, Quetta, Pakistan')) ?></p>
        <a href="<?= SITE_URL ?>/contact.php" class="btn btn-primary" style="margin-top:12px;">Get in Touch</a>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
