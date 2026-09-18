<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();
$orderCounts = getCustomerOrderCounts((int) $user['id']);
$recentOrders = dbFetchAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [$user['id']]);
$statusLabels = getOrderStatusOptions();

$pageTitle = 'My Account';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading">
            <h1>My Account</h1>
            <p class="text-muted">Welcome, <?= e($user['full_name']) ?></p>
        </div>

        <div class="account-layout">
            <aside class="account-nav">
                <a href="<?= SITE_URL ?>/account.php" class="account-nav-link active">Profile</a>
                <a href="<?= SITE_URL ?>/orders.php" class="account-nav-link">Orders</a>
                <a href="<?= SITE_URL ?>/wishlist.php" class="account-nav-link">Wishlist</a>
                <a href="<?= SITE_URL ?>/account-edit.php" class="account-nav-link">Settings</a>
            </aside>

            <div class="account-content">
                <div class="account-cards">
                    <div class="account-card">
                        <h3>My Profile</h3>
                        <p class="text-muted">View and edit your personal details.</p>
                        <a href="<?= SITE_URL ?>/account-edit.php" class="btn btn-outline btn-sm">Edit Profile</a>
                    </div>
                    <div class="account-card" id="orders">
                        <h3>My Orders</h3>
                        <p class="text-muted"><?= $orderCounts['total'] ?> total &bull; <?= $orderCounts['pending'] ?> pending &bull; <?= $orderCounts['completed'] ?> completed</p>
                        <a href="<?= SITE_URL ?>/orders.php" class="btn btn-outline btn-sm">View Orders</a>
                    </div>
                    <div class="account-card">
                        <h3>My Wishlist</h3>
                        <p class="text-muted">View the pieces you've saved for later.</p>
                        <a href="<?= SITE_URL ?>/wishlist.php" class="btn btn-outline btn-sm">View Wishlist</a>
                    </div>
                    <div class="account-card is-disabled">
                        <h3>My Enquiries</h3>
                        <p class="text-muted">Your messages to us will appear here.</p>
                        <span class="tag-coming-soon">Coming Soon</span>
                    </div>
                </div>

                <div class="account-panel">
                    <h3>Profile Information</h3>
                    <dl class="account-info">
                        <div><dt>Full Name</dt><dd><?= e($user['full_name']) ?></dd></div>
                        <div><dt>Username</dt><dd><?= e($user['username']) ?></dd></div>
                        <div><dt>Mobile</dt><dd><?= e($user['mobile']) ?></dd></div>
                        <div><dt>Email</dt><dd><?= e($user['email'] ?: 'Not provided') ?></dd></div>
                        <div><dt>Member Since</dt><dd><?= date('d M Y', strtotime($user['created_at'])) ?></dd></div>
                    </dl>

                    <div class="account-actions">
                        <a href="<?= SITE_URL ?>/account-edit.php" class="btn btn-primary">Edit Profile</a>
                        <a href="<?= SITE_URL ?>/account-password.php" class="btn btn-outline">Change Password</a>
                        <a href="<?= SITE_URL ?>/logout.php" class="btn btn-outline">Logout</a>
                    </div>
                </div>

                <div class="account-panel" style="margin-top:24px;">
                    <div class="admin-panel-head">
                        <h3>Recent Orders</h3>
                        <a href="<?= SITE_URL ?>/orders.php" class="btn btn-outline btn-sm">View All</a>
                    </div>
                    <?php if (!$recentOrders): ?>
                        <p class="text-muted">You haven't placed any orders yet.</p>
                    <?php else: ?>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead><tr><th>Order Number</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
                                <tbody>
                                <?php foreach ($recentOrders as $o): ?>
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
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
