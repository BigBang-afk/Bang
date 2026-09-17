<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/product_card.php';

$slug = $_GET['slug'] ?? '';
$stmt = db()->prepare('SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.status = "active"');
$stmt->execute([$slug]);
$product = $stmt->fetch();

if (!$product) {
    http_response_code(404);
    $pageTitle = 'Product Not Found';
    require __DIR__ . '/includes/header.php';
    echo '<div class="container section"><div class="empty-state"><h3>Product not found.</h3><a href="' . BASE_URL . '/shop.php" class="btn btn-primary">Browse All Jewellery</a></div></div>';
    require __DIR__ . '/includes/footer.php';
    exit;
}

$stmt = db()->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC');
$stmt->execute([$product['id']]);
$images = $stmt->fetchAll();
if (!$images) {
    $images = [['image_path' => null]];
}

$effectivePrice = get_effective_price($product);

$isWishlisted = false;
$user = current_user();
if ($user) {
    $stmt = db()->prepare('SELECT COUNT(*) FROM wishlists WHERE user_id = ? AND product_id = ?');
    $stmt->execute([$user['id'], $product['id']]);
    $isWishlisted = $stmt->fetchColumn() > 0;
}

$related = [];
if ($product['category_id']) {
    $stmt = db()->prepare(
        'SELECT p.*, (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image
         FROM products p WHERE p.category_id = ? AND p.id != ? AND p.status = "active" ORDER BY p.created_at DESC LIMIT 4'
    );
    $stmt->execute([$product['category_id'], $product['id']]);
    $related = $stmt->fetchAll();
}

$stockLabels = [
    'in_stock' => ['In Stock', 'stock-in'],
    'out_of_stock' => ['Out of Stock', 'stock-out'],
    'made_to_order' => ['Made to Order', 'stock-order'],
];
[$stockLabel, $stockClass] = $stockLabels[$product['stock_status']] ?? ['In Stock', 'stock-in'];

$pageTitle = ($product['seo_title'] ?: $product['name']) . ' - ' . get_setting('shop_name', SITE_NAME);
$metaDescription = $product['seo_description'] ?: $product['short_description'];
$ogImage = $product['og_image'] ?: ($images[0]['image_path'] ?? null);
$jsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'Product',
    'name' => $product['name'],
    'sku' => $product['sku'],
    'image' => array_map(fn($img) => image_url($img['image_path']), $images),
    'description' => $product['short_description'] ?: $product['description'],
    'offers' => [
        '@type' => 'Offer',
        'priceCurrency' => 'PKR',
        'price' => number_format($effectivePrice, 2, '.', ''),
        'availability' => $product['stock_status'] === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        'url' => BASE_URL . '/product.php?slug=' . $product['slug'],
    ],
]);
require __DIR__ . '/includes/header.php';
?>
<div class="container section-tight">
    <div class="breadcrumb">
        <a href="<?= BASE_URL ?>/index.php">Home</a> / <a href="<?= BASE_URL ?>/shop.php">Shop</a>
        <?php if ($product['category_name']): ?> / <a href="<?= BASE_URL ?>/category.php?slug=<?= e($product['category_slug']) ?>"><?= e($product['category_name']) ?></a><?php endif; ?>
        / <?= e($product['name']) ?>
    </div>

    <div class="about-grid" style="align-items:start;">
        <div>
            <div class="about-media" style="aspect-ratio:1/1;margin-bottom:14px;">
                <img id="main-product-image" src="<?= e(image_url($images[0]['image_path'])) ?>" alt="<?= e($product['name']) ?>">
            </div>
            <?php if (count($images) > 1): ?>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <?php foreach ($images as $img): ?>
                    <img src="<?= e(image_url($img['image_path'])) ?>" alt="" style="width:76px;height:76px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--border-soft);" onclick="document.getElementById('main-product-image').src=this.src">
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        <div>
            <?php if ($product['best_seller']): ?><span class="badge badge-gold" style="margin-right:6px;">Best Seller</span><?php endif; ?>
            <?php if ($product['new_arrival']): ?><span class="badge">New Arrival</span><?php endif; ?>
            <h1 style="margin-top:14px;"><?= e($product['name']) ?></h1>
            <p style="color:#6b6864;">SKU: <?= e($product['sku']) ?></p>
            <p class="product-price" style="font-size:1.8rem;margin:16px 0;"><?= currency($effectivePrice) ?></p>

            <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b6864;">Purity</td><td style="padding:8px 0;font-weight:500;"><?= e($product['purity']) ?> Gold</td></tr>
                <tr><td style="padding:8px 0;color:#6b6864;">Gross Weight</td><td style="padding:8px 0;font-weight:500;"><?= format_weight((float) $product['gross_weight']) ?></td></tr>
                <tr><td style="padding:8px 0;color:#6b6864;">Net Weight</td><td style="padding:8px 0;font-weight:500;"><?= format_weight((float) $product['net_weight']) ?></td></tr>
                <tr><td style="padding:8px 0;color:#6b6864;">Availability</td><td style="padding:8px 0;"><span class="stock-tag <?= $stockClass ?>"><?= $stockLabel ?></span></td></tr>
            </table>

            <?php if ($product['short_description']): ?><p style="font-size:1.05rem;"><?= e($product['short_description']) ?></p><?php endif; ?>

            <form class="add-to-cart-form" method="post" action="<?= BASE_URL ?>/ajax/add_to_cart.php" data-ajax="1" style="display:flex;gap:12px;align-items:center;margin:24px 0;flex-wrap:wrap;">
                <?= csrf_field() ?>
                <input type="hidden" name="product_id" value="<?= (int) $product['id'] ?>">
                <div class="qty-stepper" style="display:flex;align-items:center;border:1px solid var(--border-soft);border-radius:4px;">
                    <button type="button" data-step="-1" style="border:none;background:none;padding:12px 16px;cursor:pointer;">&minus;</button>
                    <input type="number" name="quantity" value="1" min="1" max="10" style="width:44px;border:none;text-align:center;" readonly>
                    <button type="button" data-step="1" style="border:none;background:none;padding:12px 16px;cursor:pointer;">+</button>
                </div>
                <button type="submit" class="btn btn-primary" <?= $product['stock_status'] === 'out_of_stock' ? 'disabled' : '' ?>>
                    <?= $product['stock_status'] === 'made_to_order' ? 'Order Now' : 'Add to Cart' ?>
                </button>
                <button type="button" class="wishlist-btn <?= $isWishlisted ? 'active' : '' ?>" data-product-id="<?= (int) $product['id'] ?>" style="position:static;" aria-label="Add to wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="<?= $isWishlisted ? 'currentColor' : 'none' ?>" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.8.7 4.9 2.3C11.5 4.7 13.3 3.7 15.3 4c3.5.5 5 4 3.5 7.7C16.5 16.4 12 21 12 21z"/></svg>
                </button>
            </form>

            <a href="<?= e(whatsapp_product_link($product)) ?>" target="_blank" rel="noopener" class="btn btn-whatsapp btn-block" style="margin-bottom:24px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.42a9.9 9.9 0 0 0 4.6 1.13h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2z"/></svg>
                Enquire on WhatsApp
            </a>

            <?php if ($product['description']): ?>
            <div>
                <h4>Description</h4>
                <p style="color:#55524d;"><?= nl2br(e($product['description'])) ?></p>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php if ($related): ?>
<div class="container section">
    <div class="section-heading align-left">
        <span class="eyebrow">You May Also Like</span>
        <h2>Related Pieces</h2>
    </div>
    <div class="product-grid">
        <?php foreach ($related as $p): render_product_card($p); endforeach; ?>
    </div>
</div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
