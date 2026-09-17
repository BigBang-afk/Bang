<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/cart.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';
    $productId = (int) ($_POST['product_id'] ?? 0);

    if ($action === 'update') {
        update_cart_quantity($productId, (int) ($_POST['quantity'] ?? 1));
    } elseif ($action === 'remove') {
        remove_from_cart($productId);
        flash('info', 'Item removed from cart.');
    }
    redirect(BASE_URL . '/cart.php');
}

$items = get_cart_items();
$subtotal = cart_subtotal($items);

$pageTitle = 'Shopping Cart - ' . get_setting('shop_name', SITE_NAME);
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Cart</div>
        <h1>Your Shopping Cart</h1>
    </div>
</div>

<div class="container section-tight">
    <?php if (!$items): ?>
        <div class="empty-state">
            <h3>Your cart is empty.</h3>
            <p>Discover our latest pieces and add your favourites to the cart.</p>
            <a href="<?= BASE_URL ?>/shop.php" class="btn btn-primary">Continue Shopping</a>
        </div>
    <?php else: ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Product</th><th>Purity / Weight</th><th>Rate Used</th><th>Unit Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($items as $item): $p = $item['product']; ?>
                    <tr>
                        <td style="display:flex;align-items:center;gap:12px;min-width:220px;">
                            <img src="<?= e(image_url($p['main_image'] ?? null)) ?>" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;">
                            <a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>"><?= e($p['name']) ?></a>
                        </td>
                        <td><?= e($p['purity']) ?> &bull; <?= format_weight((float) $p['net_weight']) ?></td>
                        <td><?= currency(get_rate_for_karat($p['purity']) ?? (float) $p['gold_rate']) ?>/g</td>
                        <td><?= currency($item['unit_price']) ?></td>
                        <td>
                            <form method="post" style="display:flex;align-items:center;gap:6px;">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="update">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <input type="number" name="quantity" value="<?= (int) $item['quantity'] ?>" min="1" max="10" style="width:56px;padding:6px;border:1px solid var(--border-soft);border-radius:4px;" onchange="this.form.submit()">
                            </form>
                        </td>
                        <td><?= currency($item['line_total']) ?></td>
                        <td>
                            <form method="post">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="remove">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="btn btn-outline btn-sm">Remove</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:30px;">
            <div style="width:320px;">
                <div style="display:flex;justify-content:space-between;font-size:1.1rem;margin-bottom:20px;">
                    <strong>Subtotal</strong><strong><?= currency($subtotal) ?></strong>
                </div>
                <a href="<?= BASE_URL ?>/checkout.php" class="btn btn-primary btn-block">Proceed to Checkout</a>
                <?php
                $waLines = ["Hello " . get_setting('shop_name', SITE_NAME) . ", I would like to enquire about the following items:"];
                foreach ($items as $item) {
                    $waLines[] = '- ' . $item['product']['name'] . ' (SKU: ' . $item['product']['sku'] . ') x' . $item['quantity'] . ' - ' . currency($item['line_total']);
                }
                $waLines[] = 'Subtotal: ' . currency($subtotal);
                ?>
                <a href="<?= e(whatsapp_link(implode("\n", $waLines))) ?>" target="_blank" rel="noopener" class="btn btn-whatsapp btn-block" style="margin-top:10px;">Enquire on WhatsApp</a>
                <a href="<?= BASE_URL ?>/shop.php" class="btn btn-outline btn-block" style="margin-top:10px;">Continue Shopping</a>
            </div>
        </div>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
