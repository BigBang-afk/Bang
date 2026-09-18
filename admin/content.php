<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $heading = trim($_POST['about_heading'] ?? '');
    $description = trim($_POST['about_description'] ?? '');
    $buttonText = trim($_POST['about_button_text'] ?? '');
    $buttonUrl = trim($_POST['about_button_url'] ?? '');

    $imageFilename = getSetting('about_image', '');
    if (!empty($_FILES['about_image']['name'])) {
        try {
            $newImage = secureImageUpload($_FILES['about_image'], BANNERS_UPLOAD_PATH);
            deleteUploadedImage($imageFilename, BANNERS_UPLOAD_PATH);
            $imageFilename = $newImage;
        } catch (RuntimeException $e) {
            flash('error', $e->getMessage());
            redirect(SITE_URL . '/admin/content.php');
        }
    }

    updateSetting('about_heading', $heading);
    updateSetting('about_description', $description);
    updateSetting('about_image', $imageFilename);
    updateSetting('about_button_text', $buttonText);
    updateSetting('about_button_url', $buttonUrl);

    flash('success', 'About section updated.');
    redirect(SITE_URL . '/admin/content.php');
}

$pageTitle = 'About Section';
$activeNav = 'about';
require __DIR__ . '/../includes/admin-header.php';

$existingImage = getSetting('about_image', '');
?>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head"><h2>Homepage About Section</h2></div>
    <p class="form-help" style="margin-top:0;">Keep this to honest, professional copy about the business - avoid inventing historical claims (e.g. specific founding years) that aren't accurate.</p>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-group">
            <label for="about_heading">Heading</label>
            <input type="text" id="about_heading" name="about_heading" class="form-control" value="<?= e(getSetting('about_heading', '')) ?>" required>
        </div>
        <div class="form-group">
            <label for="about_description">Description</label>
            <textarea id="about_description" name="about_description" class="form-control" rows="5"><?= e(getSetting('about_description', '')) ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="about_button_text">Button Text</label>
                <input type="text" id="about_button_text" name="about_button_text" class="form-control" value="<?= e(getSetting('about_button_text', '')) ?>">
            </div>
            <div class="form-group">
                <label for="about_button_url">Button URL</label>
                <input type="text" id="about_button_url" name="about_button_url" class="form-control" value="<?= e(getSetting('about_button_url', '')) ?>">
            </div>
        </div>
        <div class="form-group">
            <label for="about_image">About Image</label>
            <input type="file" id="about_image" name="about_image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#about-image-preview">
            <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB.</p>
            <img id="about-image-preview" src="<?= $existingImage ? e(BANNERS_UPLOAD_URL . $existingImage) : '' ?>" alt="" style="<?= $existingImage ? '' : 'display:none;' ?>margin-top:12px;width:100%;max-width:360px;border-radius:8px;border:1px solid var(--admin-border);">
        </div>

        <button type="submit" class="btn btn-gold">Save About Section</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
