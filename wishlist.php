<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();
$products = dbFetchAll(
    'SELECT p.* FROM products p
     INNER JOIN wishlists w ON w.product_id = p.id
     WHERE w.user_id = ? AND p.status = "active"
     ORDER BY w.created_at DESC',
    [$user['id']]
);
$wishlistProductIds = array_map('intval', array_column($products, 'id'));
$imagesByProduct = bulkFetchProductImages($wishlistProductIds);

$pageTitle = 'My Wishlist';
$pageRobots = 'noindex, nofollow';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>My Wishlist</h1></div>

        <?php if (!$products): ?>
            <div class="empty-state">
                <p>You haven't saved any pieces yet.</p>
                <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary" style="margin-top:14px;">Browse the Shop</a>
            </div>
        <?php else: ?>
            <div class="product-grid">
                <?php foreach ($products as $product): ?>
                    <?php include __DIR__ . '/includes/product-card.php'; ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
