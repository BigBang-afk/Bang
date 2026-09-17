<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();

function get_singleton_banner(PDO $pdo, string $type): array
{
    $stmt = $pdo->prepare('SELECT * FROM banners WHERE type = ? ORDER BY sort_order ASC LIMIT 1');
    $stmt->execute([$type]);
    return $stmt->fetch() ?: [
        'id' => null, 'type' => $type, 'title' => '', 'subtitle' => '', 'description' => '',
        'image' => '', 'button_text' => '', 'button_url' => '', 'status' => 'active',
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save_hero' || $action === 'save_collection') {
        $type = $action === 'save_hero' ? 'hero' : 'collection';
        $existing = get_singleton_banner($pdo, $type);

        $title = trim($_POST['title'] ?? '');
        $subtitle = trim($_POST['subtitle'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $buttonText = trim($_POST['button_text'] ?? '');
        $buttonUrl = trim($_POST['button_url'] ?? '');
        $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        $imagePath = $existing['image'];
        if (!empty($_FILES['image']['name'])) {
            try {
                $newImage = handle_image_upload($_FILES['image'], 'banners');
                delete_uploaded_image($existing['image']);
                $imagePath = $newImage;
            } catch (RuntimeException $e) {
                flash('error', $e->getMessage());
                redirect(BASE_URL . '/admin/banners.php');
            }
        }

        if ($existing['id']) {
            $stmt = $pdo->prepare('UPDATE banners SET title=?, subtitle=?, description=?, image=?, button_text=?, button_url=?, status=? WHERE id=?');
            $stmt->execute([$title, $subtitle, $description, $imagePath, $buttonText, $buttonUrl, $status, $existing['id']]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO banners (type, title, subtitle, description, image, button_text, button_url, status, sort_order) VALUES (?,?,?,?,?,?,?,?,0)');
            $stmt->execute([$type, $title, $subtitle, $description, $imagePath, $buttonText, $buttonUrl, $status]);
        }
        log_activity(ucfirst($type) . ' banner updated.');
        flash('success', ucfirst($type) . ' banner updated.');
        redirect(BASE_URL . '/admin/banners.php');
    }

    if ($action === 'add_instagram') {
        if (!empty($_FILES['image']['name'])) {
            try {
                $path = handle_image_upload($_FILES['image'], 'banners');
                $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order),0)+1 FROM banners WHERE type = "instagram"');
                $stmt->execute();
                $nextOrder = (int) $stmt->fetchColumn();
                $pdo->prepare('INSERT INTO banners (type, image, button_url, sort_order, status) VALUES ("instagram", ?, ?, ?, "active")')
                    ->execute([$path, trim($_POST['button_url'] ?? ''), $nextOrder]);
                flash('success', 'Instagram image added.');
            } catch (RuntimeException $e) {
                flash('error', $e->getMessage());
            }
        }
        redirect(BASE_URL . '/admin/banners.php');
    }

    if ($action === 'delete_instagram') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT image FROM banners WHERE id = ? AND type = "instagram"');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $pdo->prepare('DELETE FROM banners WHERE id = ?')->execute([$id]);
            delete_uploaded_image($row['image']);
            flash('success', 'Instagram image removed.');
        }
        redirect(BASE_URL . '/admin/banners.php');
    }
}

$hero = get_singleton_banner($pdo, 'hero');
$collectionBanner = get_singleton_banner($pdo, 'collection');
$instagramImages = $pdo->query('SELECT * FROM banners WHERE type = "instagram" ORDER BY sort_order ASC')->fetchAll();

$pageTitle = 'Homepage & Banners';
$activeAdminNav = 'banners';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Hero Banner</h2></div>
    <p class="form-help">This appears at the very top of the homepage.</p>
    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save_hero">
        <div class="form-row">
            <div class="form-group"><label>Eyebrow / Subtitle (e.g. TIMELESS ELEGANCE)</label><input type="text" name="subtitle" class="form-control" value="<?= e($hero['subtitle']) ?>"></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" <?= $hero['status'] === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= $hero['status'] === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>
        <div class="form-group"><label>Title (e.g. Crafted to Shine Forever)</label><input type="text" name="title" class="form-control" value="<?= e($hero['title']) ?>"></div>
        <div class="form-group"><label>Description</label><textarea name="description" class="form-control"><?= e($hero['description']) ?></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Button Text</label><input type="text" name="button_text" class="form-control" value="<?= e($hero['button_text']) ?>"></div>
            <div class="form-group"><label>Button URL</label><input type="text" name="button_url" class="form-control" value="<?= e($hero['button_url']) ?>"></div>
        </div>
        <div class="form-group">
            <label>Hero Image</label>
            <?php if ($hero['image']): ?><img src="<?= e(image_url($hero['image'])) ?>" style="width:220px;height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;"><?php endif; ?>
            <input type="file" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp">
        </div>
        <button type="submit" class="btn btn-gold">Save Hero Banner</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Luxury Collection Banner</h2></div>
    <p class="form-help">This is the large black banner section on the homepage.</p>
    <form method="post" enctype="multipart/form-data">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="save_collection">
        <div class="form-row">
            <div class="form-group"><label>Eyebrow (e.g. NEW COLLECTION)</label><input type="text" name="subtitle" class="form-control" value="<?= e($collectionBanner['subtitle']) ?>"></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" <?= $collectionBanner['status'] === 'active' ? 'selected' : '' ?>>Active</option>
                    <option value="inactive" <?= $collectionBanner['status'] === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                </select>
            </div>
        </div>
        <div class="form-group"><label>Title (e.g. Modern Gold Collection)</label><input type="text" name="title" class="form-control" value="<?= e($collectionBanner['title']) ?>"></div>
        <div class="form-group"><label>Description</label><textarea name="description" class="form-control"><?= e($collectionBanner['description']) ?></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Button Text</label><input type="text" name="button_text" class="form-control" value="<?= e($collectionBanner['button_text']) ?>"></div>
            <div class="form-group"><label>Button URL</label><input type="text" name="button_url" class="form-control" value="<?= e($collectionBanner['button_url']) ?>"></div>
        </div>
        <div class="form-group">
            <label>Banner Image</label>
            <?php if ($collectionBanner['image']): ?><img src="<?= e(image_url($collectionBanner['image'])) ?>" style="width:220px;height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;"><?php endif; ?>
            <input type="file" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp">
        </div>
        <button type="submit" class="btn btn-gold">Save Collection Banner</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Instagram Grid</h2></div>
    <p class="form-help">Shown in the "Follow Zarghoon Jewellers" section on the homepage.</p>
    <form method="post" enctype="multipart/form-data" style="margin-bottom:20px;">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="add_instagram">
        <div class="form-row">
            <div class="form-group"><label>Image</label><input type="file" name="image" class="form-control" accept=".jpg,.jpeg,.png,.webp" required></div>
            <div class="form-group"><label>Link URL (optional)</label><input type="text" name="button_url" class="form-control" placeholder="https://instagram.com/p/..."></div>
        </div>
        <button type="submit" class="btn btn-outline btn-sm">Add Image</button>
    </form>
    <div class="image-grid">
        <?php foreach ($instagramImages as $img): ?>
            <div class="img-item">
                <img src="<?= e(image_url($img['image'])) ?>" alt="">
                <div class="actions">
                    <form method="post" data-confirm="Remove this image?">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="delete_instagram">
                        <input type="hidden" name="id" value="<?= (int) $img['id'] ?>">
                        <button type="submit" class="btn btn-danger btn-sm" data-confirm="Remove this image?">&times;</button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
        <?php if (!$instagramImages): ?><p class="form-help">No images added yet.</p><?php endif; ?>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
