<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $textFields = [
        'shop_name', 'tagline', 'address', 'phone', 'email',
        'instagram', 'facebook', 'youtube', 'tiktok',
        'site_title', 'meta_description',
        'currency', 'currency_symbol', 'whatsapp_number',
        'footer_description', 'copyright_text',
    ];

    $errors = [];
    $values = [];
    foreach ($textFields as $key) {
        $values[$key] = trim($_POST[$key] ?? '');
    }

    if ($values['shop_name'] === '') {
        $errors[] = 'Shop Name is required.';
    }
    if ($values['email'] !== '' && $values['email'] !== 'CHANGE_ME' && !filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }
    if ($values['currency_symbol'] === '') {
        $errors[] = 'Currency Symbol is required.';
    }

    $logoFilename = getSetting('logo', '');
    if (!empty($_FILES['logo']['name'])) {
        try {
            $newLogo = secureImageUpload($_FILES['logo'], LOGO_UPLOAD_PATH);
            deleteUploadedImage($logoFilename, LOGO_UPLOAD_PATH);
            $logoFilename = $newLogo;
        } catch (RuntimeException $e) {
            $errors[] = 'Logo: ' . $e->getMessage();
        }
    }
    if (!empty($_POST['remove_logo'])) {
        deleteUploadedImage($logoFilename, LOGO_UPLOAD_PATH);
        $logoFilename = '';
    }

    $faviconFilename = getSetting('favicon', '');
    if (!empty($_FILES['favicon']['name'])) {
        try {
            $newFavicon = secureImageUpload($_FILES['favicon'], FAVICON_UPLOAD_PATH);
            deleteUploadedImage($faviconFilename, FAVICON_UPLOAD_PATH);
            $faviconFilename = $newFavicon;
        } catch (RuntimeException $e) {
            $errors[] = 'Favicon: ' . $e->getMessage();
        }
    }
    if (!empty($_POST['remove_favicon'])) {
        deleteUploadedImage($faviconFilename, FAVICON_UPLOAD_PATH);
        $faviconFilename = '';
    }

    if ($errors) {
        foreach ($errors as $err) {
            flash('error', $err);
        }
    } else {
        foreach ($values as $key => $value) {
            updateSetting($key, $value);
        }
        updateSetting('logo', $logoFilename);
        updateSetting('favicon', $faviconFilename);
        logAdminActivity('update', 'settings', null, 'Updated site settings.');
        flash('success', 'Settings saved successfully.');
    }

    redirect(SITE_URL . '/admin/settings.php');
}

$pageTitle = 'Settings';
$activeNav = 'settings';
require __DIR__ . '/../includes/admin-header.php';

$logo = getSetting('logo', '');
$favicon = getSetting('favicon', '');
?>

<div class="admin-panel" style="max-width:820px;">
    <div class="admin-panel-head"><h2>Site Settings</h2></div>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>

        <div class="form-section-title">Shop Information</div>
        <div class="form-row">
            <div class="form-group">
                <label for="shop_name">Shop Name</label>
                <input type="text" id="shop_name" name="shop_name" class="form-control" value="<?= e(getSetting('shop_name', '')) ?>" required>
            </div>
            <div class="form-group">
                <label for="tagline">Tagline</label>
                <input type="text" id="tagline" name="tagline" class="form-control" value="<?= e(getSetting('tagline', '')) ?>">
            </div>
        </div>
        <div class="form-group">
            <label for="address">Address</label>
            <input type="text" id="address" name="address" class="form-control" value="<?= e(getSetting('address', '')) ?>">
        </div>
        <div class="form-row-3">
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="text" id="phone" name="phone" class="form-control" value="<?= e(getSetting('phone', '')) ?>">
            </div>
            <div class="form-group">
                <label for="whatsapp_number">WhatsApp Number</label>
                <input type="text" id="whatsapp_number" name="whatsapp_number" class="form-control" value="<?= e(getSetting('whatsapp_number', '')) ?>" placeholder="923001234567">
                <p class="form-help">Digits only, with country code, no + or spaces.</p>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" class="form-control" value="<?= e(getSetting('email', '')) ?>">
            </div>
        </div>

        <div class="form-section-title">Social</div>
        <div class="form-row-3">
            <div class="form-group">
                <label for="instagram">Instagram</label>
                <input type="text" id="instagram" name="instagram" class="form-control" value="<?= e(getSetting('instagram', '')) ?>" placeholder="zarghoon_jewellers">
            </div>
            <div class="form-group">
                <label for="facebook">Facebook</label>
                <input type="text" id="facebook" name="facebook" class="form-control" value="<?= e(getSetting('facebook', '')) ?>">
            </div>
            <div class="form-group">
                <label for="youtube">YouTube</label>
                <input type="text" id="youtube" name="youtube" class="form-control" value="<?= e(getSetting('youtube', '')) ?>">
            </div>
        </div>
        <div class="form-group">
            <label for="tiktok">TikTok</label>
            <input type="text" id="tiktok" name="tiktok" class="form-control" value="<?= e(getSetting('tiktok', '')) ?>">
        </div>

        <div class="form-section-title">Website</div>
        <div class="form-group">
            <label for="site_title">Site Title</label>
            <input type="text" id="site_title" name="site_title" class="form-control" value="<?= e(getSetting('site_title', '')) ?>">
        </div>
        <div class="form-group">
            <label for="meta_description">Default Meta Description</label>
            <textarea id="meta_description" name="meta_description" class="form-control" rows="2"><?= e(getSetting('meta_description', '')) ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="logo">Logo</label>
                <input type="file" id="logo" name="logo" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#logo-preview">
                <?php if ($logo): ?>
                    <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
                        <img id="logo-preview" src="<?= e(LOGO_UPLOAD_URL . $logo) ?>" alt="" style="height:48px;border-radius:6px;border:1px solid var(--admin-border);">
                        <label class="checkbox-row" style="margin:0;"><input type="checkbox" name="remove_logo" value="1"> Remove logo</label>
                    </div>
                <?php else: ?>
                    <img id="logo-preview" src="" alt="" style="display:none;margin-top:10px;height:48px;border-radius:6px;">
                    <p class="form-help">No logo uploaded - the site currently displays the "Zarghoon Jewellers" text logo.</p>
                <?php endif; ?>
            </div>
            <div class="form-group">
                <label for="favicon">Favicon</label>
                <input type="file" id="favicon" name="favicon" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#favicon-preview">
                <?php if ($favicon): ?>
                    <div style="margin-top:10px;display:flex;align-items:center;gap:10px;">
                        <img id="favicon-preview" src="<?= e(FAVICON_UPLOAD_URL . $favicon) ?>" alt="" style="height:32px;width:32px;object-fit:cover;border-radius:4px;border:1px solid var(--admin-border);">
                        <label class="checkbox-row" style="margin:0;"><input type="checkbox" name="remove_favicon" value="1"> Remove favicon</label>
                    </div>
                <?php else: ?>
                    <img id="favicon-preview" src="" alt="" style="display:none;margin-top:10px;height:32px;">
                    <p class="form-help">No favicon uploaded.</p>
                <?php endif; ?>
            </div>
        </div>

        <div class="form-section-title">Business</div>
        <div class="form-row">
            <div class="form-group">
                <label for="currency">Currency</label>
                <input type="text" id="currency" name="currency" class="form-control" value="<?= e(getSetting('currency', '')) ?>">
            </div>
            <div class="form-group">
                <label for="currency_symbol">Currency Symbol</label>
                <input type="text" id="currency_symbol" name="currency_symbol" class="form-control" value="<?= e(getSetting('currency_symbol', '')) ?>" required>
            </div>
        </div>

        <div class="form-section-title">Footer</div>
        <div class="form-group">
            <label for="footer_description">Footer Description</label>
            <textarea id="footer_description" name="footer_description" class="form-control" rows="2"><?= e(getSetting('footer_description', '')) ?></textarea>
        </div>
        <div class="form-group">
            <label for="copyright_text">Copyright Text</label>
            <input type="text" id="copyright_text" name="copyright_text" class="form-control" value="<?= e(getSetting('copyright_text', '')) ?>">
        </div>

        <button type="submit" class="btn btn-gold">Save Settings</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
