<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$totalProducts = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$totalCategories = (int) $pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
$totalCustomers = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$totalOrders = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$pendingOrders = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
$todaysEnquiries = (int) $pdo->query('SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURDATE()')->fetchColumn();
$goldRates = get_current_gold_rates();

$recentOrders = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')->fetchAll();
$recentCustomers = $pdo->query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5')->fetchAll();
$recentProducts = $pdo->query('SELECT * FROM products ORDER BY created_at DESC LIMIT 5')->fetchAll();
$recentActivity = $pdo->query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 8')->fetchAll();

$pageTitle = 'Dashboard';
$activeAdminNav = 'dashboard';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-cards">
    <div class="admin-card"><div class="label">Total Products</div><div class="value"><?= $totalProducts ?></div></div>
    <div class="admin-card"><div class="label">Total Categories</div><div class="value"><?= $totalCategories ?></div></div>
    <div class="admin-card"><div class="label">Total Customers</div><div class="value"><?= $totalCustomers ?></div></div>
    <div class="admin-card"><div class="label">Total Orders</div><div class="value"><?= $totalOrders ?></div></div>
    <div class="admin-card"><div class="label">Pending Orders</div><div class="value gold"><?= $pendingOrders ?></div></div>
    <div class="admin-card"><div class="label">Today's Enquiries</div><div class="value gold"><?= $todaysEnquiries ?></div></div>
    <div class="admin-card">
        <div class="label">Current Gold Rate (21K)</div>
        <div class="value gold"><?= isset($goldRates['21K']) ? currency((float) $goldRates['21K']['rate_per_gram']) : 'Not set' ?></div>
    </div>
    <div class="admin-card">
        <div class="label">Rates Last Updated</div>
        <div class="value" style="font-size:1.1rem;"><?= isset($goldRates['21K']) ? date('d M Y', strtotime($goldRates['21K']['created_at'])) : '-' ?></div>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>Recent Orders</h2>
        <a href="orders.php" class="btn btn-outline btn-sm">View All</a>
    </div>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
            <?php if (!$recentOrders): ?>
                <tr><td colspan="5">No orders yet.</td></tr>
            <?php endif; ?>
            <?php foreach ($recentOrders as $o): ?>
                <tr>
                    <td><a href="orders.php?id=<?= (int) $o['id'] ?>"><?= e($o['order_number']) ?></a></td>
                    <td><?= e($o['name']) ?></td>
                    <td><?= currency((float) $o['total']) ?></td>
                    <td><span class="status-pill status-<?= e($o['status']) ?>"><?= e(ucfirst($o['status'])) ?></span></td>
                    <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="form-row">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Recent Customers</h2><a href="customers.php" class="btn btn-outline btn-sm">View All</a></div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Username</th><th>Mobile</th><th>Joined</th></tr></thead>
                <tbody>
                <?php foreach ($recentCustomers as $c): ?>
                    <tr><td><?= e($c['username']) ?></td><td><?= e($c['mobile']) ?></td><td><?= date('d M Y', strtotime($c['created_at'])) ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Recent Products</h2><a href="products.php" class="btn btn-outline btn-sm">View All</a></div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Name</th><th>SKU</th><th>Price</th></tr></thead>
                <tbody>
                <?php foreach ($recentProducts as $p): ?>
                    <tr><td><?= e($p['name']) ?></td><td><?= e($p['sku']) ?></td><td><?= currency(get_effective_price($p)) ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Recent Activity</h2></div>
    <ul style="margin:0;padding-left:18px;">
        <?php if (!$recentActivity): ?><li>No recent activity.</li><?php endif; ?>
        <?php foreach ($recentActivity as $a): ?>
            <li style="margin-bottom:8px;font-size:.88rem;"><?= e($a['description']) ?> <span style="color:#8a8579;">&mdash; <?= date('d M Y, H:i', strtotime($a['created_at'])) ?></span></li>
        <?php endforeach; ?>
    </ul>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
