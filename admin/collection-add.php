<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$errors = [];
$name = '';
$description = '';
$status = 'active';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

    if ($name === '') {
        $errors[] = 'Collection name is required.';
    } elseif (mb_strlen($name) > 100) {
        $errors[] = 'Collection name must be 100 characters or fewer.';
    }

    $imageFilename = null;
    if (!empty($_FILES['image']['name'])) {
        try {
            $imageFilename = secureImageUpload($_FILES['image'], COLLECTIONS_UPLOAD_PATH);
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        $slug = generateSlug($name, 'collections');
        dbExecute(
            'INSERT INTO collections (name, slug, description, image, status) VALUES (?, ?, ?, ?, ?)',
            [$name, $slug, $description ?: null, $imageFilename, $status]
        );
        flash('success', "Collection \"$name\" created successfully.");
        redirect(SITE_URL . '/admin/collections.php');
    }
}

$pageTitle = 'Add Collection';
$activeNav = 'collections';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Add Collection</h2>
        <a href="<?= SITE_URL ?>/admin/collections.php" class="btn btn-outline btn-sm">&larr; Back to Collections</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="name">Collection Name</label>
            <input type="text" id="name" name="name" class="form-control" value="<?= e($name) ?>" placeholder="e.g. Bridal Collection, Daily Wear, New Arrivals" required autofocus>
            <p class="form-help">The URL slug is generated automatically from this name.</p>
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" class="form-control" rows="3"><?= e($description) ?></textarea>
        </div>

        <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" class="form-control">
                <option value="active" <?= $status === 'active' ? 'selected' : '' ?>>Active</option>
                <option value="inactive" <?= $status === 'inactive' ? 'selected' : '' ?>>Inactive</option>
            </select>
        </div>

        <div class="form-group">
            <label for="image">Collection Banner Image</label>
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#image-preview">
            <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB. Recommended size 1200&times;800px.</p>
            <img id="image-preview" src="" alt="" style="display:none;margin-top:12px;width:220px;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
        </div>

        <button type="submit" class="btn btn-gold">Save Collection</button>
        <a href="<?= SITE_URL ?>/admin/collections.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
