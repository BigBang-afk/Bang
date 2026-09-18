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
            <p class="text-muted"><?= e(getSetting('address', '')) ?></p>
        </div>
        <div class="site-footer-links">
            <a href="<?= SITE_URL ?>/">Home</a>
            <?php if (isLoggedIn()): ?>
                <a href="<?= SITE_URL ?>/account.php">My Account</a>
                <a href="<?= SITE_URL ?>/logout.php">Logout</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/login.php">Login</a>
                <a href="<?= SITE_URL ?>/register.php">Register</a>
            <?php endif; ?>
        </div>
    </div>
    <div class="site-footer-bottom">
        <div class="container">&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?>. All rights reserved.</div>
    </div>
</footer>

<script src="<?= SITE_URL ?>/assets/js/main.js"></script>
</body>
</html>
