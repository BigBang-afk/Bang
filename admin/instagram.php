<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save_profile') {
        $username = trim($_POST['instagram_username'] ?? '');
        $url = trim($_POST['instagram_url'] ?? '');
        updateSetting('instagram_username', $username);
        updateSetting('instagram_url', $url);
        flash('success', 'Instagram profile details updated.');
    } elseif ($action === 'save_tile') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $link = trim($_POST['link'] ?? '');
        $altText = trim($_POST['alt_text'] ?? '');
        $sortOrder = (int) ($_POST['sort_order'] ?? 0);
        $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        $imageFilename = null;
        if (!empty($_FILES['image']['name'])) {
            try {
                $imageFilename = secureImageUpload($_FILES['image'], GALLERY_UPLOAD_PATH);
            } catch (RuntimeException $e) {
                flash('error', $e->getMessage());
                redirect(SITE_URL . '/admin/instagram.php');
            }
        }

        if ($id) {
            $existing = dbFetchOne('SELECT * FROM homepage_gallery WHERE id = ?', [$id]);
            if ($existing) {
                if ($imageFilename) {
                    deleteUploadedImage($existing['image'], GALLERY_UPLOAD_PATH);
                } else {
                    $imageFilename = $existing['image'];
                }
                dbExecute(
                    'UPDATE homepage_gallery SET image = ?, link = ?, alt_text = ?, sort_order = ?, status = ? WHERE id = ?',
                    [$imageFilename, $link ?: null, $altText ?: null, $sortOrder, $status, $id]
                );
                flash('success', 'Gallery tile updated.');
            }
        } elseif ($imageFilename) {
            dbExecute(
                'INSERT INTO homepage_gallery (image, link, alt_text, sort_order, status) VALUES (?, ?, ?, ?, ?)',
                [$imageFilename, $link ?: null, $altText ?: null, $sortOrder, $status]
            );
            flash('success', 'Gallery tile added.');
        } else {
            flash('error', 'An image is required to add a new tile.');
        }
    } elseif ($action === 'delete_tile') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $tile = $id ? dbFetchOne('SELECT * FROM homepage_gallery WHERE id = ?', [$id]) : null;
        if ($tile) {
            dbExecute('DELETE FROM homepage_gallery WHERE id = ?', [$id]);
            deleteUploadedImage($tile['image'], GALLERY_UPLOAD_PATH);
            flash('success', 'Gallery tile deleted.');
        }
    } elseif ($action === 'toggle_status') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        if ($id) {
            dbExecute("UPDATE homepage_gallery SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ?", [$id]);
            flash('success', 'Status updated.');
        }
    }

    redirect(SITE_URL . '/admin/instagram.php');
}

$editId = filter_input(INPUT_GET, 'edit', FILTER_VALIDATE_INT);
$editing = $editId ? dbFetchOne('SELECT * FROM homepage_gallery WHERE id = ?', [$editId]) : null;

$tiles = dbFetchAll('SELECT * FROM homepage_gallery ORDER BY sort_order ASC, id ASC');
$nextSortOrder = (int) dbFetchColumn('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM homepage_gallery');

$pageTitle = 'Instagram Gallery';
$activeNav = 'instagram';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:640px;">
    <div class="admin-panel-head"><h2>Instagram Profile</h2></div>
    <p class="form-help" style="margin-top:0;">No live Instagram feed is connected - the tiles below are manually managed images, not a real-time feed.</p>
    <form method="post">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="save_profile">
        <div class="form-row">
            <div class="form-group">
                <label for="instagram_username">Username</label>
                <input type="text" id="instagram_username" name="instagram_username" class="form-control" value="<?= e(getSetting('instagram_username', '')) ?>" placeholder="zarghoon_jewellers">
            </div>
            <div class="form-group">
                <label for="instagram_url">Profile URL</label>
                <input type="text" id="instagram_url" name="instagram_url" class="form-control" value="<?= e(getSetting('instagram_url', '')) ?>" placeholder="https://instagram.com/zarghoon_jewellers">
            </div>
        </div>
        <button type="submit" class="btn btn-gold">Save Profile</button>
    </form>
</div>

<div class="admin-panel" style="max-width:640px;">
    <div class="admin-panel-head"><h2><?= $editing ? 'Edit Gallery Tile' : 'Add Gallery Tile' ?></h2></div>
    <form method="post" enctype="multipart/form-data">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="save_tile">
        <?php if ($editing): ?><input type="hidden" name="id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>

        <div class="form-group">
            <label for="image">Image <?= $editing ? '(leave empty to keep current)' : '' ?></label>
            <input type="file" id="image" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" data-preview="#tile-image-preview" <?= $editing ? '' : 'required' ?>>
            <?php if ($editing && $editing['image']): ?>
                <img id="tile-image-preview" src="<?= e(GALLERY_UPLOAD_URL . $editing['image']) ?>" alt="" style="margin-top:12px;width:140px;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
            <?php else: ?>
                <img id="tile-image-preview" src="" alt="" style="display:none;margin-top:12px;width:140px;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--admin-border);">
            <?php endif; ?>
        </div>
        <div class="form-group">
            <label for="link">Link <span class="text-muted">(optional)</span></label>
            <input type="text" id="link" name="link" class="form-control" value="<?= e($editing['link'] ?? '') ?>" placeholder="https://instagram.com/p/...">
        </div>
        <div class="form-group">
            <label for="alt_text">Alt Text</label>
            <input type="text" id="alt_text" name="alt_text" class="form-control" value="<?= e($editing['alt_text'] ?? '') ?>" placeholder="Gold bridal necklace on display">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="sort_order">Sort Order</label>
                <input type="number" id="sort_order" name="sort_order" class="form-control" value="<?= (int) ($editing['sort_order'] ?? $nextSortOrder) ?>">
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status" class="form-control">
                    <option value="active" <?= ($editing['status'] ?? 'active') === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= ($editing['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>

        <button type="submit" class="btn btn-gold"><?= $editing ? 'Save Changes' : 'Add Tile' ?></button>
        <?php if ($editing): ?><a href="<?= SITE_URL ?>/admin/instagram.php" class="btn btn-outline">Cancel</a><?php endif; ?>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Gallery Tiles (<?= count($tiles) ?>)</h2></div>
    <?php if (!$tiles): ?>
        <div class="empty-state"><p>No gallery tiles added yet.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Image</th><th>Alt Text</th><th>Link</th><th>Status</th><th>Sort Order</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($tiles as $t): ?>
                    <tr>
                        <td><img class="thumb" src="<?= e(GALLERY_UPLOAD_URL . $t['image']) ?>" alt=""></td>
                        <td><?= e($t['alt_text']) ?></td>
                        <td><?= $t['link'] ? '<a href="' . e($t['link']) . '" target="_blank">Link</a>' : '-' ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $t['id'] ?>">
                                <button type="submit" class="status-pill status-<?= e($t['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($t['status'])) ?></button>
                            </form>
                        </td>
                        <td><?= (int) $t['sort_order'] ?></td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/admin/instagram.php?edit=<?= (int) $t['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="delete_tile">
                                <input type="hidden" name="id" value="<?= (int) $t['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this tile?">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
