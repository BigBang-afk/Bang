<?php
/**
 * Luxury 404 page. Used two ways:
 *  - directly, as the Apache ErrorDocument 404 target (see .htaccess)
 *    for any unmapped URL;
 *  - required in-place by product.php/category.php/collections.php
 *    when a slug doesn't resolve to an active row, so the ORIGINAL
 *    requested URL keeps its proper 404 status rather than redirecting.
 */
require_once __DIR__ . '/includes/functions.php';

http_response_code(404);

$pageTitle = 'Page Not Found';
require __DIR__ . '/includes/header.php';
?>
<section class="section" style="text-align:center;">
    <div class="container" style="max-width:560px;">
        <span class="eyebrow">404</span>
        <h1>The Piece You're Looking For Couldn't Be Found.</h1>
        <p class="text-muted">The page or product you're looking for may have moved, sold out permanently, or never existed.</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
            <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary">Continue Shopping</a>
            <a href="<?= SITE_URL ?>/" class="btn btn-outline">Back to Home</a>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
