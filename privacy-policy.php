<?php
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Privacy Policy';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Privacy Policy</h1>
    </div>
</section>

<section class="section-tight">
    <div class="container content-page" style="max-width:760px;">
        <p class="text-muted">Last updated: <?= date('d M Y') ?></p>

        <h2>Information We Collect</h2>
        <p>When you create an account, place an order, subscribe to our newsletter, or send us a message, we collect the information you provide directly - such as your name, mobile number, email address, and delivery address - so we can process your request.</p>

        <h2>How We Use Your Information</h2>
        <p>We use this information to create and manage your account, process and deliver your orders, respond to your enquiries, and, if you've subscribed, to send updates about new collections and offers. We do not sell your personal information to third parties.</p>

        <h2>Data Security</h2>
        <p>Your password is stored using industry-standard hashing and is never visible to our staff. Payment for orders is settled directly with our team (Cash on Delivery, Bank Transfer, or in-store) - we do not process or store card details on this website.</p>

        <h2>Cookies</h2>
        <p>We use a session cookie to keep you logged in and to remember your shopping bag, and a small local cookie to remember recently viewed products. These are used only to operate the website, not to track you across other sites.</p>

        <h2>Your Choices</h2>
        <p>You can update your account details at any time from My Account, and unsubscribe from our newsletter at any time. You may also contact us to ask what information we hold about you.</p>

        <h2>Contact</h2>
        <p>Questions about this policy can be sent via our <a href="<?= SITE_URL ?>/contact.php" style="text-decoration:underline;">Contact page</a>.</p>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
