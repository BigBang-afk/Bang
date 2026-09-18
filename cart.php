<?php
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $action = $_POST['action'] ?? '';
    $productId = filter_input(INPUT_POST, 'product_id', FILTER_VALIDATE_INT);

    if ($productId) {
        if ($action === 'update') {
            $quantity = filter_input(INPUT_POST, 'quantity', FILTER_VALIDATE_INT);
            updateCartQuantity($productId, $quantity !== false && $quantity !== null ? $quantity : 0);
        } elseif ($action === 'remove') {
            removeFromCart($productId);
        }
    }

    redirect(SITE_URL . '/cart.php');
}

// Every line below comes from getCartDetails(), which re-reads each
// product from the database and recalculates its price fresh - the
// session only ever holds [product_id => quantity], never a price.
$cart = getCartDetails();

$pageTitle = 'My Cart';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>My Cart</h1></div>

        <?php if (!$cart['items']): ?>
            <div class="empty-state">
                <p>Your cart is empty.</p>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary" style="margin-top:14px;">Continue Shopping</a>
            </div>
        <?php else: ?>
            <div class="cart-table">
                <?php foreach ($cart['items'] as $item): $p = $item['product']; ?>
                    <?php $lineImage = dbFetchColumn('SELECT image FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC LIMIT 1', [$p['id']]); ?>
                    <div class="cart-row">
                        <a href="<?= SITE_URL ?>/product.php?slug=<?= e($p['slug']) ?>" class="cart-row-image">
                            <?php if ($lineImage): ?>
                                <img src="<?= e(PRODUCTS_UPLOAD_URL . $lineImage) ?>" alt="<?= e($p['name']) ?>">
                            <?php else: ?>
                                <span class="product-card-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></span>
                            <?php endif; ?>
                        </a>
                        <div class="cart-row-info">
                            <a href="<?= SITE_URL ?>/product.php?slug=<?= e($p['slug']) ?>"><?= e($p['name']) ?></a>
                            <p class="text-muted"><?= e($p['purity']) ?> GOLD &bull; <?= rtrim(rtrim(number_format((float) $p['net_weight'], 3), '0'), '.') ?>g</p>
                            <p><?= formatPrice($item['unit_price']) ?> each</p>
                        </div>
                        <form method="post" class="cart-row-qty">
                            <?= csrfField() ?>
                            <input type="hidden" name="action" value="update">
                            <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                            <input type="number" name="quantity" value="<?= (int) $item['quantity'] ?>" min="1" max="<?= CART_MAX_QUANTITY_PER_ITEM ?>" class="form-control" aria-label="Quantity">
                            <button type="submit" class="btn btn-outline btn-sm">Update</button>
                        </form>
                        <div class="cart-row-total"><?= formatPrice($item['line_total']) ?></div>
                        <form method="post" class="cart-row-remove">
                            <?= csrfField() ?>
                            <input type="hidden" name="action" value="remove">
                            <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Remove this item from your cart?">Remove</button>
                        </form>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="cart-summary">
                <div class="cart-summary-total"><span>Subtotal</span><strong><?= formatPrice($cart['subtotal']) ?></strong></div>
                <p class="form-help">Prices shown are recalculated from current records every time this page loads - nothing here is ever trusted from your browser.</p>
                <button type="button" class="btn btn-primary btn-block" disabled title="Checkout is coming in a later phase.">Proceed to Checkout &mdash; Coming Soon</button>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-outline btn-block">Continue Shopping</a>
            </div>
        <?php endif; ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
