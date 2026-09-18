<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$iconOptions = getHomepageFeatureIconOptions();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'save') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $icon = $_POST['icon'] ?? 'gem';
        $sortOrder = (int) ($_POST['sort_order'] ?? 0);
        $status = ($_POST['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        $errors = [];
        if ($title === '') {
            $errors[] = 'Title is required.';
        } elseif (mb_strlen($title) > 100) {
            $errors[] = 'Title must be 100 characters or fewer.';
        }
        if (!array_key_exists($icon, $iconOptions)) {
            $errors[] = 'Please select a valid icon.';
        }

        if ($errors) {
            foreach ($errors as $err) {
                flash('error', $err);
            }
        } elseif ($id) {
            dbExecute(
                'UPDATE homepage_features SET title = ?, description = ?, icon = ?, status = ?, sort_order = ? WHERE id = ?',
                [$title, $description ?: null, $icon, $status, $sortOrder, $id]
            );
            flash('success', 'Feature updated.');
        } else {
            dbExecute(
                'INSERT INTO homepage_features (title, description, icon, status, sort_order) VALUES (?, ?, ?, ?, ?)',
                [$title, $description ?: null, $icon, $status, $sortOrder]
            );
            flash('success', 'Feature added.');
        }
    } elseif ($action === 'delete') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        if ($id) {
            dbExecute('DELETE FROM homepage_features WHERE id = ?', [$id]);
            flash('success', 'Feature deleted.');
        }
    } elseif ($action === 'toggle_status') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        if ($id) {
            dbExecute("UPDATE homepage_features SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ?", [$id]);
            flash('success', 'Status updated.');
        }
    } elseif ($action === 'reorder') {
        $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
        $direction = $_POST['direction'] ?? '';
        $current = $id ? dbFetchOne('SELECT id, sort_order FROM homepage_features WHERE id = ?', [$id]) : null;
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $neighbor = dbFetchOne(
                "SELECT id, sort_order FROM homepage_features WHERE sort_order $cmp ? ORDER BY sort_order $order LIMIT 1",
                [$current['sort_order']]
            );
            if ($neighbor) {
                dbExecute('UPDATE homepage_features SET sort_order = ? WHERE id = ?', [$neighbor['sort_order'], $current['id']]);
                dbExecute('UPDATE homepage_features SET sort_order = ? WHERE id = ?', [$current['sort_order'], $neighbor['id']]);
            }
        }
    }

    redirect(SITE_URL . '/admin/features.php');
}

$editId = filter_input(INPUT_GET, 'edit', FILTER_VALIDATE_INT);
$editing = $editId ? dbFetchOne('SELECT * FROM homepage_features WHERE id = ?', [$editId]) : null;

$features = dbFetchAll('SELECT * FROM homepage_features ORDER BY sort_order ASC, id ASC');
$nextSortOrder = (int) dbFetchColumn('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM homepage_features');

$pageTitle = 'Why Zarghoon Features';
$activeNav = 'features';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel" style="max-width:640px;">
    <div class="admin-panel-head"><h2><?= $editing ? 'Edit Feature' : 'Add Feature' ?></h2></div>
    <form method="post">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="save">
        <?php if ($editing): ?><input type="hidden" name="id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>

        <div class="form-group">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" class="form-control" value="<?= e($editing['title'] ?? '') ?>" placeholder="Authentic Gold" required>
        </div>
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" class="form-control" rows="2" placeholder="Every piece is hallmarked and verified for authenticity."><?= e($editing['description'] ?? '') ?></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="icon">Icon</label>
                <select id="icon" name="icon" class="form-control">
                    <?php foreach ($iconOptions as $val => $label): ?>
                        <option value="<?= $val ?>" <?= ($editing['icon'] ?? 'gem') === $val ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
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

        <button type="submit" class="btn btn-gold"><?= $editing ? 'Save Changes' : 'Add Feature' ?></button>
        <?php if ($editing): ?><a href="<?= SITE_URL ?>/admin/features.php" class="btn btn-outline">Cancel</a><?php endif; ?>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>All Features (<?= count($features) ?>)</h2></div>
    <?php if (!$features): ?>
        <div class="empty-state"><p>No features added yet.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Icon</th><th>Title</th><th>Description</th><th>Status</th><th>Sort Order</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($features as $f): ?>
                    <tr>
                        <td><?= renderHomepageFeatureIcon($f['icon']) ?></td>
                        <td><?= e($f['title']) ?></td>
                        <td><?= e($f['description']) ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $f['id'] ?>">
                                <button type="submit" class="status-pill status-<?= e($f['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($f['status'])) ?></button>
                            </form>
                        </td>
                        <td style="white-space:nowrap;">
                            <?= (int) $f['sort_order'] ?>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $f['id'] ?>"><input type="hidden" name="direction" value="up"><button type="submit" class="btn btn-outline btn-sm" style="padding:3px 8px;">&uarr;</button></form>
                            <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder"><input type="hidden" name="id" value="<?= (int) $f['id'] ?>"><input type="hidden" name="direction" value="down"><button type="submit" class="btn btn-outline btn-sm" style="padding:3px 8px;">&darr;</button></form>
                        </td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/admin/features.php?edit=<?= (int) $f['id'] ?>" class="btn btn-outline btn-sm">Edit</a>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int) $f['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" data-confirm="Delete this feature?">Delete</button>
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
