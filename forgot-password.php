<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect(SITE_URL . '/account.php');
}

$submitted = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $identifier = trim($_POST['identifier'] ?? '');

    if ($identifier !== '') {
        $user = null;

        $normalizedMobile = normalizeMobile($identifier);
        if ($normalizedMobile !== null) {
            $user = dbFetchOne('SELECT * FROM users WHERE mobile = ? AND status = "active" LIMIT 1', [$normalizedMobile]);
        }
        if (!$user && filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $user = dbFetchOne('SELECT * FROM users WHERE email = ? AND status = "active" LIMIT 1', [$identifier]);
        }

        if ($user) {
            $token = createPasswordResetToken((int) $user['id']);
            $resetLink = SITE_URL . '/reset-password.php?token=' . $token;

            // SMS/email delivery infrastructure is not configured yet in
            // this project. The secure token architecture itself (random
            // token, hashed storage, expiry, single-use - see
            // includes/auth.php) is fully implemented and ready to wire
            // up to a real SMS/email provider. Until that provider
            // exists, the reset link is written to the server error log
            // only - NEVER into the HTTP response, and NEVER in a way
            // that reveals to the visitor whether the account existed -
            // so the flow can still be tested manually during development.
            error_log('[Phase 4 password reset - delivery pending configuration] user #' . $user['id'] . ' reset link: ' . $resetLink);
        }
    }

    // Identical response whether or not an account matched - this form
    // never reveals account existence.
    $submitted = true;
}

$pageTitle = 'Forgot Password';
require __DIR__ . '/includes/header.php';
?>
<section class="section auth-section">
    <div class="container auth-container">
        <div class="auth-card">
            <span class="eyebrow" style="display:block;text-align:center;">Account Recovery</span>
            <h1 style="text-align:center;">Forgot Password</h1>

            <?php if ($submitted): ?>
                <div class="alert alert-info">If an account matches the information provided, password recovery instructions will be sent.</div>
                <p class="auth-switch"><a href="<?= SITE_URL ?>/login.php">Back to Login</a></p>
            <?php else: ?>
                <p class="text-muted" style="text-align:center;">Enter your mobile number or email address and we'll help you get back in.</p>
                <form method="post" action="">
                    <?= csrfField() ?>
                    <div class="form-group">
                        <label for="identifier">Mobile Number or Email Address</label>
                        <input type="text" id="identifier" name="identifier" class="form-control" required autofocus>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Send Recovery Instructions</button>
                </form>
                <p class="auth-switch"><a href="<?= SITE_URL ?>/login.php">Back to Login</a></p>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
