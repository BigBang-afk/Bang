<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$slide = $id ? dbFetchOne('SELECT * FROM homepage_hero_slides WHERE id = ?', [$id]) : null;

if (!$slide) {
    flash('error', 'Hero slide not found.');
    redirect(SITE_URL . '/admin/banners.php');
}

$errors = [];
$title = $slide['title'];
$subtitle = $slide['subtitle'];
$description = $slide['description'];
$button1Text = $slide['button1_text'];
$button1Url = $slide['button1_url'];
$button2Text = $slide['button2_text'];
$button2Url = $slide['button2_url'];
$sortOrder = $slide['sort_order'];
$status = $slide['status'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $title = trim($_POST['title'] ?? '');
    $subtitle = trim($_POST['subtitle'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $button1Text = trim($_POST['button1_text'] ?? '');
    $button1Url = trim($_POST['button1_url'] ?? '');
    $button2Text = trim($_POST['button2_text'] ?? '');
    $button2Url = trim($_POST['button2_url'] ?? '');
    $sortOrder = (int) ($_POST['sort_order'] ?? 0);
    $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

    if ($title === '') {
        $errors[] = 'Title is required.';
    } elseif (mb_strlen($title) > 150) {
        $errors[] = 'Title must be 150 characters or fewer.';
    }

    $imageFilename = $slide['image'];
    if (!empty($_FILES['image']['name'])) {
        try {
            $newImage = secureImageUpload($_FILES['image'], BANNERS_UPLOAD_PATH);
            deleteUploadedImage($imageFilename, BANNERS_UPLOAD_PATH);
            $imageFilename = $newImage;
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        dbExecute(
            'UPDATE homepage_hero_slides SET title = ?, subtitle = ?, description = ?, image = ?, button1_text = ?, button1_url = ?, button2_text = ?, button2_url = ?, status = ?, sort_order = ? WHERE id = ?',
            [$title, $subtitle ?: null, $description ?: null, $imageFilename, $button1Text ?: null, $button1Url ?: null, $button2Text ?: null, $button2Url ?: null, $status, $sortOrder, $id]
        );
        flash('success', 'Hero slide updated.');
        redirect(SITE_URL . '/admin/banners.php');
    }
}

$pageTitle = 'Edit Hero Slide';
$activeNav = 'banners';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Edit Hero Slide</h2>
        <a href="<?= SITE_URL ?>/admin/banners.php" class="btn btn-outline btn-sm">&larr; Back to Banners</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="title">Hero Title</label>
            <input type="text" id="title" name="title" class="form-control" value="<?= e($title) ?>" required autofocus>
        </div>
        <div class="form-group">
            <label for="subtitle">Hero Subtitle</label>
            <input type="text" id="subtitle" name="subtitle" class="form-control" value="<?= e($subtitle) ?>">
        </div>
        <div class="form-group">
            <label for="description">Hero Description</label>
            <textarea id="description" name="description" class="form-control" rows="3"><?= e($description) ?></textarea>
        </div>

        <div class="form-section-title">Buttons</div>
        <div class="form-row">
            <div class="form-group">
                <label for="button1_text">Button 1 Text</label>
                <input type="text" id="button1_text" name="button1_text" class="form-control" value="<?= e($button1Text) ?>">
            </div>
            <div class="form-group">
                <label for="button1_url">Button 1 URL</label>
                <input type="text" id="button1_url" name="button1_url" class="form-control" value="<?= e($button1Url) ?>">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="button2_text">Button 2 Text</label>
                <input type="text" id="button2_text" name="button2_text" class="form-control" value="<?= e($button2Text) ?>">
            </div>
            <div class="form-group">
                <label for="button2_url">Button 2 URL</label>
                <input type="text" id="button2_url" name="button2_url" class="form-control" value="<?= e($button2Url) ?>">
            </div>
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
            <label for="image">Hero Image</label>
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#image-preview">
            <p class="form-help">Leave empty to keep the current image.</p>
            <?php if ($slide['image']): ?>
                <img id="image-preview" src="<?= e(BANNERS_UPLOAD_URL . $slide['image']) ?>" alt="" style="margin-top:12px;width:100%;max-width:400px;border-radius:8px;border:1px solid var(--admin-border);">
            <?php else: ?>
                <img id="image-preview" src="" alt="" style="display:none;margin-top:12px;width:100%;max-width:400px;border-radius:8px;border:1px solid var(--admin-border);">
            <?php endif; ?>
        </div>

        <button type="submit" class="btn btn-gold">Save Changes</button>
        <a href="<?= SITE_URL ?>/admin/banners.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
