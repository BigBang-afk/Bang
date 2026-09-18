<?php
/**
 * Temporary homepage placeholder.
 *
 * Not part of the literal Phase 4 request (customer authentication),
 * but added alongside it: the new public header (includes/header.php)
 * needs a real page for its logo/"Home" link to point to, and per this
 * project's "no fake functionality" rule, a dead link is worse than an
 * honest placeholder. This page will be replaced by the real storefront
 * homepage (featured products, banners, categories) in a later phase.
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Home';
require __DIR__ . '/includes/header.php';
?>
<section class="section" style="text-align:center;">
    <div class="container" style="max-width:640px;">
        <span class="eyebrow">Zarghoon Jewellers</span>
        <h1>Fine Gold Jewellery, Crafted With Trust</h1>
        <p class="text-muted">Our full online store is being crafted with the same care as our jewellery, and will open here soon. In the meantime, create an account so you're ready the moment we launch.</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
            <?php if (isLoggedIn()): ?>
                <a href="<?= SITE_URL ?>/account.php" class="btn btn-primary">Go to My Account</a>
            <?php else: ?>
                <a href="<?= SITE_URL ?>/register.php" class="btn btn-primary">Create an Account</a>
                <a href="<?= SITE_URL ?>/login.php" class="btn btn-outline">Login</a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
