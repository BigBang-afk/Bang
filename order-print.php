<?php
/**
 * Customer-facing A4-friendly printable order/invoice. Standalone page -
 * no site header/nav/footer, so nothing but the invoice itself ever
 * reaches the printed page. Access uses the same getViewableOrder()
 * check as order.php (logged-in owner, or the guest session that placed
 * the order), so a customer can never print another customer's order.
 */
require_once __DIR__ . '/includes/functions.php';

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$order = $id ? getViewableOrder($id) : null;

if (!$order) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$items = getOrderItems($order['id']);
$statusLabels = getOrderStatusOptions();
$paymentLabels = getPaymentMethodOptions();
$shopAddress = getSetting('address', 'Liaquat Bazar, Sarafa Market, Quetta, Pakistan');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Order <?= e($order['order_number']) ?> | <?= e(SITE_NAME) ?></title>
<meta name="robots" content="noindex, nofollow">
<style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #292725; margin: 0; padding: 32px; background: #fff; }
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #B08A4A; padding-bottom: 16px; margin-bottom: 24px; }
    .brand-name { font-size: 1.6rem; font-weight: 700; margin: 0; }
    .brand-tag { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #B08A4A; margin: 4px 0 0; }
    .brand-address { font-size: 0.8rem; color: #6b6864; margin: 6px 0 0; }
    .invoice-meta { text-align: right; font-size: 0.9rem; }
    .invoice-meta strong { display: block; font-size: 1.1rem; }
    .invoice-section { margin-bottom: 24px; }
    .invoice-section h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: #8f6f39; border-bottom: 1px solid #e7e0d5; padding-bottom: 6px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e7e0d5; }
    th { text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; color: #6b6864; }
    .text-right { text-align: right; }
    .invoice-totals { width: 280px; margin-left: auto; margin-top: 12px; }
    .invoice-totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.92rem; }
    .invoice-totals .grand-total { font-weight: 700; font-size: 1.1rem; border-top: 2px solid #292725; margin-top: 6px; padding-top: 8px; }
    .invoice-footer { margin-top: 40px; text-align: center; font-size: 0.85rem; color: #6b6864; }
    .no-print { margin-bottom: 20px; }
    .no-print button, .no-print a { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 10px 22px; border-radius: 4px; border: 1px solid #111; background: #111; color: #fff; cursor: pointer; text-decoration: none; font-size: 0.85rem; display: inline-block; }
    .no-print a { background: #fff; color: #111; margin-left: 8px; }
    @media print {
        .no-print { display: none; }
        body { padding: 0; }
    }
</style>
</head>
<body>
    <div class="no-print">
        <button type="button" onclick="window.print()">Print Order</button>
        <a href="<?= SITE_URL ?>/order.php?id=<?= (int) $order['id'] ?>">&larr; Back to Order</a>
    </div>

    <div class="invoice-header">
        <div>
            <p class="brand-name"><?= e(SITE_NAME) ?></p>
            <p class="brand-tag"><?= e(SITE_TAGLINE) ?></p>
            <p class="brand-address"><?= e($shopAddress) ?></p>
        </div>
        <div class="invoice-meta">
            <strong>Order <?= e($order['order_number']) ?></strong>
            <?= date('d M Y, H:i', strtotime($order['created_at'])) ?>
        </div>
    </div>

    <div class="invoice-section">
        <h3>Customer</h3>
        <p style="margin:0;"><?= e($order['customer_name']) ?><br>
        <?= e($order['mobile']) ?><?= $order['email'] ? ' &bull; ' . e($order['email']) : '' ?><br>
        <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
    </div>

    <div class="invoice-section">
        <h3>Items</h3>
        <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
            <tbody>
            <?php foreach ($items as $it): ?>
                <tr>
                    <td><?= e($it['product_name']) ?></td>
                    <td><?= e($it['sku']) ?></td>
                    <td><?= e($it['purity']) ?></td>
                    <td><?= rtrim(rtrim(number_format((float) $it['net_weight'], 3), '0'), '.') ?>g</td>
                    <td class="text-right"><?= (int) $it['quantity'] ?></td>
                    <td class="text-right"><?= formatPrice((float) $it['unit_price']) ?></td>
                    <td class="text-right"><?= formatPrice((float) $it['total_price']) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>

        <div class="invoice-totals">
            <div><span>Subtotal</span><span><?= formatPrice((float) $order['subtotal']) ?></span></div>
            <div><span>Discount</span><span>&minus; <?= formatPrice((float) $order['discount']) ?></span></div>
            <div class="grand-total"><span>Total</span><span><?= formatPrice((float) $order['total']) ?></span></div>
        </div>
    </div>

    <div class="invoice-section">
        <h3>Payment &amp; Status</h3>
        <p style="margin:0;">Payment Method: <?= e($paymentLabels[$order['payment_method']] ?? ucwords(str_replace('_', ' ', $order['payment_method']))) ?><br>
        Status: <?= e($statusLabels[$order['order_status']] ?? $order['order_status']) ?></p>
    </div>

    <?php if ($order['notes']): ?>
    <div class="invoice-section">
        <h3>Notes</h3>
        <p style="margin:0;"><?= nl2br(e($order['notes'])) ?></p>
    </div>
    <?php endif; ?>

    <div class="invoice-footer">Thank you for choosing <?= e(SITE_NAME) ?>.</div>
</body>
</html>
