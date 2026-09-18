<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if ($action === 'toggle_status' && $id) {
        dbExecute("UPDATE newsletter_subscribers SET status = IF(status = 'subscribed', 'unsubscribed', 'subscribed') WHERE id = ?", [$id]);
        flash('success', 'Subscriber status updated.');
    }

    redirect(SITE_URL . '/admin/newsletter.php');
}

$statusFilter = $_GET['status'] ?? '';
$where = '';
$params = [];
if (in_array($statusFilter, ['subscribed', 'unsubscribed'], true)) {
    $where = 'WHERE status = ?';
    $params[] = $statusFilter;
}

$subscribers = dbFetchAll("SELECT * FROM newsletter_subscribers $where ORDER BY created_at DESC", $params);
$totalSubscribed = (int) dbFetchColumn("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'");
$totalUnsubscribed = (int) dbFetchColumn("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'unsubscribed'");

$pageTitle = 'Newsletter';
$activeNav = 'newsletter';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-cards">
    <div class="admin-card"><div class="label">Subscribed</div><div class="value gold"><?= $totalSubscribed ?></div></div>
    <div class="admin-card"><div class="label">Unsubscribed</div><div class="value"><?= $totalUnsubscribed ?></div></div>
    <div class="admin-card"><div class="label">Total</div><div class="value"><?= $totalSubscribed + $totalUnsubscribed ?></div></div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Newsletter Subscribers</h2></div>

    <form method="get" class="filters-bar">
        <select name="status" class="form-control">
            <option value="">All</option>
            <option value="subscribed" <?= $statusFilter === 'subscribed' ? 'selected' : '' ?>>Subscribed</option>
            <option value="unsubscribed" <?= $statusFilter === 'unsubscribed' ? 'selected' : '' ?>>Unsubscribed</option>
        </select>
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="<?= SITE_URL ?>/admin/newsletter.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <?php if (!$subscribers): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></svg></div>
            <p>No newsletter subscribers yet.</p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Email</th><th>Status</th><th>Subscribed On</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($subscribers as $s): ?>
                    <tr>
                        <td><?= e($s['email']) ?></td>
                        <td><span class="status-pill status-<?= $s['status'] === 'subscribed' ? 'active' : 'inactive' ?>"><?= e(ucfirst($s['status'])) ?></span></td>
                        <td><?= date('d M Y', strtotime($s['created_at'])) ?></td>
                        <td>
                            <form method="post" style="display:inline;">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="toggle_status">
                                <input type="hidden" name="id" value="<?= (int) $s['id'] ?>">
                                <button type="submit" class="btn btn-outline btn-sm"><?= $s['status'] === 'subscribed' ? 'Unsubscribe' : 'Resubscribe' ?></button>
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
