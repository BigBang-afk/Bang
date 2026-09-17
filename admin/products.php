<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_once __DIR__ . '/../includes/pagination.php';
require_admin();

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    require_csrf();
    $id = (int) ($_POST['id'] ?? 0);

    if ($_POST['action'] === 'toggle_status' && $id) {
        $pdo->prepare("UPDATE products SET status = IF(status='active','inactive','active') WHERE id = ?")->execute([$id]);
        flash('success', 'Product status updated.');
    } elseif ($_POST['action'] === 'delete' && $id) {
        $stmt = $pdo->prepare('SELECT image_path FROM product_images WHERE product_id = ?');
        $stmt->execute([$id]);
        $images = $stmt->fetchAll();
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]); // cascades product_images
        foreach ($images as $img) {
            delete_uploaded_image($img['image_path']);
        }
        log_activity('Product #' . $id . ' deleted.');
        flash('success', 'Product deleted.');
    }
    redirect(BASE_URL . '/admin/products.php?' . http_build_query($_GET));
}

// ---- Filters ----
$search = trim($_GET['q'] ?? '');
$categoryId = (int) ($_GET['category'] ?? 0);
$purity = $_GET['purity'] ?? '';
$stockStatus = $_GET['stock_status'] ?? '';
$featured = $_GET['featured'] ?? '';
$bestSeller = $_GET['best_seller'] ?? '';
$newArrival = $_GET['new_arrival'] ?? '';
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 15;

$where = [];
$params = [];

if ($search !== '') {
    $where[] = '(p.name LIKE ? OR p.sku LIKE ?)';
    $params[] = "%$search%";
    $params[] = "%$search%";
}
if ($categoryId) { $where[] = 'p.category_id = ?'; $params[] = $categoryId; }
if ($purity !== '') { $where[] = 'p.purity = ?'; $params[] = $purity; }
if ($stockStatus !== '') { $where[] = 'p.stock_status = ?'; $params[] = $stockStatus; }
if ($featured !== '') { $where[] = 'p.featured = ?'; $params[] = (int) $featured; }
if ($bestSeller !== '') { $where[] = 'p.best_seller = ?'; $params[] = (int) $bestSeller; }
if ($newArrival !== '') { $where[] = 'p.new_arrival = ?'; $params[] = (int) $newArrival; }

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p $whereSql");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();
$pagination = paginate($total, $perPage, $page);

$stmt = $pdo->prepare(
    "SELECT p.*, c.name AS category_name,
        (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     $whereSql
     ORDER BY p.created_at DESC
     LIMIT {$pagination['perPage']} OFFSET {$pagination['offset']}"
);
$stmt->execute($params);
$products = $stmt->fetchAll();

$categories = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();

$pageTitle = 'Products';
$activeAdminNav = 'products';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Products (<?= $total ?>)</h2>
        <a href="product-add.php" class="btn btn-gold">+ Add Product</a>
    </div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" placeholder="Search name or SKU..." value="<?= e($search) ?>">
        <select name="category">
            <option value="">All Categories</option>
            <?php foreach ($categories as $c): ?>
                <option value="<?= (int) $c['id'] ?>" <?= $categoryId === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <select name="purity">
            <option value="">All Purity</option>
            <?php foreach (['24K','22K','21K','18K'] as $k): ?>
                <option value="<?= $k ?>" <?= $purity === $k ? 'selected' : '' ?>><?= $k ?></option>
            <?php endforeach; ?>
        </select>
        <select name="stock_status">
            <option value="">All Stock</option>
            <option value="in_stock" <?= $stockStatus === 'in_stock' ? 'selected' : '' ?>>In Stock</option>
            <option value="out_of_stock" <?= $stockStatus === 'out_of_stock' ? 'selected' : '' ?>>Out of Stock</option>
            <option value="made_to_order" <?= $stockStatus === 'made_to_order' ? 'selected' : '' ?>>Made to Order</option>
        </select>
        <select name="featured">
            <option value="">Featured?</option>
            <option value="1" <?= $featured === '1' ? 'selected' : '' ?>>Featured</option>
        </select>
        <select name="best_seller">
            <option value="">Best Seller?</option>
            <option value="1" <?= $bestSeller === '1' ? 'selected' : '' ?>>Best Seller</option>
        </select>
        <select name="new_arrival">
            <option value="">New Arrival?</option>
            <option value="1" <?= $newArrival === '1' ? 'selected' : '' ?>>New Arrival</option>
        </select>
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="products.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr><th>Image</th><th>Name</th><th>SKU</th><th>Category</th><th>Purity</th><th>Weight</th><th>Price</th><th>Stock</th><th>Tags</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
            <?php if (!$products): ?>
                <tr><td colspan="11">No products found.</td></tr>
            <?php endif; ?>
            <?php foreach ($products as $p): ?>
                <tr>
                    <td><img class="thumb" src="<?= e(image_url($p['main_image'])) ?>" alt=""></td>
                    <td><?= e($p['name']) ?></td>
                    <td><?= e($p['sku']) ?></td>
                    <td><?= e($p['category_name'] ?? '-') ?></td>
                    <td><?= e($p['purity']) ?></td>
                    <td><?= format_weight((float) $p['net_weight']) ?></td>
                    <td><?= currency(get_effective_price($p)) ?> <?php if ($p['price_mode'] === 'auto'): ?><span class="form-help">(live)</span><?php endif; ?></td>
                    <td><span class="status-pill status-<?= e($p['stock_status']) ?>"><?= e(ucwords(str_replace('_',' ',$p['stock_status']))) ?></span></td>
                    <td style="white-space:nowrap;">
                        <?php if ($p['featured']): ?><span class="badge" style="background:#111;color:#fff;border-radius:4px;padding:2px 6px;font-size:.65rem;">F</span><?php endif; ?>
                        <?php if ($p['best_seller']): ?><span class="badge" style="background:#B08A4A;color:#fff;border-radius:4px;padding:2px 6px;font-size:.65rem;">BS</span><?php endif; ?>
                        <?php if ($p['new_arrival']): ?><span class="badge" style="background:#256b30;color:#fff;border-radius:4px;padding:2px 6px;font-size:.65rem;">NEW</span><?php endif; ?>
                    </td>
                    <td>
                        <form method="post" style="display:inline;"><?= csrf_field() ?><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                        <button class="status-pill status-<?= e($p['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($p['status'])) ?></button></form>
                    </td>
                    <td>
                        <a href="product-edit.php?id=<?= (int) $p['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                        <form method="post" style="display:inline;">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this product permanently? This cannot be undone.">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <?php render_pagination($pagination, 'products.php?' . http_build_query(array_filter(['q'=>$search,'category'=>$categoryId?:'','purity'=>$purity,'stock_status'=>$stockStatus,'featured'=>$featured,'best_seller'=>$bestSeller,'new_arrival'=>$newArrival]))); ?>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
