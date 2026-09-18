<?php
require_once __DIR__ . '/includes/functions.php';

$errors = [];
$name = '';
$mobile = '';
$email = '';
$subject = '';
$messageText = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $messageText = trim($_POST['message'] ?? '');

    if ($name === '') {
        $errors[] = 'Please enter your name.';
    } elseif (mb_strlen($name) > 100) {
        $errors[] = 'Name must be 100 characters or fewer.';
    }

    $normalizedMobile = null;
    if ($mobile !== '') {
        $normalizedMobile = normalizeMobile($mobile);
        if ($normalizedMobile === null) {
            $errors[] = 'Please enter a valid Pakistani mobile number, or leave it empty.';
        }
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address, or leave it empty.';
    }

    if ($mobile === '' && $email === '') {
        $errors[] = 'Please provide at least a mobile number or an email address so we can respond.';
    }

    if (mb_strlen($subject) > 150) {
        $errors[] = 'Subject must be 150 characters or fewer.';
    }

    if ($messageText === '') {
        $errors[] = 'Please enter your message.';
    } elseif (mb_strlen($messageText) > 2000) {
        $errors[] = 'Message must be 2000 characters or fewer.';
    }

    if (!$errors) {
        dbExecute(
            'INSERT INTO messages (name, mobile, email, subject, message, status) VALUES (?, ?, ?, ?, ?, "new")',
            [$name, $normalizedMobile, $email !== '' ? $email : null, $subject !== '' ? $subject : null, $messageText]
        );
        flash('success', 'Thank you - your message has been sent. We will get back to you soon.');
        redirect(SITE_URL . '/contact.php');
    }
}

$pageTitle = 'Contact Us';
$pageMetaDescription = 'Get in touch with ' . SITE_NAME . ' - visit us at Liaquat Bazar, Sarafa Market, Quetta, or send us a message.';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Contact Us</h1>
        <p class="text-muted">We'd love to hear from you - visit our store or send us a message.</p>
    </div>
</section>

<section class="section-tight">
    <div class="container contact-layout">
        <div class="admin-panel contact-info-panel">
            <h3><?= e(SITE_NAME) ?></h3>
            <p class="text-muted"><?= e(getSetting('address', 'Liaquat Bazar, Sarafa Market, Quetta, Pakistan')) ?></p>

            <dl class="account-info" style="grid-template-columns:1fr;margin-top:20px;">
                <?php if (getSetting('phone', '') && getSetting('phone', '') !== 'CHANGE_ME'): ?>
                    <div><dt>Phone</dt><dd><a href="tel:<?= e(getSetting('phone', '')) ?>"><?= e(getSetting('phone', '')) ?></a></dd></div>
                <?php endif; ?>
                <?php $waNumber = getSetting('whatsapp_number', ''); if ($waNumber && $waNumber !== 'CHANGE_ME'): ?>
                    <div><dt>WhatsApp</dt><dd><a href="<?= e(buildWhatsAppLink('Hello ' . getSetting('shop_name', SITE_NAME) . ', I would like to get in touch.', $waNumber)) ?>" target="_blank" rel="noopener"><?= e($waNumber) ?></a></dd></div>
                <?php endif; ?>
                <?php if (getSetting('email', '') && getSetting('email', '') !== 'CHANGE_ME'): ?>
                    <div><dt>Email</dt><dd><a href="mailto:<?= e(getSetting('email', '')) ?>"><?= e(getSetting('email', '')) ?></a></dd></div>
                <?php endif; ?>
            </dl>

            <div class="site-footer-links" style="margin-top:20px;flex-direction:row;gap:16px;">
                <?php if (getSetting('instagram', '')): ?><a href="https://instagram.com/<?= e(getSetting('instagram', '')) ?>" target="_blank" rel="noopener">Instagram</a><?php endif; ?>
                <?php if (getSetting('facebook', '')): ?><a href="<?= e(getSetting('facebook', '')) ?>" target="_blank" rel="noopener">Facebook</a><?php endif; ?>
                <?php if (getSetting('youtube', '')): ?><a href="<?= e(getSetting('youtube', '')) ?>" target="_blank" rel="noopener">YouTube</a><?php endif; ?>
            </div>
        </div>

        <div class="admin-panel">
            <h3>Send Us a Message</h3>

            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

            <form method="post">
                <?= csrfField() ?>
                <div class="form-row">
                    <div class="form-group">
                        <label for="name">Name</label>
                        <input type="text" id="name" name="name" class="form-control" value="<?= e($name) ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="mobile">Mobile <span class="text-muted">(optional)</span></label>
                        <input type="text" id="mobile" name="mobile" class="form-control" value="<?= e($mobile) ?>" placeholder="03XXXXXXXXX">
                    </div>
                </div>
                <div class="form-group">
                    <label for="email">Email <span class="text-muted">(optional)</span></label>
                    <input type="email" id="email" name="email" class="form-control" value="<?= e($email) ?>">
                </div>
                <div class="form-group">
                    <label for="subject">Subject</label>
                    <input type="text" id="subject" name="subject" class="form-control" value="<?= e($subject) ?>">
                </div>
                <div class="form-group">
                    <label for="message">Message</label>
                    <textarea id="message" name="message" class="form-control" rows="5" required><?= e($messageText) ?></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
