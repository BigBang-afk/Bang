<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$statusLabels = getOrderStatusOptions();

$search = trim($_GET['q'] ?? '');
$status = $_GET['status'] ?? '';
$date = $_GET['date'] ?? '';

$where = [];
$params = [];

if ($search !== '') {
    $where[] = '(order_number LIKE ? OR customer_name LIKE ? OR mobile LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if ($status !== '' && isset($statusLabels[$status])) {
    $where[] = 'order_status = ?';
    $params[] = $status;
}
if ($date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $where[] = 'DATE(created_at) = ?';
    $params[] = $date;
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = ADMIN_ITEMS_PER_PAGE;
$total = (int) dbFetchColumn("SELECT COUNT(*) FROM orders $whereSql", $params);
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$orders = dbFetchAll(
    "SELECT * FROM orders $whereSql ORDER BY created_at DESC LIMIT $perPage OFFSET $offset",
    $params
);

$pagination = ['page' => $page, 'total_pages' => $totalPages, 'total' => $total, 'per_page' => $perPage];
$queryWithoutPage = $_GET;
unset($queryWithoutPage['page']);
$baseUrl = 'orders.php' . ($queryWithoutPage ? '?' . http_build_query($queryWithoutPage) : '');

$pageTitle = 'Orders';
$activeNav = 'orders';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>All Orders (<?= $total ?>)</h2>
    </div>

    <form method="get" class="filters-bar">
        <input type="text" name="q" class="form-control" placeholder="Order #, customer name, or mobile..." value="<?= e($search) ?>">
        <select name="status" class="form-control">
            <option value="">All Statuses</option>
            <?php foreach ($statusLabels as $val => $label): ?>
                <option value="<?= $val ?>" <?= $status === $val ? 'selected' : '' ?>><?= e($label) ?></option>
            <?php endforeach; ?>
        </select>
        <input type="date" name="date" class="form-control" value="<?= e($date) ?>">
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="<?= SITE_URL ?>/admin/orders.php" class="btn btn-outline btn-sm">Reset</a>
    </form>

    <?php if (!$orders): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l3 3v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></div>
            <p><?= ($search !== '' || $status !== '' || $date !== '') ? 'No orders match your filters.' : 'No orders have been placed yet.' ?></p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Customer</th><th>Mobile</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                <?php foreach ($orders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= e($o['customer_name']) ?></td>
                        <td><?= e($o['mobile']) ?></td>
                        <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                        <td><?= formatPrice((float) $o['total']) ?></td>
                        <td><?= e(ucwords(str_replace('_', ' ', $o['payment_method']))) ?></td>
                        <td><span class="status-pill status-<?= e($o['order_status']) ?>"><?= e($statusLabels[$o['order_status']] ?? $o['order_status']) ?></span></td>
                        <td style="white-space:nowrap;">
                            <a href="<?= SITE_URL ?>/admin/order-view.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a>
                            <a href="<?= SITE_URL ?>/admin/order-print.php?id=<?= (int) $o['id'] ?>" target="_blank" class="btn btn-outline btn-sm">Print</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <?php renderPagination($pagination, $baseUrl); ?>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
