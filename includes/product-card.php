<?php
/**
 * Renders one product card. `include`d (not include_once) inside a
 * loop from includes/shop-listing.php, wishlist.php, and product.php's
 * related/recently-viewed sections - expects $product (a full products
 * row) in scope.
 *
 * Optional scope variables:
 *   $wishlistProductIds - the current user's saved product ids, for the
 *                         filled/outline heart state (defaults to none).
 *   $imagesByProduct     - a [product_id => [image, image]] map the
 *                         caller may have bulk-fetched already (see
 *                         shop-listing.php); falls back to a per-card
 *                         query when not provided.
 */
$wishlistProductIds = $wishlistProductIds ?? [];

$cardProductId = (int) $product['id'];
if (isset($imagesByProduct) && array_key_exists($cardProductId, $imagesByProduct)) {
    $cardImageList = $imagesByProduct[$cardProductId];
} else {
    $cardImageList = array_column(
        dbFetchAll(
            'SELECT image FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC LIMIT 2',
            [$cardProductId]
        ),
        'image'
    );
}

$primaryImage = $cardImageList[0] ?? null;
$secondaryImage = $cardImageList[1] ?? null;
$cardPrice = getProductPrice($product);
$cardIsWishlisted = in_array($cardProductId, $wishlistProductIds, true);
$cardStockLabels = ['in_stock' => 'In Stock', 'out_of_stock' => 'Out of Stock', 'made_to_order' => 'Coming Soon'];
$cardCurrentPath = $_SERVER['REQUEST_URI'] ?? '/shop.php';
?>
<div class="product-card">
    <div class="product-card-media">
        <a href="<?= SITE_URL ?>/product.php?slug=<?= e($product['slug']) ?>" class="product-card-image-link">
            <?php if ($primaryImage): ?>
                <img class="product-card-image is-primary" src="<?= e(PRODUCTS_UPLOAD_URL . $primaryImage) ?>" alt="<?= e($product['name']) ?>" loading="lazy">
            <?php else: ?>
                <span class="product-card-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg></span>
            <?php endif; ?>
            <?php if ($secondaryImage): ?>
                <img class="product-card-image is-secondary" src="<?= e(PRODUCTS_UPLOAD_URL . $secondaryImage) ?>" alt="" loading="lazy">
            <?php endif; ?>
        </a>

        <div class="product-card-badges">
            <?php if (!empty($product['new_arrival'])): ?><span class="badge badge-new">New</span><?php endif; ?>
            <?php if (!empty($product['best_seller'])): ?><span class="badge badge-bestseller">Best Seller</span><?php endif; ?>
            <?php if (!empty($product['featured'])): ?><span class="badge badge-featured">Featured</span><?php endif; ?>
        </div>

        <form method="post" action="<?= SITE_URL ?>/wishlist-toggle.php" class="product-card-wishlist">
            <?= csrfField() ?>
            <input type="hidden" name="product_id" value="<?= $cardProductId ?>">
            <input type="hidden" name="redirect" value="<?= e($cardCurrentPath) ?>">
            <button type="submit" class="wishlist-btn <?= $cardIsWishlisted ? 'is-active' : '' ?>" aria-label="<?= $cardIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist' ?>" title="<?= $cardIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist' ?>">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="<?= $cardIsWishlisted ? 'currentColor' : 'none' ?>" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.1 2.3 4.5 5.8 4c2-.3 3.9.7 5 2.4C11.9 4.7 13.8 3.7 15.8 4c3.5.5 5.3 4.1 3.8 7.7C19.5 16.1 12 21 12 21z"/></svg>
            </button>
        </form>

        <?php
            // Quick View reads these data-* attributes directly (see
            // assets/js/main.js) rather than a separate AJAX endpoint -
            // every value is already public and already on the page, so
            // there is nothing here a fetch would reveal that view-source
            // doesn't already.
        ?>
        <button type="button" class="product-card-quickview" data-quickview
            data-name="<?= e($product['name']) ?>"
            data-url="<?= SITE_URL ?>/product.php?slug=<?= e($product['slug']) ?>"
            data-image="<?= $primaryImage ? e(PRODUCTS_UPLOAD_URL . $primaryImage) : '' ?>"
            data-purity="<?= e($product['purity']) ?>"
            data-weight="<?= rtrim(rtrim(number_format((float) $product['net_weight'], 3), '0'), '.') ?>g"
            data-price="<?= e(formatPrice($cardPrice)) ?>"
            data-stock="<?= e($cardStockLabels[$product['stock_status']] ?? $product['stock_status']) ?>"
            data-in-stock="<?= $product['stock_status'] === 'in_stock' ? '1' : '0' ?>"
            data-product-id="<?= $cardProductId ?>">
            Quick View
        </button>
    </div>

    <div class="product-card-body">
        <h3 class="product-card-name"><a href="<?= SITE_URL ?>/product.php?slug=<?= e($product['slug']) ?>"><?= e($product['name']) ?></a></h3>
        <p class="product-card-meta"><?= e($product['purity']) ?> GOLD &bull; <?= rtrim(rtrim(number_format((float) $product['net_weight'], 3), '0'), '.') ?>g</p>
        <p class="product-card-price"><?= formatPrice($cardPrice) ?></p>
        <p><span class="stock-badge stock-<?= e($product['stock_status']) ?>"><?= e($cardStockLabels[$product['stock_status']] ?? $product['stock_status']) ?></span></p>
        <a href="<?= SITE_URL ?>/product.php?slug=<?= e($product['slug']) ?>" class="btn btn-outline btn-block btn-sm">View Product</a>
    </div>
</div>
