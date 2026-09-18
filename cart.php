<?php
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $action = $_POST['action'] ?? '';
    $productId = filter_input(INPUT_POST, 'product_id', FILTER_VALIDATE_INT);

    if ($productId) {
        $currentQuantity = (int) (getCart()[$productId] ?? 0);

        if ($action === 'increase') {
            updateCartQuantity($productId, $currentQuantity + 1);
        } elseif ($action === 'decrease') {
            updateCartQuantity($productId, $currentQuantity - 1); // removes the item once it hits 0
        } elseif ($action === 'remove') {
            removeFromCart($productId);
        }
    }

    redirect(SITE_URL . '/cart.php');
}

// Every line below comes from getCartDetails(), which re-reads each
// product from the database and recalculates its price fresh via the
// same calculateProductPrice() used everywhere else - the session only
// ever holds [product_id => quantity], never a price.
$cart = getCartDetails();

$pageTitle = 'My Cart';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>Your Shopping Bag</h1></div>

        <?php if (!$cart['items']): ?>
            <div class="empty-state">
                <p class="empty-state-title">Your Bag Is Empty</p>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary" style="margin-top:14px;">Explore Jewellery</a>
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
                            <p class="text-muted">SKU: <?= e($p['sku']) ?></p>
                            <p class="text-muted"><?= e($p['purity']) ?> Gold &bull; <?= rtrim(rtrim(number_format((float) $p['net_weight'], 3), '0'), '.') ?>g</p>
                            <p><?= formatPrice($item['unit_price']) ?> each</p>
                        </div>
                        <div class="cart-row-qty">
                            <form method="post">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="decrease">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="qty-btn" aria-label="Decrease quantity">&minus;</button>
                            </form>
                            <span class="qty-value"><?= (int) $item['quantity'] ?></span>
                            <form method="post">
                                <?= csrfField() ?>
                                <input type="hidden" name="action" value="increase">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="qty-btn" aria-label="Increase quantity" <?= $item['quantity'] >= CART_MAX_QUANTITY_PER_ITEM ? 'disabled' : '' ?>>&plus;</button>
                            </form>
                        </div>
                        <div class="cart-row-total"><?= formatPrice($item['line_total']) ?></div>
                        <form method="post" class="cart-row-remove">
                            <?= csrfField() ?>
                            <input type="hidden" name="action" value="remove">
                            <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Remove this item from your bag?">Remove</button>
                        </form>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="cart-summary">
                <div class="cart-summary-line"><span>Subtotal</span><span><?= formatPrice($cart['subtotal']) ?></span></div>
                <div class="cart-summary-line"><span>Discount</span><span>&minus; <?= formatPrice($cart['discount']) ?></span></div>
                <div class="cart-summary-total"><span>Total</span><strong><?= formatPrice($cart['total']) ?></strong></div>
                <p class="form-help">Prices shown are recalculated from current records every time this page loads - nothing here is ever trusted from your browser.</p>
                <a href="<?= SITE_URL ?>/checkout.php" class="btn btn-primary btn-block">Proceed to Checkout</a>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-outline btn-block">Continue Shopping</a>
            </div>
        <?php endif; ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
