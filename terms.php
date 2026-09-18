<?php
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Terms & Conditions';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Terms &amp; Conditions</h1>
    </div>
</section>

<section class="section-tight">
    <div class="container content-page" style="max-width:760px;">
        <p class="text-muted">Last updated: <?= date('d M Y') ?></p>

        <h2>Using This Website</h2>
        <p>By using this website you agree to provide accurate information when creating an account, placing an order, or contacting us, and to use the site only for its intended purpose of browsing and purchasing jewellery.</p>

        <h2>Pricing</h2>
        <p>Prices shown on this website are calculated from the gold rate on record at the time of viewing, and are always recalculated from our records - never taken from your browser - at checkout. Because gold rates can change, the final price is confirmed with you before your order is completed.</p>

        <h2>Orders</h2>
        <p>Placing an order is a request to purchase, which our team reviews and confirms with you. We reserve the right to decline or cancel an order - for example if an item is no longer available - in which case we will contact you directly.</p>

        <h2>Accounts</h2>
        <p>You are responsible for keeping your account password confidential. If you believe your account has been accessed without your permission, please contact us immediately.</p>

        <h2>Intellectual Property</h2>
        <p>The Zarghoon Jewellers name, logo, and the content of this website belong to Zarghoon Jewellers and may not be copied or reused without permission.</p>

        <h2>Contact</h2>
        <p>Questions about these terms can be sent via our <a href="<?= SITE_URL ?>/contact.php" style="text-decoration:underline;">Contact page</a>.</p>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
