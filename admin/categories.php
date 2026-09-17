<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();

// Handle status toggle / delete actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    require_csrf();
    $id = (int) ($_POST['id'] ?? 0);

    if ($_POST['action'] === 'toggle_status' && $id) {
        $stmt = $pdo->prepare("UPDATE categories SET status = IF(status='active','inactive','active') WHERE id = ?");
        $stmt->execute([$id]);
        log_activity('Category #' . $id . ' status toggled.');
        flash('success', 'Category status updated.');
    } elseif ($_POST['action'] === 'delete' && $id) {
        $stmt = $pdo->prepare('SELECT image FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        $cat = $stmt->fetch();
        if ($cat) {
            $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            delete_uploaded_image($cat['image']);
            log_activity('Category #' . $id . ' deleted.');
            flash('success', 'Category deleted.');
        }
    } elseif ($_POST['action'] === 'reorder' && $id) {
        $direction = $_POST['direction'] ?? '';
        // Swap sort_order with the adjacent category
        $stmt = $pdo->prepare('SELECT id, sort_order FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        $current = $stmt->fetch();
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $stmt = $pdo->prepare("SELECT id, sort_order FROM categories WHERE sort_order $cmp ? ORDER BY sort_order $order LIMIT 1");
            $stmt->execute([$current['sort_order']]);
            $neighbor = $stmt->fetch();
            if ($neighbor) {
                $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?')->execute([$neighbor['sort_order'], $current['id']]);
                $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?')->execute([$current['sort_order'], $neighbor['id']]);
            }
        }
    }
    redirect(BASE_URL . '/admin/categories.php');
}

$categories = $pdo->query(
    'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c ORDER BY c.sort_order ASC, c.name ASC'
)->fetchAll();

$pageTitle = 'Categories';
$activeAdminNav = 'categories';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Categories</h2>
        <a href="category-add.php" class="btn btn-gold">+ Add Category</a>
    </div>
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr><th>Image</th><th>Name</th><th>Slug</th><th>Products</th><th>Order</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
            <?php if (!$categories): ?>
                <tr><td colspan="7">No categories yet.</td></tr>
            <?php endif; ?>
            <?php foreach ($categories as $cat): ?>
                <tr>
                    <td><img class="thumb" src="<?= e(image_url($cat['image'])) ?>" alt=""></td>
                    <td><?= e($cat['name']) ?></td>
                    <td><?= e($cat['slug']) ?></td>
                    <td><?= (int) $cat['product_count'] ?></td>
                    <td>
                        <form method="post" style="display:inline;"><?= csrf_field() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $cat['id'] ?>"><input type="hidden" name="direction" value="up"><button class="btn btn-outline btn-sm" title="Move up">&uarr;</button></form>
                        <form method="post" style="display:inline;"><?= csrf_field() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $cat['id'] ?>"><input type="hidden" name="direction" value="down"><button class="btn btn-outline btn-sm" title="Move down">&darr;</button></form>
                    </td>
                    <td>
                        <form method="post" style="display:inline;">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="toggle_status">
                            <input type="hidden" name="id" value="<?= (int) $cat['id'] ?>">
                            <button class="status-pill status-<?= e($cat['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($cat['status'])) ?></button>
                        </form>
                    </td>
                    <td>
                        <a href="category-edit.php?id=<?= (int) $cat['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                        <form method="post" style="display:inline;" data-confirm-form>
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= (int) $cat['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this category? Products in it will become uncategorized.">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
