<?php
require_once __DIR__ . '/functions.php';
$shopName = get_setting('shop_name', SITE_NAME);
$shopTagline = get_setting('shop_tagline', SITE_TAGLINE);
$whatsapp = get_setting('whatsapp_number', '');
?>
    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <span class="brand-name" style="font-size:1.4rem;"><?= e($shopName) ?></span>
                    <span class="brand-tagline"><?= e($shopTagline) ?></span>
                    <p><?= e(get_setting('address', '')) ?></p>
                    <div class="social-icons">
                        <?php if ($url = get_setting('instagram_url')): ?>
                        <a href="<?= e($url) ?>" target="_blank" rel="noopener" aria-label="Instagram">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($url = get_setting('facebook_url')): ?>
                        <a href="<?= e($url) ?>" target="_blank" rel="noopener" aria-label="Facebook">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($whatsapp): ?>
                        <a href="<?= e(whatsapp_link('Hello ' . $shopName . ', I have a question about your jewellery.')) ?>" target="_blank" rel="noopener" aria-label="WhatsApp">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </a>
                        <?php endif; ?>
                        <?php if ($url = get_setting('youtube_url')): ?>
                        <a href="<?= e($url) ?>" target="_blank" rel="noopener" aria-label="YouTube">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="4"/><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none"/></svg>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="footer-col">
                    <h5>Shop</h5>
                    <a href="<?= BASE_URL ?>/shop.php">All Jewellery</a>
                    <a href="<?= BASE_URL ?>/category.php?slug=rings">Rings</a>
                    <a href="<?= BASE_URL ?>/category.php?slug=necklaces">Necklaces</a>
                    <a href="<?= BASE_URL ?>/category.php?slug=earrings">Earrings</a>
                    <a href="<?= BASE_URL ?>/category.php?slug=bangles">Bangles</a>
                </div>
                <div class="footer-col">
                    <h5>About</h5>
                    <a href="<?= BASE_URL ?>/about.php">Our Story</a>
                    <a href="<?= BASE_URL ?>/about.php#craftsmanship">Craftsmanship</a>
                    <a href="<?= BASE_URL ?>/contact.php">Contact</a>
                    <a href="<?= BASE_URL ?>/contact.php">Careers</a>
                </div>
                <div class="footer-col footer-newsletter">
                    <h5>Newsletter</h5>
                    <p style="color:#a9a49a;font-size:.88rem;">Be the first to know about new collections and exclusive offers.</p>
                    <form action="<?= BASE_URL ?>/ajax/newsletter.php" method="post">
                        <?= csrf_field() ?>
                        <input type="email" name="email" placeholder="Your email address" required>
                        <button type="submit">Subscribe</button>
                    </form>
                    <div style="margin-top:24px;">
                        <a href="<?= BASE_URL ?>/contact.php#faq" style="display:inline-block;margin-right:14px;font-size:.85rem;color:#b8b3aa;">FAQ</a>
                        <a href="<?= BASE_URL ?>/contact.php#shipping" style="display:inline-block;margin-right:14px;font-size:.85rem;color:#b8b3aa;">Shipping</a>
                        <a href="<?= BASE_URL ?>/contact.php#returns" style="display:inline-block;font-size:.85rem;color:#b8b3aa;">Returns</a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; <?= date('Y') ?> <?= e($shopName) ?>. All rights reserved.</span>
                <span><?= e(get_setting('address', '')) ?></span>
            </div>
        </div>
    </footer>

    <?php if ($whatsapp): ?>
    <a class="wa-float" href="<?= e(whatsapp_link('Hello ' . $shopName . ', I would like to know more about your jewellery collection.')) ?>" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.44-1.42a9.9 9.9 0 0 0 4.6 1.13h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.06h-.01a8.19 8.19 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.15 8.15 0 0 1-1.25-4.31c0-4.51 3.68-8.19 8.2-8.19a8.15 8.15 0 0 1 8.19 8.19c0 4.52-3.68 8.15-8.19 8.15zm4.48-6.13c-.24-.12-1.44-.71-1.67-.8-.22-.08-.38-.12-.55.12s-.63.79-.78.96c-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.36.99 2.52c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.15.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>
    </a>
    <?php endif; ?>

    <script src="<?= BASE_URL ?>/assets/js/main.js"></script>
</body>
</html>
