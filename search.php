<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/product_card.php';
require_once __DIR__ . '/includes/pagination.php';
require_once __DIR__ . '/includes/shop_filters.php';

$q = trim($_GET['q'] ?? '');
$filters = [
    'q' => $q,
    'category' => $_GET['category'] ?? '',
    'purity' => $_GET['purity'] ?? '',
    'stock_status' => $_GET['stock_status'] ?? '',
    'min_price' => $_GET['min_price'] ?? '',
    'max_price' => $_GET['max_price'] ?? '',
    'sort' => $_GET['sort'] ?? 'newest',
    'page' => $_GET['page'] ?? 1,
];

$result = ['items' => [], 'pagination' => ['totalPages' => 1]];
if ($q !== '') {
    $result = query_products([
        'search' => $q,
        'category_id' => $filters['category'],
        'purity' => $filters['purity'],
        'stock_status' => $filters['stock_status'],
        'min_price' => $filters['min_price'],
        'max_price' => $filters['max_price'],
        'sort' => $filters['sort'],
        'page' => $filters['page'],
        'per_page' => 12,
    ]);
}

$categories = db()->query('SELECT id, name FROM categories WHERE status = "active" ORDER BY sort_order')->fetchAll();

$pageTitle = 'Search Results - ' . get_setting('shop_name', SITE_NAME);
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Search</div>
        <h1><?= $q !== '' ? 'Results for "' . e($q) . '"' : 'Search Our Collection' ?></h1>
    </div>
</div>
<div class="container section-tight">
    <?php if ($q === ''): ?>
        <div class="empty-state"><h3>Enter a search term above to find products.</h3></div>
    <?php else: ?>
        <?php render_shop_filters($filters, $categories); ?>
        <?php if (!$result['items']): ?>
            <div class="empty-state"><h3>No products found for "<?= e($q) ?>".</h3><p>Try a different search term or browse our <a href="<?= BASE_URL ?>/shop.php">full collection</a>.</p></div>
        <?php else: ?>
            <div class="product-grid">
                <?php foreach ($result['items'] as $p): render_product_card($p); endforeach; ?>
            </div>
            <?php render_pagination($result['pagination'], 'search.php?' . http_build_query(array_filter($filters))); ?>
        <?php endif; ?>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
