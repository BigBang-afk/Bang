<?php
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Frequently Asked Questions';
require __DIR__ . '/includes/header.php';

$faqs = [
    [
        'q' => 'Are your gold rates updated regularly?',
        'a' => 'Yes. Our gold rates are reviewed and updated by our team and reflect the rate shown on our Gold Rate page at the time of your order. Because gold prices can move during the day, the final price is always confirmed with you before your order is completed.',
    ],
    [
        'q' => 'Is the jewellery shown on the website authentic?',
        'a' => 'Yes. Every piece is genuine gold jewellery as described on its product page, including purity and weight.',
    ],
    [
        'q' => 'Can I place an order without creating an account?',
        'a' => 'Yes. You can check out as a guest with your name, mobile number, and delivery address. Creating an account simply makes it easier to track your order history for next time.',
    ],
    [
        'q' => 'What payment methods do you accept?',
        'a' => 'At checkout you can choose Cash on Delivery, Bank Transfer, Store Pickup, or Pay at Store. Our team will confirm the details with you directly after you place your order.',
    ],
    [
        'q' => 'How can I contact Zarghoon Jewellers?',
        'a' => 'You can reach us via the Contact page, by phone, or on WhatsApp - see our contact details in the footer of every page.',
    ],
];
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Frequently Asked Questions</h1>
    </div>
</section>

<section class="section-tight">
    <div class="container content-page" style="max-width:760px;">
        <?php foreach ($faqs as $faq): ?>
            <div class="faq-item">
                <h3><?= e($faq['q']) ?></h3>
                <p class="text-muted"><?= e($faq['a']) ?></p>
            </div>
        <?php endforeach; ?>

        <p style="margin-top:32px;text-align:center;">Still have a question? <a href="<?= SITE_URL ?>/contact.php" style="text-decoration:underline;">Contact us</a>.</p>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
