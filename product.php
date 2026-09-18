<?php
require_once __DIR__ . '/includes/functions.php';

$slug = trim((string) ($_GET['slug'] ?? ''));
$product = $slug !== '' ? getProductBySlug($slug) : null;

// Slug validated via a prepared statement inside getProductBySlug(); a
// missing/inactive product (or a bogus slug) is a plain 404, never a
// leaked SQL error or an internal id.
if (!$product) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

recordRecentlyViewed((int) $product['id']);

$category = $product['category_id'] ? getCategory((int) $product['category_id']) : null;
$collection = $product['collection_id'] ? getCollection((int) $product['collection_id']) : null;
$images = dbFetchAll('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC', [$product['id']]);

// Single reusable pricing function from Phase 3 - never a second formula.
$priceBreakdown = calculateProductPrice($product);
$finalPrice = $priceBreakdown['final_price'];
$showBreakdown = getSetting('show_price_breakdown', 'no') === 'yes';

$stockLabels = ['in_stock' => 'In Stock', 'out_of_stock' => 'Out of Stock', 'made_to_order' => 'Coming Soon'];

$whatsappNumber = getSetting('whatsapp_number', '');
$whatsappConfigured = $whatsappNumber !== '' && $whatsappNumber !== 'CHANGE_ME';
$whatsappLink = $whatsappConfigured ? buildProductWhatsAppLink($product) : null;

$relatedProducts = getRelatedProducts($product, 4);
$recentlyViewedProducts = getRecentlyViewedProducts((int) $product['id']);

$currentUser = getCurrentUser();
$wishlistProductIds = $currentUser ? getUserWishlistProductIds((int) $currentUser['id']) : [];
$isWishlisted = in_array((int) $product['id'], $wishlistProductIds, true);

$currentPath = $_SERVER['REQUEST_URI'] ?? ('/product.php?slug=' . $product['slug']);
$productImageUrls = array_map(fn ($img) => PRODUCTS_UPLOAD_URL . $img['image'], $images);

// Product JSON-LD: only real database fields - no invented ratings,
// reviews, or brand claims.
$jsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'Product',
    'name' => $product['name'],
    'sku' => $product['sku'],
    'description' => $product['short_description'] ?: mb_substr((string) $product['description'], 0, 300),
    'offers' => [
        '@type' => 'Offer',
        'priceCurrency' => CURRENCY,
        'price' => number_format($finalPrice, 2, '.', ''),
        'availability' => $product['stock_status'] === 'in_stock'
            ? 'https://schema.org/InStock'
            : ($product['stock_status'] === 'made_to_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock'),
        'url' => SITE_URL . '/product.php?slug=' . $product['slug'],
    ],
];
if ($productImageUrls) {
    $jsonLd['image'] = array_values($productImageUrls);
}
// Defensively break up "</" so a product name/description could never
// close the <script> tag early even in a pathological edge case.
$pageJsonLd = str_replace('</', '<\/', json_encode($jsonLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

$pageTitle = $product['name'];
$pageMetaDescription = $product['short_description'] ?: ('Shop ' . $product['name'] . ' - ' . $product['purity'] . ' gold jewellery from ' . SITE_NAME . '.');
$pageOgImage = $productImageUrls[0] ?? null;
require __DIR__ . '/includes/header.php';
?>
<nav class="breadcrumbs container">
    <a href="<?= SITE_URL ?>/">Home</a>
    <span>/</span>
    <?php if ($category): ?>
        <a href="<?= SITE_URL ?>/category.php?slug=<?= e($category['slug']) ?>"><?= e($category['name']) ?></a>
        <span>/</span>
    <?php endif; ?>
    <span class="breadcrumb-current"><?= e($product['name']) ?></span>
</nav>

<section class="section product-detail-section">
    <div class="container product-detail-layout">
        <div class="product-gallery">
            <?php if ($images): ?>
                <div class="product-gallery-main">
                    <img data-gallery-main src="<?= e(PRODUCTS_UPLOAD_URL . $images[0]['image']) ?>" alt="<?= e($product['name']) ?>">
                </div>
                <?php if (count($images) > 1): ?>
                <div class="product-gallery-thumbs">
                    <?php foreach ($images as $i => $img): ?>
                        <img data-gallery-thumb data-full="<?= e(PRODUCTS_UPLOAD_URL . $img['image']) ?>" class="<?= $i === 0 ? 'active' : '' ?>" src="<?= e(PRODUCTS_UPLOAD_URL . $img['image']) ?>" alt="">
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            <?php else: ?>
                <div class="product-gallery-main product-gallery-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/></svg>
                </div>
            <?php endif; ?>
        </div>

        <div class="product-info">
            <div class="product-info-badges">
                <?php if ($product['new_arrival']): ?><span class="badge badge-new">New</span><?php endif; ?>
                <?php if ($product['best_seller']): ?><span class="badge badge-bestseller">Best Seller</span><?php endif; ?>
                <?php if ($product['featured']): ?><span class="badge badge-featured">Featured</span><?php endif; ?>
            </div>

            <h1><?= e($product['name']) ?></h1>
            <p class="product-sku">SKU: <?= e($product['sku']) ?></p>

            <div class="product-facts">
                <div><span>Purity</span><strong><?= e($product['purity']) ?> Gold</strong></div>
                <div><span>Net Weight</span><strong><?= rtrim(rtrim(number_format((float) $product['net_weight'], 3), '0'), '.') ?>g</strong></div>
                <div><span>Gross Weight</span><strong><?= rtrim(rtrim(number_format((float) $product['gross_weight'], 3), '0'), '.') ?>g</strong></div>
                <?php if ($category): ?><div><span>Category</span><strong><?= e($category['name']) ?></strong></div><?php endif; ?>
                <?php if ($collection): ?><div><span>Collection</span><strong><?= e($collection['name']) ?></strong></div><?php endif; ?>
            </div>

            <p class="product-gold-rate">Current Gold Rate: <strong><?= formatPrice($priceBreakdown['gold_rate']) ?> / gram</strong></p>

            <?php if ($showBreakdown): ?>
            <div class="product-price-breakdown">
                <div><span>Gold Value</span><span><?= formatPrice($priceBreakdown['gold_value']) ?></span></div>
                <?php if ($priceBreakdown['making_charges'] > 0): ?><div><span>Making Charges</span><span><?= formatPrice($priceBreakdown['making_charges']) ?></span></div><?php endif; ?>
                <?php if ($priceBreakdown['stone_charges'] > 0): ?><div><span>Stone Charges</span><span><?= formatPrice($priceBreakdown['stone_charges']) ?></span></div><?php endif; ?>
                <?php if ($priceBreakdown['other_charges'] > 0): ?><div><span>Other Charges</span><span><?= formatPrice($priceBreakdown['other_charges']) ?></span></div><?php endif; ?>
                <?php if ($priceBreakdown['discount'] > 0): ?><div><span>Discount</span><span>&minus; <?= formatPrice($priceBreakdown['discount']) ?></span></div><?php endif; ?>
            </div>
            <?php endif; ?>

            <p class="product-price"><?= formatPrice($finalPrice) ?></p>
            <p class="product-price-disclaimer">Gold prices may change according to the latest market rate. Please confirm the final price with <?= e(SITE_NAME) ?> before purchase.</p>

            <p><span class="stock-badge stock-<?= e($product['stock_status']) ?>"><?= e($stockLabels[$product['stock_status']] ?? $product['stock_status']) ?></span></p>

            <div class="product-actions">
                <?php if ($product['stock_status'] === 'in_stock'): ?>
                    <form method="post" action="<?= SITE_URL ?>/add-to-cart.php" class="product-cart-form">
                        <?= csrfField() ?>
                        <input type="hidden" name="product_id" value="<?= (int) $product['id'] ?>">
                        <input type="hidden" name="redirect" value="<?= e($currentPath) ?>">
                        <input type="number" name="quantity" value="1" min="1" max="<?= CART_MAX_QUANTITY_PER_ITEM ?>" class="form-control product-qty-input" aria-label="Quantity">
                        <button type="submit" class="btn btn-primary">Add to Cart</button>
                    </form>
                <?php else: ?>
                    <button type="button" class="btn btn-outline" disabled>Add to Cart</button>
                <?php endif; ?>

                <?php if ($whatsappConfigured): ?>
                    <a href="<?= e($whatsappLink) ?>" target="_blank" rel="noopener" class="btn btn-outline">
                        <?= $product['stock_status'] === 'made_to_order' ? 'Notify Me / Enquire on WhatsApp' : 'Enquire on WhatsApp' ?>
                    </a>
                <?php else: ?>
                    <span class="btn btn-outline" style="opacity:.5;cursor:not-allowed;" title="WhatsApp number not configured.">WhatsApp number not configured.</span>
                <?php endif; ?>

                <form method="post" action="<?= SITE_URL ?>/wishlist-toggle.php">
                    <?= csrfField() ?>
                    <input type="hidden" name="product_id" value="<?= (int) $product['id'] ?>">
                    <input type="hidden" name="redirect" value="<?= e($currentPath) ?>">
                    <button type="submit" class="btn btn-outline <?= $isWishlisted ? 'is-active' : '' ?>">
                        <?= $isWishlisted ? '&hearts; Saved to Wishlist' : '&#9825; Add to Wishlist' ?>
                    </button>
                </form>
            </div>
        </div>
    </div>

    <?php if ($product['description']): ?>
    <div class="container product-description">
        <h2>Description</h2>
        <p><?= nl2br(e($product['description'])) ?></p>
    </div>
    <?php endif; ?>
</section>

<?php if ($relatedProducts): ?>
<section class="section section-tight bg-card">
    <div class="container">
        <h2 class="section-heading">You May Also Like</h2>
        <div class="product-grid">
            <?php foreach ($relatedProducts as $product): ?>
                <?php include __DIR__ . '/includes/product-card.php'; ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($recentlyViewedProducts): ?>
<section class="section section-tight">
    <div class="container">
        <h2 class="section-heading">Recently Viewed</h2>
        <div class="product-grid">
            <?php foreach ($recentlyViewedProducts as $product): ?>
                <?php include __DIR__ . '/includes/product-card.php'; ?>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
