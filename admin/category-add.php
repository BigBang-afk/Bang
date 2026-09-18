<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$errors = [];
$name = '';
$description = '';
$sortOrder = 0;
$status = 'active';

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

    $imageFilename = null;
    if (!empty($_FILES['image']['name'])) {
        try {
            $imageFilename = secureImageUpload($_FILES['image'], CATEGORIES_UPLOAD_PATH);
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        // "Gold Rings" -> "gold-rings"; generateSlug() guarantees uniqueness
        // against the categories table, appending -2, -3, etc. if needed.
        $slug = generateSlug($name, 'categories');

        dbExecute(
            'INSERT INTO categories (name, slug, description, image, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [$name, $slug, $description ?: null, $imageFilename, $status, $sortOrder]
        );

        flash('success', "Category \"$name\" created successfully.");
        redirect(SITE_URL . '/admin/categories.php');
    }
}

$pageTitle = 'Add Category';
$activeNav = 'categories';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Add Category</h2>
        <a href="<?= SITE_URL ?>/admin/categories.php" class="btn btn-outline btn-sm">&larr; Back to Categories</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="name">Category Name</label>
            <input type="text" id="name" name="name" class="form-control" value="<?= e($name) ?>" required autofocus>
            <p class="form-help">The URL slug is generated automatically from this name (e.g. "Gold Rings" &rarr; "gold-rings").</p>
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" class="form-control" rows="3"><?= e($description) ?></textarea>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="sort_order">Sort Order</label>
                <input type="number" id="sort_order" name="sort_order" class="form-control" value="<?= (int) $sortOrder ?>">
                <p class="form-help">Lower numbers appear first on the storefront.</p>
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
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#image-preview">
            <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB. Recommended size 800&times;1000px.</p>
            <img id="image-preview" src="" alt="" style="display:none;margin-top:12px;width:140px;height:175px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
        </div>

        <button type="submit" class="btn btn-gold">Save Category</button>
        <a href="<?= SITE_URL ?>/admin/categories.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
