<?php
/**
 * Luxury 403 (Forbidden) page, styled to match 404.php. Used as the
 * Apache ErrorDocument 403 target (see .htaccess) for any request the
 * server itself denies (e.g. a blocked /config/ or /includes/ request).
 */
require_once __DIR__ . '/includes/functions.php';

http_response_code(403);

$pageTitle = 'Access Denied';
require __DIR__ . '/includes/header.php';
?>
<section class="section" style="text-align:center;">
    <div class="container" style="max-width:560px;">
        <span class="eyebrow">403</span>
        <h1>This Area Is Not Open to Visitors.</h1>
        <p class="text-muted">You don't have permission to view this page. If you believe this is a mistake, please contact us.</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
            <a href="<?= SITE_URL ?>/shop.php" class="btn btn-primary">Continue Shopping</a>
            <a href="<?= SITE_URL ?>/" class="btn btn-outline">Back to Home</a>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
