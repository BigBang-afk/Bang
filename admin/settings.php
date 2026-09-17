<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$admin = current_admin();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save_general') {
        $fields = ['shop_name', 'shop_tagline', 'address', 'phone', 'whatsapp_number', 'email',
            'instagram_url', 'instagram_username', 'facebook_url', 'youtube_url', 'currency_symbol'];
        foreach ($fields as $f) {
            set_setting($f, trim($_POST[$f] ?? ''));
        }

        foreach (['logo' => 'settings', 'favicon' => 'settings'] as $field => $dir) {
            if (!empty($_FILES[$field]['name'])) {
                try {
                    $path = handle_image_upload($_FILES[$field], $dir);
                    delete_uploaded_image(get_setting($field));
                    set_setting($field, $path);
                } catch (RuntimeException $e) {
                    $errors[] = $e->getMessage();
                }
            }
        }
        if (!$errors) {
            flash('success', 'General settings updated.');
            log_activity('Site settings updated by ' . $admin['username'] . '.');
            redirect(BASE_URL . '/admin/settings.php');
        }
    }

    if ($action === 'save_content') {
        set_setting('about_title', trim($_POST['about_title'] ?? ''));
        set_setting('about_subtitle', trim($_POST['about_subtitle'] ?? ''));
        set_setting('about_text', trim($_POST['about_text'] ?? ''));
        set_setting('meta_description', trim($_POST['meta_description'] ?? ''));
        set_setting('shipping_info', trim($_POST['shipping_info'] ?? ''));
        set_setting('return_policy', trim($_POST['return_policy'] ?? ''));

        if (!empty($_FILES['about_image']['name'])) {
            try {
                $path = handle_image_upload($_FILES['about_image'], 'settings');
                delete_uploaded_image(get_setting('about_image'));
                set_setting('about_image', $path);
            } catch (RuntimeException $e) {
                $errors[] = $e->getMessage();
            }
        }
        if (!empty($_FILES['og_image']['name'])) {
            try {
                $path = handle_image_upload($_FILES['og_image'], 'settings');
                set_setting('og_image', $path);
            } catch (RuntimeException $e) {
                $errors[] = $e->getMessage();
            }
        }

        $trustBadges = [];
        foreach ($_POST['trust_title'] ?? [] as $i => $title) {
            $title = trim($title);
            $desc = trim($_POST['trust_desc'][$i] ?? '');
            if ($title !== '') $trustBadges[] = ['title' => $title, 'description' => $desc];
        }
        set_setting('trust_badges', json_encode($trustBadges));

        $whyItems = [];
        foreach ($_POST['why_title'] ?? [] as $i => $title) {
            $title = trim($title);
            $desc = trim($_POST['why_desc'][$i] ?? '');
            if ($title !== '') $whyItems[] = ['title' => $title, 'description' => $desc];
        }
        set_setting('why_zarghoon', json_encode($whyItems));

        if (!$errors) {
            flash('success', 'Homepage content updated.');
            log_activity('Homepage content updated by ' . $admin['username'] . '.');
            redirect(BASE_URL . '/admin/settings.php');
        }
    }

    if ($action === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if (!password_verify($current, $admin['password_hash'])) {
            $errors[] = 'Current password is incorrect.';
        } elseif (strlen($new) < 8) {
            $errors[] = 'New password must be at least 8 characters.';
        } elseif ($new !== $confirm) {
            $errors[] = 'New password and confirmation do not match.';
        } else {
            $hash = password_hash($new, PASSWORD_DEFAULT);
            $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$hash, $admin['id']]);
            log_activity('Admin "' . $admin['username'] . '" changed their password.');
            flash('success', 'Password changed successfully.');
            redirect(BASE_URL . '/admin/settings.php');
        }
    }
}

$trustBadges = get_setting_json('trust_badges', []);
$whyItems = get_setting_json('why_zarghoon', []);
while (count($trustBadges) < 3) $trustBadges[] = ['title' => '', 'description' => ''];
while (count($whyItems) < 4) $whyItems[] = ['title' => '', 'description' => ''];

$pageTitle = 'Settings';
$activeAdminNav = 'settings';
require __DIR__ . '/../includes/admin_header.php';
?>

<?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>General Settings</h2></div>
    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save_general">
        <div class="form-row">
            <div class="form-group"><label>Shop Name</label><input type="text" name="shop_name" class="form-control" value="<?= e(get_setting('shop_name')) ?>"></div>
            <div class="form-group"><label>Tagline</label><input type="text" name="shop_tagline" class="form-control" value="<?= e(get_setting('shop_tagline')) ?>"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Logo</label>
                <?php if (get_setting('logo')): ?><img src="<?= e(image_url(get_setting('logo'))) ?>" style="height:50px;margin-bottom:8px;display:block;"><?php endif; ?>
                <input type="file" name="logo" class="form-control" accept=".jpg,.jpeg,.png,.webp"></div>
            <div class="form-group"><label>Favicon</label>
                <?php if (get_setting('favicon')): ?><img src="<?= e(image_url(get_setting('favicon'))) ?>" style="height:32px;margin-bottom:8px;display:block;"><?php endif; ?>
                <input type="file" name="favicon" class="form-control" accept=".jpg,.jpeg,.png,.webp"></div>
        </div>
        <div class="form-group"><label>Address</label><input type="text" name="address" class="form-control" value="<?= e(get_setting('address')) ?>"></div>
        <div class="form-row-3">
            <div class="form-group"><label>Phone</label><input type="text" name="phone" class="form-control" value="<?= e(get_setting('phone')) ?>"></div>
            <div class="form-group"><label>WhatsApp Number (digits only, with country code)</label><input type="text" name="whatsapp_number" class="form-control" value="<?= e(get_setting('whatsapp_number')) ?>" placeholder="923001234567"></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" class="form-control" value="<?= e(get_setting('email')) ?>"></div>
        </div>
        <div class="form-row-3">
            <div class="form-group"><label>Instagram URL</label><input type="text" name="instagram_url" class="form-control" value="<?= e(get_setting('instagram_url')) ?>"></div>
            <div class="form-group"><label>Facebook URL</label><input type="text" name="facebook_url" class="form-control" value="<?= e(get_setting('facebook_url')) ?>"></div>
            <div class="form-group"><label>YouTube URL</label><input type="text" name="youtube_url" class="form-control" value="<?= e(get_setting('youtube_url')) ?>"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Instagram Username (displayed)</label><input type="text" name="instagram_username" class="form-control" value="<?= e(get_setting('instagram_username')) ?>"></div>
            <div class="form-group"><label>Currency Symbol</label><input type="text" name="currency_symbol" class="form-control" value="<?= e(get_setting('currency_symbol')) ?>"></div>
        </div>
        <button type="submit" class="btn btn-gold">Save General Settings</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Homepage Content</h2></div>
    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save_content">

        <h3>About Section</h3>
        <div class="form-row">
            <div class="form-group"><label>About Eyebrow</label><input type="text" name="about_subtitle" class="form-control" value="<?= e(get_setting('about_subtitle')) ?>"></div>
            <div class="form-group"><label>About Title</label><input type="text" name="about_title" class="form-control" value="<?= e(get_setting('about_title')) ?>"></div>
        </div>
        <div class="form-group"><label>About Text</label><textarea name="about_text" class="form-control" rows="5"><?= e(get_setting('about_text')) ?></textarea></div>
        <div class="form-group">
            <label>About Image</label>
            <?php if (get_setting('about_image')): ?><img src="<?= e(image_url(get_setting('about_image'))) ?>" style="width:200px;height:130px;object-fit:cover;border-radius:8px;margin-bottom:8px;"><?php endif; ?>
            <input type="file" name="about_image" class="form-control" accept=".jpg,.jpeg,.png,.webp">
        </div>

        <h3 style="margin-top:24px;">Trust Badges (shown below the hero)</h3>
        <?php foreach ($trustBadges as $i => $badge): ?>
            <div class="form-row">
                <div class="form-group"><label>Badge <?= $i + 1 ?> Title</label><input type="text" name="trust_title[]" class="form-control" value="<?= e($badge['title']) ?>"></div>
                <div class="form-group"><label>Badge <?= $i + 1 ?> Description</label><input type="text" name="trust_desc[]" class="form-control" value="<?= e($badge['description']) ?>"></div>
            </div>
        <?php endforeach; ?>

        <h3 style="margin-top:24px;">Why Zarghoon Section</h3>
        <?php foreach ($whyItems as $i => $item): ?>
            <div class="form-row">
                <div class="form-group"><label>Item <?= $i + 1 ?> Title</label><input type="text" name="why_title[]" class="form-control" value="<?= e($item['title']) ?>"></div>
                <div class="form-group"><label>Item <?= $i + 1 ?> Description</label><input type="text" name="why_desc[]" class="form-control" value="<?= e($item['description']) ?>"></div>
            </div>
        <?php endforeach; ?>

        <h3 style="margin-top:24px;">Policies &amp; SEO</h3>
        <div class="form-group"><label>Shipping Information</label><textarea name="shipping_info" class="form-control"><?= e(get_setting('shipping_info')) ?></textarea></div>
        <div class="form-group"><label>Return Policy</label><textarea name="return_policy" class="form-control"><?= e(get_setting('return_policy')) ?></textarea></div>
        <div class="form-group"><label>Default Meta Description</label><textarea name="meta_description" class="form-control" rows="2"><?= e(get_setting('meta_description')) ?></textarea></div>
        <div class="form-group">
            <label>Default Social Share (OG) Image</label>
            <?php if (get_setting('og_image')): ?><img src="<?= e(image_url(get_setting('og_image'))) ?>" style="width:200px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;"><?php endif; ?>
            <input type="file" name="og_image" class="form-control" accept=".jpg,.jpeg,.png,.webp">
        </div>

        <button type="submit" class="btn btn-gold">Save Homepage Content</button>
    </form>
</div>

<div class="admin-panel" style="max-width:520px;">
    <div class="admin-panel-head"><h2>Change My Password</h2></div>
    <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="change_password">
        <div class="form-group"><label>Current Password</label><input type="password" name="current_password" class="form-control" required></div>
        <div class="form-group"><label>New Password</label><input type="password" name="new_password" class="form-control" minlength="8" required></div>
        <div class="form-group"><label>Confirm New Password</label><input type="password" name="confirm_password" class="form-control" minlength="8" required></div>
        <button type="submit" class="btn btn-gold">Change Password</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
