<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

// Stock status values are stored as in_stock/out_of_stock/made_to_order in
// the database (Phase 1 schema); "made_to_order" is displayed as "Coming
// Soon" here to match this phase's terminology without a schema change.
$stockStatusLabels = ['in_stock' => 'In Stock', 'out_of_stock' => 'Out of Stock', 'made_to_order' => 'Coming Soon'];

$search = trim($_GET['q'] ?? '');
$categoryId = filter_input(INPUT_GET, 'category_id', FILTER_VALIDATE_INT) ?: '';
$collectionId = filter_input(INPUT_GET, 'collection_id', FILTER_VALIDATE_INT) ?: '';
$purity = $_GET['purity'] ?? '';
$stockStatus = $_GET['stock_status'] ?? '';
$status = $_GET['status'] ?? '';
$featured = $_GET['featured'] ?? '';
$bestSeller = $_GET['best_seller'] ?? '';
$newArrival = $_GET['new_arrival'] ?? '';
$page = max(1, (int) ($_GET['page'] ?? 1));

$where = [];
$params = [];

if ($search !== '') {
    $where[] = '(p.name LIKE ? OR p.sku LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
}
if ($categoryId !== '') { $where[] = 'p.category_id = ?'; $params[] = $categoryId; }
if ($collectionId !== '') { $where[] = 'p.collection_id = ?'; $params[] = $collectionId; }
if ($purity !== '' && in_array($purity, ['24K', '22K', '21K', '18K'], true)) { $where[] = 'p.purity = ?'; $params[] = $purity; }
if ($stockStatus !== '' && isset($stockStatusLabels[$stockStatus])) { $where[] = 'p.stock_status = ?'; $params[] = $stockStatus; }
if ($status !== '' && in_array($status, ['active', 'inactive'], true)) { $where[] = 'p.status = ?'; $params[] = $status; }
if ($featured === '1') { $where[] = 'p.featured = 1'; }
if ($bestSeller === '1') { $where[] = 'p.best_seller = 1'; }
if ($newArrival === '1') { $where[] = 'p.new_arrival = 1'; }

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$perPage = ADMIN_ITEMS_PER_PAGE; // 20 per page
$total = (int) dbFetchColumn("SELECT COUNT(*) FROM products p $whereSql", $params);
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$products = dbFetchAll(
    "SELECT p.*, c.name AS category_name,
        (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS main_image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     $whereSql
     ORDER BY p.created_at DESC
     LIMIT $perPage OFFSET $offset",
    $params
);

$categories = dbFetchAll('SELECT id, name FROM categories ORDER BY name ASC');
$collections = dbFetchAll('SELECT id, name FROM collections ORDER BY name ASC');

$pagination = ['page' => $page, 'total_pages' => $totalPages, 'total' => $total, 'per_page' => $perPage];
$queryWithoutPage = $_GET;
unset($queryWithoutPage['page']);
$baseUrl = 'products.php' . ($queryWithoutPage ? '?' . http_build_query($queryWithoutPage) : '');

$pageTitle = 'Products';
$activeNav = 'products';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Products (<?= $total ?>)</h2>
        <a href="<?= SITE_URL ?>/admin/product-add.php" class="btn btn-gold">+ Add Product</a>
    </div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" class="form-control" placeholder="Search name or SKU..." value="<?= e($search) ?>">
        <select name="category_id" class="form-control">
            <option value="">All Categories</option>
            <?php foreach ($categories as $c): ?>
                <option value="<?= (int) $c['id'] ?>" <?= (string) $categoryId === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <select name="collection_id" class="form-control">
            <option value="">All Collections</option>
            <?php foreach ($collections as $c): ?>
                <option value="<?= (int) $c['id'] ?>" <?= (string) $collectionId === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <select name="purity" class="form-control">
            <option value="">All Purity</option>
            <?php foreach (['24K', '22K', '21K', '18K'] as $k): ?>
                <option value="<?= $k ?>" <?= $purity === $k ? 'selected' : '' ?>><?= $k ?></option>
            <?php endforeach; ?>
        </select>
        <select name="stock_status" class="form-control">
            <option value="">All Stock</option>
            <?php foreach ($stockStatusLabels as $val => $label): ?>
                <option value="<?= $val ?>" <?= $stockStatus === $val ? 'selected' : '' ?>><?= $label ?></option>
            <?php endforeach; ?>
        </select>
        <select name="status" class="form-control">
            <option value="">All Status</option>
            <option value="active" <?= $status === 'active' ? 'selected' : '' ?>>Active</option>
            <option value="inactive" <?= $status === 'inactive' ? 'selected' : '' ?>>Inactive</option>
        </select>
        <select name="featured" class="form-control">
            <option value="">Featured?</option>
            <option value="1" <?= $featured === '1' ? 'selected' : '' ?>>Featured only</option>
        </select>
        <select name="best_seller" class="form-control">
            <option value="">Best Seller?</option>
            <option value="1" <?= $bestSeller === '1' ? 'selected' : '' ?>>Best Sellers only</option>
        </select>
        <select name="new_arrival" class="form-control">
            <option value="">New Arrival?</option>
            <option value="1" <?= $newArrival === '1' ? 'selected' : '' ?>>New Arrivals only</option>
        </select>
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <?php if (!$products): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></div>
            <p><?= ($search !== '' || $where) ? 'No products match your filters.' : 'No products have been added yet.' ?></p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr><th>Image</th><th>Product Name</th><th>SKU</th><th>Category</th><th>Purity</th><th>Net Weight</th><th>Price</th><th>Stock</th><th>Featured</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                <?php foreach ($products as $p): ?>
                    <tr>
                        <td>
                            <?php if ($p['main_image']): ?>
                                <img class="thumb" src="<?= e(PRODUCTS_UPLOAD_URL . $p['main_image']) ?>" alt="">
                            <?php else: ?>
                                <span class="thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></span>
                            <?php endif; ?>
                        </td>
                        <td><?= e($p['name']) ?></td>
                        <td><?= e($p['sku']) ?></td>
                        <td><?= e($p['category_name'] ?? '-') ?></td>
                        <td><?= e($p['purity']) ?></td>
                        <td><?= rtrim(rtrim(number_format((float) $p['net_weight'], 3), '0'), '.') ?>g</td>
                        <td>
                            <?= formatPrice(getProductPrice($p)) ?>
                            <?php if ($p['pricing_type'] === 'auto'): ?><span class="form-help" style="margin:0;">(live)</span><?php endif; ?>
                        </td>
                        <td><span class="status-pill status-<?= e($p['stock_status']) ?>"><?= e($stockStatusLabels[$p['stock_status']] ?? $p['stock_status']) ?></span></td>
                        <td><?= $p['featured'] ? '<span class="status-pill status-active">Yes</span>' : '<span class="form-help">No</span>' ?></td>
                        <td><span class="status-pill status-<?= e($p['status']) ?>"><?= e(ucfirst($p['status'])) ?></span></td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/product.php?slug=<?= e($p['slug']) ?>" target="_blank" class="btn btn-outline btn-sm">View</a>
                            <a href="<?= SITE_URL ?>/admin/product-edit.php?id=<?= (int) $p['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" action="<?= SITE_URL ?>/admin/product-delete.php" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete &quot;<?= e($p['name']) ?>&quot;? Products with order history will be deactivated instead of permanently deleted.">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <?php renderPagination($pagination, $baseUrl); ?>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
