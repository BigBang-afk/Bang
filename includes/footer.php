<?php
/**
 * Closes the <main> opened in includes/footer.php's sibling,
 * includes/header.php, and renders the public site footer. Every
 * public page must require header.php before requiring this file.
 *
 * The "Shop" column lists real, active categories (never a hard-coded
 * guess at what categories exist) - capped at 5 so the column stays a
 * reasonable height regardless of the catalog's size.
 */
$footerCategories = array_slice(getActiveCategories(), 0, 5);
?>
</main>

<footer class="site-footer">
    <div class="container site-footer-grid">
        <div class="footer-col footer-col-brand">
            <span class="site-logo-name"><?= e(SITE_NAME) ?></span>
            <p class="text-muted"><?= e(getSetting('footer_description', '')) ?></p>
        </div>

        <?php if ($footerCategories): ?>
        <div class="footer-col">
            <h4>Shop</h4>
            <?php foreach ($footerCategories as $fc): ?>
                <a href="<?= SITE_URL ?>/category.php?slug=<?= e($fc['slug']) ?>"><?= e($fc['name']) ?></a>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <div class="footer-col">
            <h4>Discover</h4>
            <a href="<?= SITE_URL ?>/about.php">About Us</a>
            <a href="<?= SITE_URL ?>/collections.php">Collections</a>
            <a href="<?= SITE_URL ?>/contact.php">Contact</a>
        </div>

        <div class="footer-col">
            <h4>Help</h4>
            <a href="<?= SITE_URL ?>/faq.php">FAQ</a>
            <a href="<?= SITE_URL ?>/shipping-returns.php">Shipping &amp; Returns</a>
            <a href="<?= SITE_URL ?>/privacy-policy.php">Privacy Policy</a>
            <a href="<?= SITE_URL ?>/terms.php">Terms &amp; Conditions</a>
        </div>

        <div class="footer-col">
            <h4>Contact</h4>
            <p class="text-muted"><?= e(getSetting('address', '')) ?></p>
            <?php $footerPhone = getSetting('phone', ''); if ($footerPhone && $footerPhone !== 'CHANGE_ME'): ?>
                <a href="tel:<?= e($footerPhone) ?>"><?= e($footerPhone) ?></a>
            <?php endif; ?>
            <?php $footerWhatsapp = getSetting('whatsapp_number', ''); if ($footerWhatsapp && $footerWhatsapp !== 'CHANGE_ME'): ?>
                <a href="<?= e(buildWhatsAppLink('Hello ' . getSetting('shop_name', SITE_NAME) . ', I would like to get in touch.', $footerWhatsapp)) ?>" target="_blank" rel="noopener">WhatsApp</a>
            <?php endif; ?>
            <?php $footerEmail = getSetting('email', ''); if ($footerEmail && $footerEmail !== 'CHANGE_ME'): ?>
                <a href="mailto:<?= e($footerEmail) ?>"><?= e($footerEmail) ?></a>
            <?php endif; ?>
        </div>

        <?php if (getSetting('instagram', '') || getSetting('facebook', '') || getSetting('youtube', '') || getSetting('tiktok', '')): ?>
        <div class="footer-col">
            <h4>Social</h4>
            <?php if (getSetting('instagram', '')): ?><a href="https://instagram.com/<?= e(getSetting('instagram', '')) ?>" target="_blank" rel="noopener">Instagram</a><?php endif; ?>
            <?php if (getSetting('facebook', '')): ?><a href="<?= e(getSetting('facebook', '')) ?>" target="_blank" rel="noopener">Facebook</a><?php endif; ?>
            <?php if (getSetting('tiktok', '')): ?><a href="<?= e(getSetting('tiktok', '')) ?>" target="_blank" rel="noopener">TikTok</a><?php endif; ?>
            <?php if (getSetting('youtube', '')): ?><a href="<?= e(getSetting('youtube', '')) ?>" target="_blank" rel="noopener">YouTube</a><?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
    <div class="site-footer-bottom">
        <div class="container">&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?>. <?= e(getSetting('copyright_text', 'All rights reserved.')) ?></div>
    </div>
</footer>

<div class="modal-overlay" id="quickview-modal" role="dialog" aria-modal="true" aria-label="Quick view">
    <div class="modal-panel">
        <button type="button" class="modal-close" data-modal-close aria-label="Close quick view">&times;</button>
        <div class="quickview-body">
            <div class="quickview-image"><img id="quickview-image" src="" alt=""></div>
            <div class="quickview-info">
                <h3 id="quickview-name"></h3>
                <p class="text-muted" id="quickview-meta"></p>
                <p class="product-price" id="quickview-price"></p>
                <p><span class="stock-badge" id="quickview-stock"></span></p>
                <form method="post" action="<?= SITE_URL ?>/add-to-cart.php" id="quickview-cart-form">
                    <?= csrfField() ?>
                    <input type="hidden" name="product_id" id="quickview-product-id" value="">
                    <input type="hidden" name="redirect" value="<?= e($_SERVER['REQUEST_URI'] ?? '/shop.php') ?>">
                    <button type="submit" class="btn btn-primary btn-block" id="quickview-add-btn">Add to Cart</button>
                </form>
                <a href="#" id="quickview-link" class="btn btn-outline btn-block" style="margin-top:10px;">View Full Details</a>
            </div>
        </div>
    </div>
</div>

<div class="toast-stack" id="toast-stack" aria-live="polite" aria-atomic="true"></div>

<script src="<?= SITE_URL ?>/assets/js/main.js"></script>
<script src="<?= SITE_URL ?>/assets/js/shop.js"></script>
</body>
</html>
