<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$errors = [];
$name = '';
$description = '';
$sortOrder = 0;
$status = 'active';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $sortOrder = (int) ($_POST['sort_order'] ?? 0);
    $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

    if ($name === '') {
        $errors[] = 'Category name is required.';
    }

    $imagePath = null;
    if (!empty($_FILES['image']['name'])) {
        try {
            $imagePath = handle_image_upload($_FILES['image'], 'categories');
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        $slug = unique_slug(slugify($name), 'categories');
        $stmt = db()->prepare(
            'INSERT INTO categories (name, slug, image, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $slug, $imagePath, $description, $sortOrder, $status]);
        log_activity('Category "' . $name . '" created.');
        flash('success', 'Category created successfully.');
        redirect(BASE_URL . '/admin/categories.php');
    }
}

$pageTitle = 'Add Category';
$activeAdminNav = 'categories';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head"><h2>Add Category</h2><a href="categories.php" class="btn btn-outline btn-sm">&larr; Back</a></div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" name="name" class="form-control" value="<?= e($name) ?>" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="description" class="form-control"><?= e($description) ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int) $sortOrder ?>">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" <?= $status === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= $status === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Category Image</label>
            <input type="file" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#img-preview">
            <p class="form-help">JPG, PNG or WEBP. Max 4MB. Recommended size 800x1000px.</p>
            <img id="img-preview" src="" alt="" style="display:none;margin-top:12px;width:140px;height:175px;object-fit:cover;border-radius:8px;">
        </div>
        <button type="submit" class="btn btn-gold">Save Category</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
