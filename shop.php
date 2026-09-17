<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/product_card.php';
require_once __DIR__ . '/includes/pagination.php';
require_once __DIR__ . '/includes/shop_filters.php';

$filters = [
    'category' => $_GET['category'] ?? '',
    'purity' => $_GET['purity'] ?? '',
    'stock_status' => $_GET['stock_status'] ?? '',
    'min_price' => $_GET['min_price'] ?? '',
    'max_price' => $_GET['max_price'] ?? '',
    'sort' => $_GET['sort'] ?? 'newest',
    'page' => $_GET['page'] ?? 1,
];

$result = query_products([
    'category_id' => $filters['category'],
    'purity' => $filters['purity'],
    'stock_status' => $filters['stock_status'],
    'min_price' => $filters['min_price'],
    'max_price' => $filters['max_price'],
    'sort' => $filters['sort'],
    'page' => $filters['page'],
    'per_page' => 12,
]);

$categories = db()->query('SELECT id, name FROM categories WHERE status = "active" ORDER BY sort_order')->fetchAll();

$pageTitle = 'Shop All Jewellery - ' . get_setting('shop_name', SITE_NAME);
$activeNav = 'shop';
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Shop</div>
        <h1>Shop All Jewellery</h1>
    </div>
</div>
<div class="container section-tight">
    <?php render_shop_filters($filters, $categories); ?>

    <?php if (!$result['items']): ?>
        <div class="empty-state"><h3>No products match your filters.</h3><p>Try adjusting or resetting the filters above.</p></div>
    <?php else: ?>
        <div class="product-grid">
            <?php foreach ($result['items'] as $p): render_product_card($p); endforeach; ?>
        </div>
        <?php render_pagination($result['pagination'], 'shop.php?' . http_build_query(array_filter($filters))); ?>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
