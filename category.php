<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/product_card.php';
require_once __DIR__ . '/includes/pagination.php';
require_once __DIR__ . '/includes/shop_filters.php';

$slug = $_GET['slug'] ?? '';
$stmt = db()->prepare('SELECT * FROM categories WHERE slug = ? AND status = "active"');
$stmt->execute([$slug]);
$category = $stmt->fetch();

if (!$category) {
    http_response_code(404);
    $pageTitle = 'Category Not Found';
    require __DIR__ . '/includes/header.php';
    echo '<div class="container section"><div class="empty-state"><h3>Category not found.</h3><a href="' . BASE_URL . '/shop.php" class="btn btn-primary">Browse All Jewellery</a></div></div>';
    require __DIR__ . '/includes/footer.php';
    exit;
}

$filters = [
    'purity' => $_GET['purity'] ?? '',
    'stock_status' => $_GET['stock_status'] ?? '',
    'min_price' => $_GET['min_price'] ?? '',
    'max_price' => $_GET['max_price'] ?? '',
    'sort' => $_GET['sort'] ?? 'newest',
    'page' => $_GET['page'] ?? 1,
];

$result = query_products(array_merge($filters, ['category_id' => $category['id'], 'per_page' => 12]));

$pageTitle = e($category['name']) . ' - ' . get_setting('shop_name', SITE_NAME);
$metaDescription = $category['description'] ?: null;
$ogImage = $category['image'];
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / <a href="<?= BASE_URL ?>/shop.php">Shop</a> / <?= e($category['name']) ?></div>
        <h1><?= e($category['name']) ?></h1>
        <?php if ($category['description']): ?><p><?= e($category['description']) ?></p><?php endif; ?>
    </div>
</div>
<div class="container section-tight">
    <?php render_shop_filters($filters, [], true); ?>

    <?php if (!$result['items']): ?>
        <div class="empty-state"><h3>No products in this category yet.</h3><p>Please check back soon.</p></div>
    <?php else: ?>
        <div class="product-grid">
            <?php foreach ($result['items'] as $p): render_product_card($p); endforeach; ?>
        </div>
        <?php render_pagination($result['pagination'], 'category.php?slug=' . urlencode($slug) . '&' . http_build_query(array_filter($filters))); ?>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
