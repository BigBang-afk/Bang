<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/cart.php';
require_once __DIR__ . '/includes/product_card.php';
require_login();

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';
    $productId = (int) ($_POST['product_id'] ?? 0);

    if ($action === 'remove') {
        db()->prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?')->execute([$user['id'], $productId]);
        flash('info', 'Removed from wishlist.');
    } elseif ($action === 'move_to_cart') {
        add_to_cart($productId, 1);
        db()->prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?')->execute([$user['id'], $productId]);
        flash('success', 'Moved to cart.');
    }
    redirect(BASE_URL . '/wishlist.php');
}

$stmt = db()->prepare(
    'SELECT p.*, (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image
     FROM wishlists w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? AND p.status = "active" ORDER BY w.created_at DESC'
);
$stmt->execute([$user['id']]);
$products = $stmt->fetchAll();

$pageTitle = 'My Wishlist - ' . get_setting('shop_name', SITE_NAME);
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Wishlist</div>
        <h1>My Wishlist</h1>
    </div>
</div>
<div class="container section-tight">
    <?php if (!$products): ?>
        <div class="empty-state"><h3>Your wishlist is empty.</h3><a href="<?= BASE_URL ?>/shop.php" class="btn btn-primary">Discover Jewellery</a></div>
    <?php else: ?>
        <div class="product-grid">
            <?php foreach ($products as $p): ?>
                <div class="product-card">
                    <div class="product-media">
                        <a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>"><img src="<?= e(image_url($p['main_image'])) ?>" alt="<?= e($p['name']) ?>" loading="lazy"></a>
                    </div>
                    <div class="product-info">
                        <h3><a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>"><?= e($p['name']) ?></a></h3>
                        <p class="product-meta"><?= e($p['purity']) ?> Gold &bull; <?= format_weight((float) $p['net_weight']) ?></p>
                        <p class="product-price"><?= currency(get_effective_price($p)) ?></p>
                        <div class="product-actions">
                            <form method="post" style="flex:1;">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="move_to_cart">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="btn btn-primary btn-block">Move to Cart</button>
                            </form>
                            <form method="post">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="remove">
                                <input type="hidden" name="product_id" value="<?= (int) $p['id'] ?>">
                                <button type="submit" class="btn btn-outline">Remove</button>
                            </form>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
