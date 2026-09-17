<?php
require_once __DIR__ . '/includes/auth.php';
require_login();

$user = current_user();
$orderId = (int) ($_GET['id'] ?? 0);

if ($orderId) {
    $stmt = db()->prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
    $stmt->execute([$orderId, $user['id']]);
    $order = $stmt->fetch();
    if (!$order) {
        flash('error', 'Order not found.');
        redirect(BASE_URL . '/orders.php');
    }
    $stmt = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll();

    $pageTitle = 'Order ' . $order['order_number'] . ' - ' . get_setting('shop_name', SITE_NAME);
    require __DIR__ . '/includes/header.php';
    ?>
    <div class="page-header">
        <div class="container">
            <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / <a href="<?= BASE_URL ?>/orders.php">My Orders</a> / <?= e($order['order_number']) ?></div>
            <h1>Order <?= e($order['order_number']) ?></h1>
        </div>
    </div>
    <div class="container section-tight">
        <p><strong>Status:</strong> <span class="stock-tag stock-in"><?= e(ucfirst($order['status'])) ?></span></p>
        <p><strong>Placed:</strong> <?= date('d M Y, H:i', strtotime($order['created_at'])) ?></p>
        <p><strong>Deliver To:</strong> <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
        <div class="table-wrap" style="margin-top:24px;">
            <table class="data-table">
                <thead><tr><th>Product</th><th>Purity</th><th>Net Wt.</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                <?php foreach ($items as $it): ?>
                    <tr>
                        <td><?= e($it['product_name']) ?></td>
                        <td><?= e($it['purity']) ?></td>
                        <td><?= format_weight((float) $it['net_weight']) ?></td>
                        <td><?= currency((float) $it['unit_price']) ?></td>
                        <td><?= (int) $it['quantity'] ?></td>
                        <td><?= currency((float) $it['line_total']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
                <tfoot><tr><td colspan="5" style="text-align:right;"><strong>Total</strong></td><td><strong><?= currency((float) $order['total']) ?></strong></td></tr></tfoot>
            </table>
        </div>
    </div>
    <?php
    require __DIR__ . '/includes/footer.php';
    exit;
}

$stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
$stmt->execute([$user['id']]);
$orders = $stmt->fetchAll();

$pageTitle = 'My Orders - ' . get_setting('shop_name', SITE_NAME);
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / My Orders</div>
        <h1>My Orders</h1>
    </div>
</div>
<div class="container section-tight">
    <?php if (!$orders): ?>
        <div class="empty-state"><h3>You haven't placed any orders yet.</h3><a href="<?= BASE_URL ?>/shop.php" class="btn btn-primary">Start Shopping</a></div>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($orders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= currency((float) $o['total']) ?></td>
                        <td><span class="stock-tag stock-<?= $o['status'] === 'cancelled' ? 'out' : 'in' ?>"><?= e(ucfirst($o['status'])) ?></span></td>
                        <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                        <td><a href="orders.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
