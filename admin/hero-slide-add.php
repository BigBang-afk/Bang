<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$errors = [];
$title = '';
$subtitle = '';
$description = '';
$button1Text = '';
$button1Url = '';
$button2Text = '';
$button2Url = '';
$sortOrder = (int) dbFetchColumn('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM homepage_hero_slides');
$status = 'active';

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

    $imageFilename = null;
    if (!empty($_FILES['image']['name'])) {
        try {
            $imageFilename = secureImageUpload($_FILES['image'], BANNERS_UPLOAD_PATH);
        } catch (RuntimeException $e) {
            $errors[] = $e->getMessage();
        }
    }

    if (!$errors) {
        dbExecute(
            'INSERT INTO homepage_hero_slides (title, subtitle, description, image, button1_text, button1_url, button2_text, button2_url, status, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$title, $subtitle ?: null, $description ?: null, $imageFilename, $button1Text ?: null, $button1Url ?: null, $button2Text ?: null, $button2Url ?: null, $status, $sortOrder]
        );
        flash('success', 'Hero slide added.');
        redirect(SITE_URL . '/admin/banners.php');
    }
}

$pageTitle = 'Add Hero Slide';
$activeNav = 'banners';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head">
        <h2>Add Hero Slide</h2>
        <a href="<?= SITE_URL ?>/admin/banners.php" class="btn btn-outline btn-sm">&larr; Back to Banners</a>
    </div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="title">Hero Title</label>
            <input type="text" id="title" name="title" class="form-control" value="<?= e($title) ?>" placeholder="TIMELESS ELEGANCE" required autofocus>
        </div>
        <div class="form-group">
            <label for="subtitle">Hero Subtitle</label>
            <input type="text" id="subtitle" name="subtitle" class="form-control" value="<?= e($subtitle) ?>" placeholder="Crafted to Shine Forever">
        </div>
        <div class="form-group">
            <label for="description">Hero Description</label>
            <textarea id="description" name="description" class="form-control" rows="3" placeholder="Discover exquisite gold jewellery crafted to celebrate life's most precious moments."><?= e($description) ?></textarea>
        </div>

        <div class="form-section-title">Buttons</div>
        <div class="form-row">
            <div class="form-group">
                <label for="button1_text">Button 1 Text</label>
                <input type="text" id="button1_text" name="button1_text" class="form-control" value="<?= e($button1Text) ?>" placeholder="SHOP COLLECTION">
            </div>
            <div class="form-group">
                <label for="button1_url">Button 1 URL</label>
                <input type="text" id="button1_url" name="button1_url" class="form-control" value="<?= e($button1Url) ?>" placeholder="/shop.php">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="button2_text">Button 2 Text</label>
                <input type="text" id="button2_text" name="button2_text" class="form-control" value="<?= e($button2Text) ?>" placeholder="OUR STORY">
            </div>
            <div class="form-group">
                <label for="button2_url">Button 2 URL</label>
                <input type="text" id="button2_url" name="button2_url" class="form-control" value="<?= e($button2Url) ?>" placeholder="/collections.php">
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
            <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB. Recommended size 1600&times;900px.</p>
            <img id="image-preview" src="" alt="" style="display:none;margin-top:12px;width:100%;max-width:400px;border-radius:8px;border:1px solid var(--admin-border);">
        </div>

        <button type="submit" class="btn btn-gold">Save Slide</button>
        <a href="<?= SITE_URL ?>/admin/banners.php" class="btn btn-outline">Cancel</a>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
