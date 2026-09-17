<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid order ID.');
    redirect(SITE_URL . '/admin/orders.php');
}

$order = dbFetchOne('SELECT * FROM orders WHERE id = ?', [$id]);
if (!$order) {
    flash('error', 'Order not found.');
    redirect(SITE_URL . '/admin/orders.php');
}

$items = dbFetchAll('SELECT * FROM order_items WHERE order_id = ?', [$id]);

$pageTitle = 'Order ' . $order['order_number'];
$browserTitle = 'Order ' . $order['order_number'];
$activeNav = 'orders';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel-head">
    <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;">Order <?= e($order['order_number']) ?></h2>
    <a href="<?= SITE_URL ?>/admin/orders.php" class="btn btn-outline btn-sm">&larr; Back to Orders</a>
</div>

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Customer Details</h2></div>
        <p><strong>Name:</strong> <?= e($order['customer_name']) ?></p>
        <p><strong>Mobile:</strong> <?= e($order['mobile']) ?></p>
        <p><strong>Email:</strong> <?= e($order['email'] ?: '-') ?></p>
        <p><strong>Address:</strong> <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
        <?php if ($order['notes']): ?><p><strong>Notes:</strong> <?= e($order['notes']) ?></p><?php endif; ?>
    </div>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Order Summary</h2></div>
        <p><strong>Status:</strong> <span class="status-pill status-<?= e($order['order_status']) ?>"><?= e(ucfirst($order['order_status'])) ?></span></p>
        <p><strong>Payment Method:</strong> <?= e(ucwords(str_replace('_', ' ', $order['payment_method']))) ?></p>
        <p><strong>Placed:</strong> <?= date('d M Y, H:i', strtotime($order['created_at'])) ?></p>
        <p><strong>Subtotal:</strong> <?= formatPrice((float) $order['subtotal']) ?></p>
        <p><strong>Discount:</strong> <?= formatPrice((float) $order['discount']) ?></p>
        <p><strong>Total:</strong> <?= formatPrice((float) $order['total']) ?></p>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Items</h2></div>
    <?php if (!$items): ?>
        <div class="empty-state"><p>No line items recorded for this order.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                <?php foreach ($items as $it): ?>
                    <tr>
                        <td><?= e($it['product_name']) ?></td>
                        <td><?= e($it['sku']) ?></td>
                        <td><?= e($it['purity']) ?></td>
                        <td><?= rtrim(rtrim(number_format((float) $it['net_weight'], 3), '0'), '.') ?>g</td>
                        <td><?= formatPrice((float) $it['unit_price']) ?></td>
                        <td><?= (int) $it['quantity'] ?></td>
                        <td><?= formatPrice((float) $it['total_price']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
