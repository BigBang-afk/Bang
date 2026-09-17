<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/product_card.php';
require_once __DIR__ . '/includes/pagination.php';

$slug = $_GET['slug'] ?? '';

if ($slug === '') {
    $collections = db()->query('SELECT * FROM collections WHERE status = "active" ORDER BY sort_order')->fetchAll();
    $pageTitle = 'Collections - ' . get_setting('shop_name', SITE_NAME);
    $activeNav = 'collections';
    require __DIR__ . '/includes/header.php';
    ?>
    <div class="page-header">
        <div class="container">
            <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Collections</div>
            <h1>Our Collections</h1>
        </div>
    </div>
    <div class="container section-tight">
        <div class="category-grid" style="grid-template-columns:repeat(3,1fr);">
            <?php foreach ($collections as $col): ?>
                <a class="category-card reveal" href="<?= BASE_URL ?>/collections.php?slug=<?= e($col['slug']) ?>" style="aspect-ratio:4/3;">
                    <img src="<?= e(image_url($col['image'])) ?>" alt="<?= e($col['name']) ?>" loading="lazy">
                    <div class="category-info">
                        <h3><?= e($col['name']) ?></h3>
                        <span>View Collection &rarr;</span>
                    </div>
                </a>
            <?php endforeach; ?>
            <?php if (!$collections): ?><p>No collections available yet.</p><?php endif; ?>
        </div>
    </div>
    <?php
    require __DIR__ . '/includes/footer.php';
    exit;
}

$stmt = db()->prepare('SELECT * FROM collections WHERE slug = ? AND status = "active"');
$stmt->execute([$slug]);
$collection = $stmt->fetch();

if (!$collection) {
    http_response_code(404);
    $pageTitle = 'Collection Not Found';
    require __DIR__ . '/includes/header.php';
    echo '<div class="container section"><div class="empty-state"><h3>Collection not found.</h3><a href="' . BASE_URL . '/collections.php" class="btn btn-primary">Browse Collections</a></div></div>';
    require __DIR__ . '/includes/footer.php';
    exit;
}

$page = max(1, (int) ($_GET['page'] ?? 1));
$result = query_products(['collection_id' => $collection['id'], 'per_page' => 12, 'page' => $page]);

$pageTitle = e($collection['name']) . ' - ' . get_setting('shop_name', SITE_NAME);
$metaDescription = $collection['description'] ?: null;
$ogImage = $collection['image'];
require __DIR__ . '/includes/header.php';
?>
<section class="luxury-banner">
    <div class="luxury-banner-grid">
        <div class="luxury-banner-content">
            <span class="eyebrow">Collection</span>
            <h2><?= e($collection['name']) ?></h2>
            <p><?= e($collection['description']) ?></p>
        </div>
        <div class="luxury-banner-media">
            <img src="<?= e(image_url($collection['image'])) ?>" alt="<?= e($collection['name']) ?>" loading="lazy">
        </div>
    </div>
</section>
<div class="container section-tight">
    <?php if (!$result['items']): ?>
        <div class="empty-state"><h3>No products in this collection yet.</h3></div>
    <?php else: ?>
        <div class="product-grid">
            <?php foreach ($result['items'] as $p): render_product_card($p); endforeach; ?>
        </div>
        <?php render_pagination($result['pagination'], 'collections.php?slug=' . urlencode($slug)); ?>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
