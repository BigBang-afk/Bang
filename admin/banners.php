<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'toggle_status') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        if ($id) {
            dbExecute("UPDATE homepage_hero_slides SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ?", [$id]);
            flash('success', 'Slide status updated.');
        }
    } elseif ($action === 'delete') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $slide = $id ? dbFetchOne('SELECT * FROM homepage_hero_slides WHERE id = ?', [$id]) : null;
        if ($slide) {
            dbExecute('DELETE FROM homepage_hero_slides WHERE id = ?', [$id]);
            deleteUploadedImage($slide['image'], BANNERS_UPLOAD_PATH);
            flash('success', 'Slide deleted.');
        }
    } elseif ($action === 'reorder') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $direction = $_POST['direction'] ?? '';
        $current = $id ? dbFetchOne('SELECT id, sort_order FROM homepage_hero_slides WHERE id = ?', [$id]) : null;
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $neighbor = dbFetchOne(
                "SELECT id, sort_order FROM homepage_hero_slides WHERE sort_order $cmp ? ORDER BY sort_order $order LIMIT 1",
                [$current['sort_order']]
            );
            if ($neighbor) {
                dbExecute('UPDATE homepage_hero_slides SET sort_order = ? WHERE id = ?', [$neighbor['sort_order'], $current['id']]);
                dbExecute('UPDATE homepage_hero_slides SET sort_order = ? WHERE id = ?', [$current['sort_order'], $neighbor['id']]);
            }
        }
    } elseif ($action === 'save_collection_banner') {
        $title = trim($_POST['collection_title'] ?? '');
        $subtitle = trim($_POST['collection_subtitle'] ?? '');
        $description = trim($_POST['collection_description'] ?? '');
        $buttonText = trim($_POST['collection_button_text'] ?? '');
        $buttonUrl = trim($_POST['collection_button_url'] ?? '');

        $imageFilename = getSetting('collection_image', '');
        if (!empty($_FILES['collection_image']['name'])) {
            try {
                $newImage = secureImageUpload($_FILES['collection_image'], BANNERS_UPLOAD_PATH);
                deleteUploadedImage($imageFilename, BANNERS_UPLOAD_PATH);
                $imageFilename = $newImage;
            } catch (RuntimeException $e) {
                flash('error', $e->getMessage());
                redirect(SITE_URL . '/admin/banners.php');
            }
        }

        updateSetting('collection_title', $title);
        updateSetting('collection_subtitle', $subtitle);
        updateSetting('collection_description', $description);
        updateSetting('collection_image', $imageFilename);
        updateSetting('collection_button_text', $buttonText);
        updateSetting('collection_button_url', $buttonUrl);

        flash('success', 'Collection banner updated.');
    }

    redirect(SITE_URL . '/admin/banners.php');
}

$slides = dbFetchAll('SELECT * FROM homepage_hero_slides ORDER BY sort_order ASC, id ASC');

$pageTitle = 'Banners';
$activeNav = 'banners';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>Homepage Hero Slides (<?= count($slides) ?>)</h2>
        <a href="<?= SITE_URL ?>/admin/hero-slide-add.php" class="btn btn-gold">+ Add Slide</a>
    </div>

    <?php if (!$slides): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="12" rx="1"/></svg></div>
            <p>No hero slides yet. Add one to control what visitors see at the top of the homepage.</p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Image</th><th>Title</th><th>Subtitle</th><th>Status</th><th>Sort Order</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($slides as $slide): ?>
                    <tr>
                        <td>
                            <?php if ($slide['image']): ?>
                                <img class="thumb" src="<?= e(BANNERS_UPLOAD_URL . $slide['image']) ?>" alt="">
                            <?php else: ?>
                                <span class="thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="12" rx="1"/></svg></span>
                            <?php endif; ?>
                        </td>
                        <td><?= e($slide['title']) ?></td>
                        <td><?= e($slide['subtitle']) ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $slide['id'] ?>">
                                <button type="submit" class="status-pill status-<?= e($slide['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($slide['status'])) ?></button>
                            </form>
                        </td>
                        <td style="white-space:nowrap;">
                            <?= (int) $slide['sort_order'] ?>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $slide['id'] ?>"><input type="hidden" name="direction" value="up"><button type="submit" class="btn btn-outline btn-sm" title="Move up" style="padding:3px 8px;">&uarr;</button></form>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $slide['id'] ?>"><input type="hidden" name="direction" value="down"><button type="submit" class="btn btn-outline btn-sm" title="Move down" style="padding:3px 8px;">&darr;</button></form>
                        </td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/admin/hero-slide-edit.php?id=<?= (int) $slide['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int) $slide['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this slide? This cannot be undone.">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<div class="admin-panel" style="max-width:720px;">
    <div class="admin-panel-head"><h2>Collection Banner</h2></div>
    <p class="form-help" style="margin-top:0;">The single large luxury banner shown between Best Sellers and New Arrivals on the homepage.</p>

    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="save_collection_banner">

        <div class="form-group">
            <label for="collection_title">Eyebrow Title</label>
            <input type="text" id="collection_title" name="collection_title" class="form-control" value="<?= e(getSetting('collection_title', '')) ?>" placeholder="NEW COLLECTION">
        </div>
        <div class="form-group">
            <label for="collection_subtitle">Subtitle</label>
            <input type="text" id="collection_subtitle" name="collection_subtitle" class="form-control" value="<?= e(getSetting('collection_subtitle', '')) ?>" placeholder="Modern Gold Collection">
        </div>
        <div class="form-group">
            <label for="collection_description">Description</label>
            <textarea id="collection_description" name="collection_description" class="form-control" rows="2"><?= e(getSetting('collection_description', '')) ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="collection_button_text">Button Text</label>
                <input type="text" id="collection_button_text" name="collection_button_text" class="form-control" value="<?= e(getSetting('collection_button_text', '')) ?>" placeholder="DISCOVER COLLECTION">
            </div>
            <div class="form-group">
                <label for="collection_button_url">Button URL</label>
                <input type="text" id="collection_button_url" name="collection_button_url" class="form-control" value="<?= e(getSetting('collection_button_url', '')) ?>" placeholder="/shop.php">
            </div>
        </div>
        <div class="form-group">
            <label for="collection_image">Banner Image</label>
            <input type="file" id="collection_image" name="collection_image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#collection-image-preview">
            <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB.</p>
            <?php $existingCollectionImage = getSetting('collection_image', ''); ?>
            <img id="collection-image-preview" src="<?= $existingCollectionImage ? e(BANNERS_UPLOAD_URL . $existingCollectionImage) : '' ?>" alt="" style="<?= $existingCollectionImage ? '' : 'display:none;' ?>margin-top:12px;width:100%;max-width:400px;border-radius:8px;border:1px solid var(--admin-border);">
        </div>

        <button type="submit" class="btn btn-gold">Save Collection Banner</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
