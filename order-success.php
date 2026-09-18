<?php
require_once __DIR__ . '/includes/functions.php';

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$order = $id ? getViewableOrder($id) : null;

if (!$order) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$statusLabels = getOrderStatusOptions();

$whatsappNumber = getSetting('whatsapp_number', '');
$whatsappConfigured = $whatsappNumber !== '' && $whatsappNumber !== 'CHANGE_ME';
$whatsappLink = $whatsappConfigured ? buildOrderWhatsAppLink($order) : null;

$pageTitle = 'Order Confirmed';
require __DIR__ . '/includes/header.php';
?>
<section class="section" style="text-align:center;">
    <div class="container" style="max-width:560px;">
        <span class="eyebrow">Order Confirmed</span>
        <h1>Thank You for Choosing <?= e(SITE_NAME) ?>.</h1>

        <div class="admin-panel" style="text-align:left;margin-top:24px;">
            <dl class="account-info">
                <div><dt>Order Number</dt><dd><?= e($order['order_number']) ?></dd></div>
                <div><dt>Customer Name</dt><dd><?= e($order['customer_name']) ?></dd></div>
                <div><dt>Mobile</dt><dd><?= e($order['mobile']) ?></dd></div>
                <div><dt>Total</dt><dd><?= formatPrice((float) $order['total']) ?></dd></div>
                <div><dt>Order Status</dt><dd><span class="stock-badge stock-<?= $order['order_status'] === 'pending' ? 'made_to_order' : 'in_stock' ?>"><?= e($statusLabels[$order['order_status']] ?? $order['order_status']) ?></span></dd></div>
            </dl>
        </div>

        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
            <a href="<?= SITE_URL ?>/order.php?id=<?= (int) $order['id'] ?>" class="btn btn-primary">View Order</a>
            <a href="<?= SITE_URL ?>/shop.php" class="btn btn-outline">Continue Shopping</a>
            <?php if ($whatsappConfigured): ?>
                <a href="<?= e($whatsappLink) ?>" target="_blank" rel="noopener" class="btn btn-gold">Contact Us on WhatsApp</a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
