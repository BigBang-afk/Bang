<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrf();
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if ($_POST['action'] === 'toggle_status' && $id) {
        dbExecute("UPDATE collections SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ?", [$id]);
        flash('success', 'Collection status updated.');
    }
    redirect(SITE_URL . '/admin/collections.php' . (!empty($_GET['q']) ? '?q=' . urlencode($_GET['q']) : ''));
}

$search = trim($_GET['q'] ?? '');
$where = '';
$params = [];
if ($search !== '') {
    $where = 'WHERE name LIKE ? OR slug LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like];
}

$collections = dbFetchAll(
    "SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id) AS product_count
     FROM collections c $where ORDER BY c.name ASC",
    $params
);

$pageTitle = 'Collections';
$activeNav = 'collections';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Collections (<?= count($collections) ?>)</h2>
        <a href="<?= SITE_URL ?>/admin/collection-add.php" class="btn btn-gold">+ Add Collection</a>
    </div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" class="form-control" placeholder="Search by name or slug..." value="<?= e($search) ?>" style="max-width:280px;">
        <button type="submit" class="btn btn-outline btn-sm">Search</button>
        <?php if ($search !== ''): ?><a href="<?= SITE_URL ?>/admin/collections.php" class="btn btn-outline btn-sm">Reset</a><?php endif; ?>
    </form>

    <?php if (!$collections): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4zM6 8v12h12V8"/></svg></div>
            <p><?= $search !== '' ? 'No collections match "' . e($search) . '".' : 'No collections have been added yet.' ?></p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Products</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($collections as $col): ?>
                    <tr>
                        <td>
                            <?php if ($col['image']): ?>
                                <img class="thumb" src="<?= e(COLLECTIONS_UPLOAD_URL . $col['image']) ?>" alt="">
                            <?php else: ?>
                                <span class="thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4zM6 8v12h12V8"/></svg></span>
                            <?php endif; ?>
                        </td>
                        <td><?= e($col['name']) ?></td>
                        <td><?= e($col['slug']) ?></td>
                        <td><?= (int) $col['product_count'] ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $col['id'] ?>">
                                <button type="submit" class="status-pill status-<?= e($col['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($col['status'])) ?></button>
                            </form>
                        </td>
                        <td><?= date('d M Y', strtotime($col['created_at'])) ?></td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/collections.php?slug=<?= e($col['slug']) ?>" target="_blank" class="btn btn-outline btn-sm">View</a>
                            <a href="<?= SITE_URL ?>/admin/collection-edit.php?id=<?= (int) $col['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" action="<?= SITE_URL ?>/admin/collection-delete.php" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="id" value="<?= (int) $col['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete the collection &quot;<?= e($col['name']) ?>&quot;? This cannot be undone.">Delete</button>
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
