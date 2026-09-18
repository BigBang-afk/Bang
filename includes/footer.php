<?php
/**
 * Closes the <main> opened in includes/footer.php's sibling,
 * includes/header.php, and renders the public site footer. Every
 * public page must require header.php before requiring this file.
 */
?>
</main>

<footer class="site-footer">
    <div class="container site-footer-inner">
        <div>
            <span class="site-logo-name"><?= e(SITE_NAME) ?></span>
            <p class="text-muted"><?= e(getSetting('footer_description', '')) ?></p>
            <p class="text-muted"><?= e(getSetting('address', '')) ?></p>
            <?php $footerPhone = getSetting('phone', ''); if ($footerPhone && $footerPhone !== 'CHANGE_ME'): ?>
                <p class="text-muted"><a href="tel:<?= e($footerPhone) ?>"><?= e($footerPhone) ?></a></p>
            <?php endif; ?>
            <?php $footerEmail = getSetting('email', ''); if ($footerEmail && $footerEmail !== 'CHANGE_ME'): ?>
                <p class="text-muted"><a href="mailto:<?= e($footerEmail) ?>"><?= e($footerEmail) ?></a></p>
            <?php endif; ?>
        </div>
        <div class="site-footer-links">
            <a href="<?= SITE_URL ?>/">Home</a>
            <a href="<?= SITE_URL ?>/shop.php">Shop</a>
            <a href="<?= SITE_URL ?>/collections.php">Collections</a>
            <a href="<?= SITE_URL ?>/contact.php">Contact</a>
            <?php if (isLoggedIn()): ?>
                <a href="<?= SITE_URL ?>/account.php">My Account</a>
                <a href="<?= SITE_URL ?>/logout.php">Logout</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/login.php">Login</a>
                <a href="<?= SITE_URL ?>/register.php">Register</a>
            <?php endif; ?>
        </div>
        <div class="site-footer-links">
            <?php if (getSetting('instagram', '')): ?><a href="https://instagram.com/<?= e(getSetting('instagram', '')) ?>" target="_blank" rel="noopener">Instagram</a><?php endif; ?>
            <?php if (getSetting('facebook', '')): ?><a href="<?= e(getSetting('facebook', '')) ?>" target="_blank" rel="noopener">Facebook</a><?php endif; ?>
            <?php if (getSetting('youtube', '')): ?><a href="<?= e(getSetting('youtube', '')) ?>" target="_blank" rel="noopener">YouTube</a><?php endif; ?>
            <?php if (getSetting('tiktok', '')): ?><a href="<?= e(getSetting('tiktok', '')) ?>" target="_blank" rel="noopener">TikTok</a><?php endif; ?>
        </div>
    </div>
    <div class="site-footer-bottom">
        <div class="container">&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?>. <?= e(getSetting('copyright_text', 'All rights reserved.')) ?></div>
    </div>
</footer>

<script src="<?= SITE_URL ?>/assets/js/main.js"></script>
<script src="<?= SITE_URL ?>/assets/js/shop.js"></script>
</body>
</html>
