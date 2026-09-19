<?php
require_once __DIR__ . '/includes/functions.php';

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

// getViewableOrder() scopes access to either the logged-in owner
// (id = ? AND user_id = ?) or, for a guest, an order this exact browser
// session placed AND that the database confirms has no owner - a
// non-owned, non-guest, or non-existent order id all simply return
// null here, indistinguishable from one another (this is what makes it
// IDOR-safe for both registered customers and guests).
$order = $id ? getViewableOrder($id) : null;

if (!$order) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$items = getOrderItems($order['id']);
$statusLabels = getOrderStatusOptions();
$paymentLabels = getPaymentMethodOptions();

$whatsappNumber = getSetting('whatsapp_number', '');
$whatsappConfigured = $whatsappNumber !== '' && $whatsappNumber !== 'CHANGE_ME';
$whatsappLink = $whatsappConfigured ? buildOrderWhatsAppLink($order) : null;

$pageTitle = 'Order ' . $order['order_number'];
$pageRobots = 'noindex, nofollow';
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
                <p><strong>Payment Method:</strong> <?= e($paymentLabels[$order['payment_method']] ?? ucwords(str_replace('_', ' ', $order['payment_method']))) ?></p>
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

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <a href="<?= SITE_URL ?>/order-print.php?id=<?= (int) $order['id'] ?>" target="_blank" class="btn btn-outline">Print Order</a>
            <?php if ($whatsappConfigured): ?>
                <a href="<?= e($whatsappLink) ?>" target="_blank" rel="noopener" class="btn btn-gold">Contact Zarghoon</a>
            <?php endif; ?>
            <?php if (isLoggedIn()): ?>
                <a href="<?= SITE_URL ?>/orders.php" class="btn btn-outline">&larr; Back to My Orders</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-outline">&larr; Continue Shopping</a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
