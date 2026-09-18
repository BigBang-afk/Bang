<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid category ID.');
    redirect(SITE_URL . '/admin/categories.php');
}

$category = dbFetchOne('SELECT * FROM categories WHERE id = ?', [$id]);
if (!$category) {
    flash('error', 'Category not found.');
    redirect(SITE_URL . '/admin/categories.php');
}

$errors = [];
$name = $category['name'];
$description = $category['description'];
$sortOrder = $category['sort_order'];
$status = $category['status'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $sortOrder = (int) ($_POST['sort_order'] ?? 0);
    $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

    if ($name === '') {
        $errors[] = 'Category name is required.';
    } elseif (mb_strlen($name) > 100) {
        $errors[] = 'Category name must be 100 characters or fewer.';
    }

    // If no new image is uploaded, the existing image is preserved untouched.
    $imageFilename = $category['image'];
    if (!empty($_FILES['image']['name'])) {
        try {
            $newImage = secureImageUpload($_FILES['image'], CATEGORIES_UPLOAD_PATH);
            deleteUploadedImage($category['image'], CATEGORIES_UPLOAD_PATH);
            $imageFilename = $newImage;
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        $slug = ($name !== $category['name'])
            ? generateSlug($name, 'categories', $id)
            : $category['slug'];

        dbExecute(
            'UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, status = ?, sort_order = ? WHERE id = ?',
            [$name, $slug, $description ?: null, $imageFilename, $status, $sortOrder, $id]
        );

        flash('success', "Category \"$name\" updated successfully.");
        redirect(SITE_URL . '/admin/categories.php');
    }
}

$pageTitle = 'Edit Category';
$activeNav = 'categories';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Edit Category</h2>
        <a href="<?= SITE_URL ?>/admin/categories.php" class="btn btn-outline btn-sm">&larr; Back to Categories</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="name">Category Name</label>
            <input type="text" id="name" name="name" class="form-control" value="<?= e($name) ?>" required autofocus>
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" class="form-control" rows="3"><?= e($description) ?></textarea>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="sort_order">Sort Order</label>
                <input type="number" id="sort_order" name="sort_order" class="form-control" value="<?= (int) $sortOrder ?>">
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status" class="form-control">
                    <option value="active" <?= $status === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= $status === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>

        <div class="form-group">
            <label for="image">Category Image</label>
            <img id="image-preview" src="<?= $category['image'] ? e(CATEGORIES_UPLOAD_URL . $category['image']) : '' ?>" alt="" style="<?= $category['image'] ? '' : 'display:none;' ?>margin-bottom:12px;width:140px;height:175px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#image-preview">
            <p class="form-help">Leave empty to keep the current image. JPG, PNG, or WEBP, max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB.</p>
        </div>

        <button type="submit" class="btn btn-gold">Update Category</button>
        <a href="<?= SITE_URL ?>/admin/categories.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
