<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid collection ID.');
    redirect(SITE_URL . '/admin/collections.php');
}

$collection = dbFetchOne('SELECT * FROM collections WHERE id = ?', [$id]);
if (!$collection) {
    flash('error', 'Collection not found.');
    redirect(SITE_URL . '/admin/collections.php');
}

$errors = [];
$name = $collection['name'];
$description = $collection['description'];
$status = $collection['status'];

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

    $imageFilename = $collection['image'];
    if (!empty($_FILES['image']['name'])) {
        try {
            $newImage = secureImageUpload($_FILES['image'], COLLECTIONS_UPLOAD_PATH);
            deleteUploadedImage($collection['image'], COLLECTIONS_UPLOAD_PATH);
            $imageFilename = $newImage;
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        $slug = ($name !== $collection['name'])
            ? generateSlug($name, 'collections', $id)
            : $collection['slug'];

        dbExecute(
            'UPDATE collections SET name = ?, slug = ?, description = ?, image = ?, status = ? WHERE id = ?',
            [$name, $slug, $description ?: null, $imageFilename, $status, $id]
        );

        flash('success', "Collection \"$name\" updated successfully.");
        redirect(SITE_URL . '/admin/collections.php');
    }
}

$pageTitle = 'Edit Collection';
$activeNav = 'collections';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Edit Collection</h2>
        <a href="<?= SITE_URL ?>/admin/collections.php" class="btn btn-outline btn-sm">&larr; Back to Collections</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="name">Collection Name</label>
            <input type="text" id="name" name="name" class="form-control" value="<?= e($name) ?>" required autofocus>
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
            <img id="image-preview" src="<?= $collection['image'] ? e(COLLECTIONS_UPLOAD_URL . $collection['image']) : '' ?>" alt="" style="<?= $collection['image'] ? '' : 'display:none;' ?>margin-bottom:12px;width:220px;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#image-preview">
            <p class="form-help">Leave empty to keep the current image.</p>
        </div>

        <button type="submit" class="btn btn-gold">Update Collection</button>
        <a href="<?= SITE_URL ?>/admin/collections.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
