<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrf();
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if ($_POST['action'] === 'toggle_status' && $id) {
        dbExecute("UPDATE categories SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ?", [$id]);
        flash('success', 'Category status updated.');
    } elseif ($_POST['action'] === 'delete' && $id) {
        $category = dbFetchOne('SELECT * FROM categories WHERE id = ?', [$id]);
        if (!$category) {
            flash('error', 'Category not found.');
        } else {
            // Safety: never delete a category while products still reference
            // it. Deleting products' shared category out from under them
            // would be a data-integrity surprise for the admin, so we block
            // it with a clear message instead of silently orphaning/nulling
            // their category_id (which the DB's ON DELETE SET NULL would
            // otherwise allow).
            $productCount = (int) dbFetchColumn('SELECT COUNT(*) FROM products WHERE category_id = ?', [$id]);
            if ($productCount > 0) {
                flash('error', "Cannot delete \"{$category['name']}\" - $productCount product(s) are assigned to it. Reassign or remove those products first.");
            } else {
                dbExecute('DELETE FROM categories WHERE id = ?', [$id]);
                deleteUploadedImage($category['image'], CATEGORIES_UPLOAD_PATH);
                flash('success', "Category \"{$category['name']}\" deleted.");
            }
        }
    } elseif ($_POST['action'] === 'reorder' && $id) {
        $direction = $_POST['direction'] ?? '';
        $current = dbFetchOne('SELECT id, sort_order FROM categories WHERE id = ?', [$id]);
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $neighbor = dbFetchOne(
                "SELECT id, sort_order FROM categories WHERE sort_order $cmp ? ORDER BY sort_order $order LIMIT 1",
                [$current['sort_order']]
            );
            if ($neighbor) {
                dbExecute('UPDATE categories SET sort_order = ? WHERE id = ?', [$neighbor['sort_order'], $current['id']]);
                dbExecute('UPDATE categories SET sort_order = ? WHERE id = ?', [$current['sort_order'], $neighbor['id']]);
            }
        }
    }
    redirect(SITE_URL . '/admin/categories.php' . (!empty($_GET['q']) ? '?q=' . urlencode($_GET['q']) : ''));
}

$search = trim($_GET['q'] ?? '');
$where = '';
$params = [];
if ($search !== '') {
    $where = 'WHERE name LIKE ? OR slug LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like];
}

$categories = dbFetchAll(
    "SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c $where ORDER BY c.sort_order ASC, c.name ASC",
    $params
);

$pageTitle = 'Categories';
$activeNav = 'categories';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Categories (<?= count($categories) ?>)</h2>
        <a href="<?= SITE_URL ?>/admin/category-add.php" class="btn btn-gold">+ Add Category</a>
    </div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" class="form-control" placeholder="Search by name or slug..." value="<?= e($search) ?>" style="max-width:280px;">
        <button type="submit" class="btn btn-outline btn-sm">Search</button>
        <?php if ($search !== ''): ?><a href="<?= SITE_URL ?>/admin/categories.php" class="btn btn-outline btn-sm">Reset</a><?php endif; ?>
    </form>

    <?php if (!$categories): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></div>
            <p><?= $search !== '' ? 'No categories match "' . e($search) . '".' : 'No categories have been added yet.' ?></p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr><th>Image</th><th>Category Name</th><th>Slug</th><th>Products</th><th>Status</th><th>Sort Order</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                <?php foreach ($categories as $cat): ?>
                    <tr>
                        <td>
                            <?php if ($cat['image']): ?>
                                <img class="thumb" src="<?= e(CATEGORIES_UPLOAD_URL . $cat['image']) ?>" alt="">
                            <?php else: ?>
                                <span class="thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span>
                            <?php endif; ?>
                        </td>
                        <td><?= e($cat['name']) ?></td>
                        <td><?= e($cat['slug']) ?></td>
                        <td><?= (int) $cat['product_count'] ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $cat['id'] ?>">
                                <button type="submit" class="status-pill status-<?= e($cat['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($cat['status'])) ?></button>
                            </form>
                        </td>
                        <td style="white-space:nowrap;">
                            <?= (int) $cat['sort_order'] ?>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $cat['id'] ?>"><input type="hidden" name="direction" value="up"><button type="submit" class="btn btn-outline btn-sm" title="Move up" style="padding:3px 8px;">&uarr;</button></form>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $cat['id'] ?>"><input type="hidden" name="direction" value="down"><button type="submit" class="btn btn-outline btn-sm" title="Move down" style="padding:3px 8px;">&darr;</button></form>
                        </td>
                        <td><?= date('d M Y', strtotime($cat['created_at'])) ?></td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/category.php?slug=<?= e($cat['slug']) ?>" target="_blank" class="btn btn-outline btn-sm">View</a>
                            <a href="<?= SITE_URL ?>/admin/category-edit.php?id=<?= (int) $cat['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int) $cat['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete the category &quot;<?= e($cat['name']) ?>&quot;? This cannot be undone.">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
