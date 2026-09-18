<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$statusLabels = ['new' => 'Unread', 'read' => 'Read', 'replied' => 'Replied', 'archived' => 'Archived'];

$statusFilter = $_GET['status'] ?? '';
$search = trim($_GET['q'] ?? '');

$where = [];
$params = [];
if ($statusFilter !== '' && isset($statusLabels[$statusFilter])) {
    $where[] = 'status = ?';
    $params[] = $statusFilter;
}
if ($search !== '') {
    $where[] = '(name LIKE ? OR email LIKE ? OR subject LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = ADMIN_ITEMS_PER_PAGE;
$total = (int) dbFetchColumn("SELECT COUNT(*) FROM messages $whereSql", $params);
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$messages = dbFetchAll("SELECT * FROM messages $whereSql ORDER BY created_at DESC LIMIT $perPage OFFSET $offset", $params);

$pagination = ['page' => $page, 'total_pages' => $totalPages, 'total' => $total, 'per_page' => $perPage];
$queryWithoutPage = $_GET;
unset($queryWithoutPage['page']);
$baseUrl = 'messages.php' . ($queryWithoutPage ? '?' . http_build_query($queryWithoutPage) : '');

$pageTitle = 'Messages';
$activeNav = 'messages';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Customer Messages (<?= $total ?>)</h2></div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" class="form-control" placeholder="Name, email, or subject..." value="<?= e($search) ?>">
        <select name="status" class="form-control">
            <option value="">All Statuses</option>
            <?php foreach ($statusLabels as $val => $label): ?>
                <option value="<?= $val ?>" <?= $statusFilter === $val ? 'selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
        </select>
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="<?= SITE_URL ?>/admin/messages.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <?php if (!$messages): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <p><?= ($search !== '' || $statusFilter !== '') ? 'No messages match your filters.' : 'No messages have been received yet.' ?></p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Subject</th><th>Date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($messages as $m): ?>
                    <tr>
                        <td><?= e($m['name']) ?></td>
                        <td><?= e($m['mobile'] ?: '-') ?></td>
                        <td><?= e($m['email'] ?: '-') ?></td>
                        <td><?= e($m['subject'] ?: '-') ?></td>
                        <td><?= date('d M Y', strtotime($m['created_at'])) ?></td>
                        <td><span class="status-pill status-<?= e($m['status']) ?>"><?= e($statusLabels[$m['status']] ?? $m['status']) ?></span></td>
                        <td><a href="<?= SITE_URL ?>/admin/message-view.php?id=<?= (int) $m['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php renderPagination($pagination, $baseUrl); ?>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
