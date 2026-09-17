<?php
require_once __DIR__ . '/includes/functions.php';

$errors = [];
$name = ''; $email = ''; $phone = ''; $subject = ''; $messageText = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $messageText = trim($_POST['message'] ?? '');

    if ($name === '') $errors[] = 'Please enter your name.';
    if ($email === '' && $phone === '') $errors[] = 'Please provide an email or phone number so we can respond.';
    if ($email !== '' && !valid_email($email)) $errors[] = 'Please enter a valid email address.';
    if ($messageText === '') $errors[] = 'Please enter your message.';

    if (!$errors) {
        $stmt = db()->prepare('INSERT INTO messages (name, email, phone, subject, message) VALUES (?,?,?,?,?)');
        $stmt->execute([$name, $email ?: null, $phone ?: null, $subject ?: null, $messageText]);
        flash('success', 'Thank you! Your message has been sent. We will get back to you shortly.');
        redirect(BASE_URL . '/contact.php');
    }
}

$pageTitle = 'Contact Us - ' . get_setting('shop_name', SITE_NAME);
$activeNav = 'contact';
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Contact</div>
        <h1>Get in Touch</h1>
    </div>
</div>

<div class="container section-tight">
    <div class="form-row" style="align-items:start;gap:50px;">
        <div class="auth-card" style="margin:0;max-width:100%;">
            <h1 style="font-size:1.5rem;">Send Us a Message</h1>
            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>
            <form method="post">
                <?= csrf_field() ?>
                <div class="form-row">
                    <div class="form-group"><label>Your Name</label><input type="text" name="name" class="form-control" value="<?= e($name) ?>" required></div>
                    <div class="form-group"><label>Phone</label><input type="text" name="phone" class="form-control" value="<?= e($phone) ?>"></div>
                </div>
                <div class="form-group"><label>Email</label><input type="email" name="email" class="form-control" value="<?= e($email) ?>"></div>
                <div class="form-group"><label>Subject</label><input type="text" name="subject" class="form-control" value="<?= e($subject) ?>"></div>
                <div class="form-group"><label>Message</label><textarea name="message" class="form-control" rows="5" required><?= e($messageText) ?></textarea></div>
                <button type="submit" class="btn btn-primary btn-block">Send Message</button>
            </form>
        </div>
        <div>
            <h3>Visit Our Store</h3>
            <p style="color:#55524d;"><?= e(get_setting('address', '')) ?></p>
            <p><strong>Phone:</strong> <?= e(get_setting('phone', '')) ?><br>
               <strong>Email:</strong> <?= e(get_setting('email', '')) ?></p>
            <a href="<?= e(whatsapp_link('Hello ' . get_setting('shop_name', SITE_NAME) . ', I have a question.')) ?>" target="_blank" rel="noopener" class="btn btn-whatsapp" style="margin-top:10px;">Chat on WhatsApp</a>

            <div id="shipping" style="margin-top:36px;">
                <h4>Shipping</h4>
                <p style="color:#6b6864;font-size:.92rem;"><?= nl2br(e(get_setting('shipping_info', ''))) ?></p>
            </div>
            <div id="returns" style="margin-top:24px;">
                <h4>Returns</h4>
                <p style="color:#6b6864;font-size:.92rem;"><?= nl2br(e(get_setting('return_policy', ''))) ?></p>
            </div>
            <div id="faq" style="margin-top:24px;">
                <h4>Frequently Asked Questions</h4>
                <p style="color:#6b6864;font-size:.92rem;"><strong>Do you offer certification?</strong> Please ask our team about certification for any piece before purchase.</p>
                <p style="color:#6b6864;font-size:.92rem;"><strong>Can I customize a design?</strong> Yes - contact us via WhatsApp or this form with your requirements.</p>
            </div>
        </div>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
