<?php
/**
 * Admin activity log viewer (Phase 9). Read-only, admin-only, paginated
 * and filterable by admin/action/entity type/date - never shows a
 * password, CSRF token, or any other sensitive value, since
 * logAdminActivity() never stores one in the first place.
 */
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$admins = dbFetchAll('SELECT id, full_name, username FROM admins ORDER BY full_name ASC');
$actions = getDistinctActivityActions();
$entityTypes = getDistinctActivityEntityTypes();

$filters = [
    'admin_id' => filter_input(INPUT_GET, 'admin_id', FILTER_VALIDATE_INT) ?: null,
    'action' => in_array($_GET['action'] ?? '', $actions, true) ? $_GET['action'] : '',
    'entity_type' => in_array($_GET['entity_type'] ?? '', $entityTypes, true) ? $_GET['entity_type'] : '',
    'date' => $_GET['date'] ?? '',
];

$page = max(1, (int) ($_GET['page'] ?? 1));
$result = getActivityLogs($filters, $page, ADMIN_ITEMS_PER_PAGE);
$logs = $result['items'];
$pagination = $result['pagination'];

$queryWithoutPage = $_GET;
unset($queryWithoutPage['page']);
$baseUrl = 'activity-logs.php' . ($queryWithoutPage ? '?' . http_build_query($queryWithoutPage) : '');

$pageTitle = 'Activity Logs';
$activeNav = 'activity-logs';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>Admin Activity (<?= $pagination['total'] ?>)</h2>
    </div>

    <form method="get" class="filters-bar">
        <select name="admin_id" class="form-control">
            <option value="">All Admins</option>
            <?php foreach ($admins as $a): ?>
                <option value="<?= (int) $a['id'] ?>" <?= (int) ($filters['admin_id'] ?? 0) === (int) $a['id'] ? 'selected' : '' ?>><?= e($a['full_name']) ?> (@<?= e($a['username']) ?>)</option>
            <?php endforeach; ?>
        </select>
        <select name="action" class="form-control">
            <option value="">All Actions</option>
            <?php foreach ($actions as $a): ?>
                <option value="<?= e($a) ?>" <?= $filters['action'] === $a ? 'selected' : '' ?>><?= e(ucwords(str_replace('_', ' ', $a))) ?></option>
            <?php endforeach; ?>
        </select>
        <select name="entity_type" class="form-control">
            <option value="">All Types</option>
            <?php foreach ($entityTypes as $t): ?>
                <option value="<?= e($t) ?>" <?= $filters['entity_type'] === $t ? 'selected' : '' ?>><?= e(ucwords(str_replace('_', ' ', $t))) ?></option>
            <?php endforeach; ?>
        </select>
        <input type="date" name="date" class="form-control" value="<?= e($filters['date']) ?>">
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="<?= SITE_URL ?>/admin/activity-logs.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <?php if (!$logs): ?>
        <div class="empty-state">
            <p>No activity has been recorded<?= array_filter($filters) ? ' for these filters' : ' yet' ?>.</p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Admin</th><th>Action</th><th>Type</th><th>Description</th><th>IP Address</th></tr></thead>
                <tbody>
                <?php foreach ($logs as $log): ?>
                    <tr>
                        <td style="white-space:nowrap;"><?= date('d M Y, H:i', strtotime($log['created_at'])) ?></td>
                        <td><?= $log['admin_name'] ? e($log['admin_name']) . ' (@' . e($log['admin_username']) . ')' : '<span class="text-muted">System</span>' ?></td>
                        <td><span class="tag-coming-soon"><?= e(ucwords(str_replace('_', ' ', $log['action']))) ?></span></td>
                        <td><?= e(ucwords(str_replace('_', ' ', $log['entity_type']))) ?></td>
                        <td><?= e($log['description']) ?></td>
                        <td class="text-muted"><?= e($log['ip_address'] ?? '-') ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <?php renderPagination($pagination, $baseUrl); ?>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
