<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save') {
        $id = (int) ($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';
        $sortOrder = (int) ($_POST['sort_order'] ?? 0);

        if ($name === '') {
            $errors[] = 'Collection name is required.';
        }

        $imagePath = null;
        if ($id) {
            $stmt = $pdo->prepare('SELECT image FROM collections WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            $imagePath = $existing['image'] ?? null;
        }
        if (!empty($_FILES['image']['name'])) {
            try {
                $newImage = handle_image_upload($_FILES['image'], 'collections');
                if ($id) delete_uploaded_image($imagePath);
                $imagePath = $newImage;
            } catch (RuntimeException $e) {
                $errors[] = $e->getMessage();
            }
        }

        if (!$errors) {
            if ($id) {
                $slug = unique_slug(slugify($name), 'collections', $id);
                $stmt = $pdo->prepare('UPDATE collections SET name=?, slug=?, description=?, image=?, status=?, sort_order=? WHERE id=?');
                $stmt->execute([$name, $slug, $description, $imagePath, $status, $sortOrder, $id]);
                flash('success', 'Collection updated.');
                log_activity('Collection "' . $name . '" updated.');
            } else {
                $slug = unique_slug(slugify($name), 'collections');
                $stmt = $pdo->prepare('INSERT INTO collections (name, slug, description, image, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([$name, $slug, $description, $imagePath, $status, $sortOrder]);
                flash('success', 'Collection created.');
                log_activity('Collection "' . $name . '" created.');
            }
            redirect(BASE_URL . '/admin/collections.php');
        }
    } elseif ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT image FROM collections WHERE id = ?');
        $stmt->execute([$id]);
        $col = $stmt->fetch();
        if ($col) {
            $pdo->prepare('DELETE FROM collections WHERE id = ?')->execute([$id]);
            delete_uploaded_image($col['image']);
            flash('success', 'Collection deleted.');
            log_activity('Collection #' . $id . ' deleted.');
        }
        redirect(BASE_URL . '/admin/collections.php');
    } elseif ($action === 'toggle_status') {
        $id = (int) ($_POST['id'] ?? 0);
        $pdo->prepare("UPDATE collections SET status = IF(status='active','inactive','active') WHERE id = ?")->execute([$id]);
        redirect(BASE_URL . '/admin/collections.php');
    }
}

$editId = (int) ($_GET['edit'] ?? 0);
$editing = null;
if ($editId) {
    $stmt = $pdo->prepare('SELECT * FROM collections WHERE id = ?');
    $stmt->execute([$editId]);
    $editing = $stmt->fetch();
}

$collections = $pdo->query(
    'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.collection_id = c.id) AS product_count
     FROM collections c ORDER BY c.sort_order ASC, c.name ASC'
)->fetchAll();

$pageTitle = 'Collections';
$activeAdminNav = 'collections';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head"><h2><?= $editing ? 'Edit Collection' : 'Add Collection' ?></h2>
        <?php if ($editing): ?><a href="collections.php" class="btn btn-outline btn-sm">+ New Collection</a><?php endif; ?>
    </div>
    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>
    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="id" value="<?= (int) ($editing['id'] ?? 0) ?>">
        <div class="form-group">
            <label>Collection Name</label>
            <input type="text" name="name" class="form-control" value="<?= e($editing['name'] ?? '') ?>" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="description" class="form-control"><?= e($editing['description'] ?? '') ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int) ($editing['sort_order'] ?? 0) ?>">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" <?= ($editing['status'] ?? 'active') === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= ($editing['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Banner Image</label>
            <?php if (!empty($editing['image'])): ?>
                <img src="<?= e(image_url($editing['image'])) ?>" alt="" style="width:220px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px;">
            <?php endif; ?>
            <input type="file" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp">
            <p class="form-help">Recommended size 1200x800px.</p>
        </div>
        <button type="submit" class="btn btn-gold"><?= $editing ? 'Update' : 'Save' ?> Collection</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>All Collections</h2></div>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Image</th><th>Name</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php foreach ($collections as $col): ?>
                <tr>
                    <td><img class="thumb" src="<?= e(image_url($col['image'])) ?>" alt=""></td>
                    <td><?= e($col['name']) ?></td>
                    <td><?= (int) $col['product_count'] ?></td>
                    <td>
                        <form method="post" style="display:inline;"><?= csrf_field() ?><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= (int) $col['id'] ?>">
                        <button class="status-pill status-<?= e($col['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($col['status'])) ?></button></form>
                    </td>
                    <td>
                        <a href="collections.php?edit=<?= (int) $col['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                        <form method="post" style="display:inline;">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= (int) $col['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this collection?">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
