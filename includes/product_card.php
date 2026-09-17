<?php
/**
 * Reusable product card renderer.
 * Expects a product row with at least: id, slug, name, sku, purity, net_weight,
 * price, stock_status, featured, best_seller, new_arrival, main_image.
 */
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/auth.php';

function render_product_card(array $p): void
{
    static $wishlistIds = null;
    if ($wishlistIds === null) {
        $wishlistIds = [];
        $user = current_user();
        if ($user) {
            $stmt = db()->prepare('SELECT product_id FROM wishlists WHERE user_id = ?');
            $stmt->execute([$user['id']]);
            $wishlistIds = array_map('intval', array_column($stmt->fetchAll(), 'product_id'));
        }
    }

    $isWishlisted = in_array((int) $p['id'], $wishlistIds, true);
    $stockLabels = [
        'in_stock' => ['In Stock', 'stock-in'],
        'out_of_stock' => ['Out of Stock', 'stock-out'],
        'made_to_order' => ['Made to Order', 'stock-order'],
    ];
    [$stockLabel, $stockClass] = $stockLabels[$p['stock_status']] ?? ['In Stock', 'stock-in'];
    $effectivePrice = get_effective_price($p);
    ?>
    <div class="product-card reveal">
        <div class="product-media">
            <a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>">
                <img src="<?= e(image_url($p['main_image'] ?? null)) ?>" alt="<?= e($p['name']) ?>" loading="lazy">
            </a>
            <div class="product-badges">
                <?php if (!empty($p['new_arrival'])): ?><span class="badge">New</span><?php endif; ?>
                <?php if (!empty($p['best_seller'])): ?><span class="badge badge-gold">Best Seller</span><?php endif; ?>
            </div>
            <button class="wishlist-btn <?= $isWishlisted ? 'active' : '' ?>" data-product-id="<?= (int) $p['id'] ?>" aria-label="Add to wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="<?= $isWishlisted ? 'currentColor' : 'none' ?>" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.8.7 4.9 2.3C11.5 4.7 13.3 3.7 15.3 4c3.5.5 5 4 3.5 7.7C16.5 16.4 12 21 12 21z"/></svg>
            </button>
        </div>
        <div class="product-info">
            <h3><a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>"><?= e($p['name']) ?></a></h3>
            <p class="product-meta"><?= e($p['purity']) ?> Gold &bull; <?= format_weight((float) $p['net_weight']) ?></p>
            <div class="product-price-row">
                <span class="product-price"><?= currency($effectivePrice) ?></span>
                <span class="stock-tag <?= $stockClass ?>"><?= $stockLabel ?></span>
            </div>
            <div class="product-actions">
                <a href="<?= BASE_URL ?>/product.php?slug=<?= e($p['slug']) ?>" class="btn btn-outline">View Product</a>
                <a href="<?= e(whatsapp_product_link($p)) ?>" target="_blank" rel="noopener" class="btn btn-whatsapp" aria-label="Enquire on WhatsApp" title="Enquire on WhatsApp">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.42a9.9 9.9 0 0 0 4.6 1.13h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2z"/></svg>
                </a>
            </div>
        </div>
    </div>
    <?php
}
