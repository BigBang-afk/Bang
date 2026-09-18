<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

// ---------------------------------------------------------------
// Stat cards (all real MySQL queries - see final report for schema notes)
// ---------------------------------------------------------------
$totalProducts = (int) dbFetchColumn('SELECT COUNT(*) FROM products WHERE status = "active"');
$totalCategories = (int) dbFetchColumn('SELECT COUNT(*) FROM categories WHERE status = "active"');
$totalCustomers = (int) dbFetchColumn('SELECT COUNT(*) FROM users WHERE status = "active"');
$totalOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders');

$pendingOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "pending"');
$confirmedOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "confirmed"');
$processingOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "processing"');
$completedOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "completed"');
$cancelledOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE order_status = "cancelled"');
$todaysOrders = (int) dbFetchColumn('SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()');

// Today's revenue counts orders that are past "pending" and not cancelled:
// confirmed, processing, ready, completed. Pending orders aren't guaranteed
// revenue yet, and cancelled orders obviously aren't revenue at all.
$todaysRevenue = (float) dbFetchColumn(
    'SELECT COALESCE(SUM(total), 0) FROM orders
     WHERE DATE(created_at) = CURDATE()
       AND order_status IN ("confirmed", "processing", "ready", "completed")'
);

$totalEnquiries = (int) dbFetchColumn('SELECT COUNT(*) FROM messages');

// ---------------------------------------------------------------
// Gold rate widget
// ---------------------------------------------------------------
$goldRates = getCurrentGoldRates();
$goldRatesUpdatedAt = null;
foreach ($goldRates as $r) {
    if ($goldRatesUpdatedAt === null || $r['created_at'] > $goldRatesUpdatedAt) {
        $goldRatesUpdatedAt = $r['created_at'];
    }
}

// ---------------------------------------------------------------
// Admin alerts (real counts only)
// ---------------------------------------------------------------
$alertCounts = getAdminAlertCounts();

// ---------------------------------------------------------------
// Recent orders / customers / products
// ---------------------------------------------------------------
$recentOrders = dbFetchAll('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
$recentCustomers = dbFetchAll('SELECT * FROM users ORDER BY created_at DESC LIMIT 8');
$recentProducts = dbFetchAll(
    'SELECT p.*, c.name AS category_name,
        (SELECT image FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS main_image
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.created_at DESC LIMIT 8'
);

$pageTitle = 'Dashboard';
$browserTitle = 'Admin Dashboard';
$activeNav = 'dashboard';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-cards">
    <div class="admin-card"><div class="label">Total Products</div><div class="value"><?= $totalProducts ?></div></div>
    <div class="admin-card"><div class="label">Total Categories</div><div class="value"><?= $totalCategories ?></div></div>
    <div class="admin-card"><div class="label">Total Customers</div><div class="value"><?= $totalCustomers ?></div></div>
    <div class="admin-card"><div class="label">Total Orders</div><div class="value"><?= $totalOrders ?></div></div>
</div>

<div class="admin-cards">
    <div class="admin-card"><div class="label">Pending Orders</div><div class="value gold"><?= $pendingOrders ?></div></div>
    <div class="admin-card"><div class="label">Confirmed Orders</div><div class="value gold"><?= $confirmedOrders ?></div></div>
    <div class="admin-card"><div class="label">Processing Orders</div><div class="value gold"><?= $processingOrders ?></div></div>
    <div class="admin-card"><div class="label">Completed Orders</div><div class="value gold"><?= $completedOrders ?></div></div>
</div>

<div class="admin-cards">
    <div class="admin-card"><div class="label">Cancelled Orders</div><div class="value"><?= $cancelledOrders ?></div></div>
    <div class="admin-card"><div class="label">Today's Orders</div><div class="value"><?= $todaysOrders ?></div></div>
    <div class="admin-card"><div class="label">Today's Revenue</div><div class="value gold"><?= formatPrice($todaysRevenue) ?></div></div>
    <div class="admin-card"><div class="label">Total Enquiries</div><div class="value"><?= $totalEnquiries ?></div></div>
</div>

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Today's Gold Rates</h2></div>
        <div class="gold-rate-grid">
            <?php foreach (['24K', '21K', '18K'] as $karat): ?>
                <div class="gold-rate-item">
                    <div class="karat"><?= $karat ?></div>
                    <?php if (isset($goldRates[$karat])): ?>
                        <div class="rate"><?= formatPrice((float) $goldRates[$karat]['rate']) ?></div>
                    <?php else: ?>
                        <div class="rate unset">Not set</div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="gold-rate-updated">
            Last updated: <?= $goldRatesUpdatedAt ? date('d M Y, H:i', strtotime($goldRatesUpdatedAt)) : 'never' ?>
        </div>
        <a href="<?= SITE_URL ?>/admin/gold-rates.php" class="btn btn-gold btn-sm">Update Gold Rates</a>
    </div>

    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Admin Alerts</h2></div>
        <?php if ($alertCounts['pending_orders'] === 0 && $alertCounts['unread_messages'] === 0 && $alertCounts['new_customers_today'] === 0): ?>
            <div class="empty-state" style="padding:24px 0;">
                <p>No alerts right now - everything is up to date.</p>
            </div>
        <?php else: ?>
            <ul class="admin-alert-list">
                <?php if ($alertCounts['pending_orders'] > 0): ?>
                    <li><span class="dot"></span> <a href="<?= SITE_URL ?>/admin/orders.php"><?= $alertCounts['pending_orders'] ?> pending order<?= $alertCounts['pending_orders'] === 1 ? '' : 's' ?></a></li>
                <?php endif; ?>
                <?php if ($alertCounts['new_customers_today'] > 0): ?>
                    <li><span class="dot"></span> <a href="<?= SITE_URL ?>/admin/customers.php"><?= $alertCounts['new_customers_today'] ?> new customer registration<?= $alertCounts['new_customers_today'] === 1 ? '' : 's' ?> today</a></li>
                <?php endif; ?>
                <?php if ($alertCounts['unread_messages'] > 0): ?>
                    <li><span class="dot"></span> <a href="<?= SITE_URL ?>/admin/messages.php"><?= $alertCounts['unread_messages'] ?> unread message<?= $alertCounts['unread_messages'] === 1 ? '' : 's' ?></a></li>
                <?php endif; ?>
            </ul>
        <?php endif; ?>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Quick Actions</h2></div>
    <div class="quick-actions-grid">
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/products.php">+ Add Product</a>
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/categories.php">+ Add Category</a>
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/collections.php">+ Add Collection</a>
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/gold-rates.php">Update Gold Rate</a>
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/orders.php">View Orders</a>
        <a class="quick-action-btn" href="<?= SITE_URL ?>/admin/customers.php">View Customers</a>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>Recent Orders</h2>
        <a href="<?= SITE_URL ?>/admin/orders.php" class="btn btn-outline btn-sm">View All</a>
    </div>
    <?php if (!$recentOrders): ?>
        <div class="empty-state">
            <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l3 3v17H6z"/></svg></div>
            <p>No orders yet.</p>
        </div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Customer</th><th>Mobile</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                <?php foreach ($recentOrders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= e($o['customer_name']) ?></td>
                        <td><?= e($o['mobile']) ?></td>
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

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head">
            <h2>Recent Customers</h2>
            <a href="<?= SITE_URL ?>/admin/customers.php" class="btn btn-outline btn-sm">View All</a>
        </div>
        <?php if (!$recentCustomers): ?>
            <div class="empty-state">
                <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></div>
                <p>No customers registered yet.</p>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Username</th><th>Mobile</th><th>Registered</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($recentCustomers as $c): ?>
                        <tr>
                            <td><?= e($c['username']) ?></td>
                            <td><?= e($c['mobile']) ?></td>
                            <td><?= date('d M Y', strtotime($c['created_at'])) ?></td>
                            <td><span class="status-pill status-<?= e($c['status']) ?>"><?= e(ucfirst($c['status'])) ?></span></td>
                            <td><a href="<?= SITE_URL ?>/admin/customer-view.php?id=<?= (int) $c['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>

    <div class="admin-panel">
        <div class="admin-panel-head">
            <h2>Recent Products</h2>
            <a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline btn-sm">View All</a>
        </div>
        <?php if (!$recentProducts): ?>
            <div class="empty-state">
                <div class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></div>
                <p>No products have been added yet.</p>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Image</th><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($recentProducts as $p): ?>
                        <tr>
                            <td>
                                <?php if ($p['main_image']): ?>
                                    <img class="thumb" src="<?= e(PRODUCTS_UPLOAD_URL . $p['main_image']) ?>" alt="">
                                <?php else: ?>
                                    <span class="thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></span>
                                <?php endif; ?>
                            </td>
                            <td><?= e($p['name']) ?></td>
                            <td><?= e($p['sku']) ?></td>
                            <td><?= e($p['category_name'] ?? '-') ?></td>
                            <td><?= formatPrice(getProductPrice($p)) ?></td>
                            <td><span class="status-pill status-<?= e($p['status']) ?>"><?= e(ucfirst($p['status'])) ?></span></td>
                            <td><a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline btn-sm">View / Edit</a></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
