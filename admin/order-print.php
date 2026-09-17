<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$orderId = (int) ($_GET['id'] ?? 0);
$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
$order = $stmt->fetch();
if (!$order) {
    die('Order not found.');
}
$stmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
$stmt->execute([$orderId]);
$items = $stmt->fetchAll();
$shopName = get_setting('shop_name', SITE_NAME);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice <?= e($order['order_number']) ?></title>
<style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 13px; }
    .invoice-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #B08A4A; padding-bottom: 16px; margin-bottom: 24px; }
    .invoice-head h1 { font-size: 22px; margin: 0; color: #111; }
    .invoice-head .tagline { color: #B08A4A; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
    .invoice-meta { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: left; font-size: 12.5px; }
    th { background: #f5f2ec; text-transform: uppercase; font-size: 11px; }
    .totals { margin-top: 16px; width: 300px; margin-left: auto; }
    .totals td { border: none; padding: 4px 10px; }
    .totals .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #111; }
    .addr-block { margin-top: 20px; display: flex; justify-content: space-between; }
    .print-btn { margin-bottom: 20px; }
    @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<div class="print-btn"><button onclick="window.print()">Print</button></div>

<div class="invoice-head">
    <div>
        <h1><?= e($shopName) ?></h1>
        <div class="tagline"><?= e(get_setting('shop_tagline', SITE_TAGLINE)) ?></div>
        <p><?= e(get_setting('address', '')) ?><br><?= e(get_setting('phone', '')) ?></p>
    </div>
    <div class="invoice-meta">
        <h2 style="margin:0;">INVOICE</h2>
        <p><strong>Order #:</strong> <?= e($order['order_number']) ?><br>
        <strong>Date:</strong> <?= date('d M Y', strtotime($order['created_at'])) ?><br>
        <strong>Status:</strong> <?= e(ucfirst($order['status'])) ?></p>
    </div>
</div>

<div class="addr-block">
    <div>
        <strong>Bill To:</strong><br>
        <?= e($order['name']) ?><br>
        <?= e($order['mobile']) ?><br>
        <?= e($order['address']) ?>, <?= e($order['city']) ?>
    </div>
</div>

<table>
    <thead>
        <tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th>Rate/g</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr>
    </thead>
    <tbody>
        <?php foreach ($items as $it): ?>
        <tr>
            <td><?= e($it['product_name']) ?></td>
            <td><?= e($it['sku']) ?></td>
            <td><?= e($it['purity']) ?></td>
            <td><?= format_weight((float) $it['net_weight']) ?></td>
            <td><?= currency((float) $it['gold_rate']) ?></td>
            <td><?= currency((float) $it['unit_price']) ?></td>
            <td><?= (int) $it['quantity'] ?></td>
            <td><?= currency((float) $it['line_total']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>

<table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right;"><?= currency((float) $order['subtotal']) ?></td></tr>
    <tr class="grand"><td>Total</td><td style="text-align:right;"><?= currency((float) $order['total']) ?></td></tr>
</table>

<?php if ($order['notes']): ?><p style="margin-top:24px;"><strong>Notes:</strong> <?= e($order['notes']) ?></p><?php endif; ?>

<p style="margin-top:40px;font-size:11px;color:#777;">Thank you for shopping with <?= e($shopName) ?>.</p>
</body>
</html>
