<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$user = getCurrentUser();

// getCustomerOrder() scopes the query to `id = ? AND user_id = ?` - a
// non-owned or non-existent order id both simply return null here, so
// there is no way to distinguish "not yours" from "doesn't exist"
// (this is what makes it IDOR-safe).
$order = $id ? getCustomerOrder($id, (int) $user['id']) : null;

if (!$order) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$items = getOrderItems($order['id']);
$statusLabels = getOrderStatusOptions();

$pageTitle = 'Order ' . $order['order_number'];
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading">
            <h1>Order <?= e($order['order_number']) ?></h1>
            <p class="text-muted">Placed on <?= date('d M Y, H:i', strtotime($order['created_at'])) ?></p>
        </div>

        <div class="admin-grid-2">
            <div class="admin-panel">
                <h3>Order Status</h3>
                <p><span class="stock-badge stock-<?= $order['order_status'] === 'cancelled' ? 'out_of_stock' : ($order['order_status'] === 'completed' ? 'in_stock' : 'made_to_order') ?>"><?= e($statusLabels[$order['order_status']] ?? $order['order_status']) ?></span></p>
                <p><strong>Payment Method:</strong> <?= e(ucwords(str_replace('_', ' ', $order['payment_method']))) ?></p>
            </div>
            <div class="admin-panel">
                <h3>Delivery Information</h3>
                <p><strong>Name:</strong> <?= e($order['customer_name']) ?></p>
                <p><strong>Mobile:</strong> <?= e($order['mobile']) ?></p>
                <?php if ($order['email']): ?><p><strong>Email:</strong> <?= e($order['email']) ?></p><?php endif; ?>
                <p><strong>Address:</strong> <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
                <?php if ($order['notes']): ?><p><strong>Order Notes:</strong> <?= e($order['notes']) ?></p><?php endif; ?>
            </div>
        </div>

        <div class="admin-panel">
            <h3>Items</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead><tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                    <?php foreach ($items as $it): ?>
                        <tr>
                            <td><?= e($it['product_name']) ?></td>
                            <td><?= e($it['sku']) ?></td>
                            <td><?= e($it['purity']) ?></td>
                            <td><?= rtrim(rtrim(number_format((float) $it['net_weight'], 3), '0'), '.') ?>g</td>
                            <td><?= (int) $it['quantity'] ?></td>
                            <td><?= formatPrice((float) $it['unit_price']) ?></td>
                            <td><?= formatPrice((float) $it['total_price']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="cart-summary" style="margin-top:20px;">
                <div class="cart-summary-line"><span>Subtotal</span><span><?= formatPrice((float) $order['subtotal']) ?></span></div>
                <div class="cart-summary-line"><span>Discount</span><span>&minus; <?= formatPrice((float) $order['discount']) ?></span></div>
                <div class="cart-summary-total"><span>Total</span><strong><?= formatPrice((float) $order['total']) ?></strong></div>
            </div>
        </div>

        <a href="<?= SITE_URL ?>/orders.php" class="btn btn-outline">&larr; Back to My Orders</a>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
