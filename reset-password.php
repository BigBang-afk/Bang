<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect(SITE_URL . '/account.php');
}

$token = $_GET['token'] ?? ($_POST['token'] ?? '');
$token = is_string($token) ? $token : '';

$errors = [];
$success = false;
$resetRow = $token !== '' ? findValidPasswordResetToken($token) : null;

if ($token === '' || !$resetRow) {
    $errors[] = 'This password reset link is invalid or has expired. Please request a new one.';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $newPassword = (string) ($_POST['new_password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');

    if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        $errors[] = 'New password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long.';
    }
    if ($newPassword !== $confirmPassword) {
        $errors[] = 'New password and confirm password do not match.';
    }

    if (!$errors) {
        dbExecute('UPDATE users SET password = ? WHERE id = ?', [password_hash($newPassword, PASSWORD_DEFAULT), $resetRow['user_id']]);
        markPasswordResetTokenUsed((int) $resetRow['id']);
        $success = true;
    }
}

$pageTitle = 'Reset Password';
require __DIR__ . '/includes/header.php';
?>
<section class="section auth-section">
    <div class="container auth-container">
        <div class="auth-card">
            <span class="eyebrow" style="display:block;text-align:center;">Account Recovery</span>
            <h1 style="text-align:center;">Reset Password</h1>

            <?php if ($success): ?>
                <div class="alert alert-success">Your password has been reset successfully. You can now log in.</div>
                <p class="auth-switch"><a href="<?= SITE_URL ?>/login.php">Login</a></p>
            <?php else: ?>
                <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

                <?php if ($resetRow): ?>
                    <form method="post" action="">
                        <?= csrfField() ?>
                        <input type="hidden" name="token" value="<?= e($token) ?>">
                        <div class="form-group">
                            <label for="new_password">New Password</label>
                            <input type="password" id="new_password" name="new_password" class="form-control" required autofocus>
                            <p class="form-help">At least <?= PASSWORD_MIN_LENGTH ?> characters.</p>
                        </div>
                        <div class="form-group">
                            <label for="confirm_password">Confirm New Password</label>
                            <input type="password" id="confirm_password" name="confirm_password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Reset Password</button>
                    </form>
                <?php else: ?>
                    <p class="auth-switch"><a href="<?= SITE_URL ?>/forgot-password.php">Request a new reset link</a></p>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
