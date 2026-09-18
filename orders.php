<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 10;
$total = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE user_id = ?', [$user['id']]);
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$orders = dbFetchAll(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ' . $perPage . ' OFFSET ' . $offset,
    [$user['id']]
);

$statusLabels = getOrderStatusOptions();
$pagination = ['page' => $page, 'total_pages' => $totalPages, 'total' => $total, 'per_page' => $perPage];

$pageTitle = 'My Orders';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>My Orders</h1></div>

        <?php if (!$orders): ?>
            <div class="empty-state">
                <p class="empty-state-title">You Haven't Placed Any Orders Yet.</p>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary" style="margin-top:14px;">Shop Now</a>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Order Number</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($orders as $o): ?>
                        <tr>
                            <td><?= e($o['order_number']) ?></td>
                            <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                            <td><?= formatPrice((float) $o['total']) ?></td>
                            <td><span class="stock-badge stock-<?= $o['order_status'] === 'cancelled' ? 'out_of_stock' : ($o['order_status'] === 'completed' ? 'in_stock' : 'made_to_order') ?>"><?= e($statusLabels[$o['order_status']] ?? $o['order_status']) ?></span></td>
                            <td><a href="<?= SITE_URL ?>/order.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php renderPagination($pagination, 'orders.php'); ?>
        <?php endif; ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
