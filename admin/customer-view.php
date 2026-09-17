<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid customer ID.');
    redirect(SITE_URL . '/admin/customers.php');
}

// Password hash is deliberately never selected/displayed.
$customer = dbFetchOne(
    'SELECT id, username, mobile, email, full_name, status, created_at, updated_at FROM users WHERE id = ?',
    [$id]
);
if (!$customer) {
    flash('error', 'Customer not found.');
    redirect(SITE_URL . '/admin/customers.php');
}

$orders = dbFetchAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [$id]);

$pageTitle = 'Customer: ' . $customer['username'];
$browserTitle = 'Customer Details';
$activeNav = 'customers';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel-head">
    <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;">Customer: <?= e($customer['username']) ?></h2>
    <a href="<?= SITE_URL ?>/admin/customers.php" class="btn btn-outline btn-sm">&larr; Back to Customers</a>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Profile</h2></div>
    <div class="admin-grid-2">
        <div>
            <p><strong>Full Name:</strong> <?= e($customer['full_name']) ?></p>
            <p><strong>Username:</strong> <?= e($customer['username']) ?></p>
            <p><strong>Mobile:</strong> <?= e($customer['mobile']) ?></p>
        </div>
        <div>
            <p><strong>Email:</strong> <?= e($customer['email'] ?: '-') ?></p>
            <p><strong>Registered:</strong> <?= date('d M Y, H:i', strtotime($customer['created_at'])) ?></p>
            <p><strong>Status:</strong> <span class="status-pill status-<?= e($customer['status']) ?>"><?= e(ucfirst($customer['status'])) ?></span></p>
        </div>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Order History</h2></div>
    <?php if (!$orders): ?>
        <div class="empty-state"><p>This customer hasn't placed any orders yet.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($orders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                        <td><?= formatPrice((float) $o['total']) ?></td>
                        <td><span class="status-pill status-<?= e($o['order_status']) ?>"><?= e(ucfirst($o['order_status'])) ?></span></td>
                        <td><a href="<?= SITE_URL ?>/admin/order-view.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
