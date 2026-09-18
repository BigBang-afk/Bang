<?php
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Shipping & Returns';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Shipping &amp; Returns</h1>
    </div>
</section>

<section class="section-tight">
    <div class="container content-page" style="max-width:760px;">
        <h2>Delivery &amp; Store Pickup</h2>
        <p>Every order placed on our website is confirmed directly with you by our team before it is prepared, since jewellery orders often involve details worth confirming in person - sizing, final gold rate, and delivery timing. Depending on the payment method you choose at checkout, your order will either be delivered to your address or made ready for collection at our store in Liaquat Bazar, Sarafa Market, Quetta.</p>

        <h2>Order Confirmation</h2>
        <p>After placing an order, you'll receive an on-site order confirmation with your order number. Our team may also reach out by phone or WhatsApp to confirm delivery details and the final price, since gold rates can change between the time an order is placed and confirmed.</p>

        <h2>Returns &amp; Exchanges</h2>
        <p>Because each piece involves genuine gold at the prevailing market rate, please review your order carefully - purity, weight, and design - before confirming. If you believe an item you received does not match what was described on its product page, please contact us as soon as possible so we can review your case individually.</p>

        <h2>Questions</h2>
        <p>For anything not covered here, please <a href="<?= SITE_URL ?>/contact.php" style="text-decoration:underline;">contact us</a> and our team will be glad to help.</p>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
