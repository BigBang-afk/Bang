<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $currentPassword = (string) ($_POST['current_password'] ?? '');
    $newPassword = (string) ($_POST['new_password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');

    if (!password_verify($currentPassword, $user['password'])) {
        $errors[] = 'Your current password is incorrect.';
    }
    if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        $errors[] = 'New password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long.';
    }
    if ($newPassword !== $confirmPassword) {
        $errors[] = 'New password and confirm password do not match.';
    }

    if (!$errors) {
        dbExecute('UPDATE users SET password = ? WHERE id = ?', [password_hash($newPassword, PASSWORD_DEFAULT), $user['id']]);

        // Invalidate this authenticated session so the customer must log
        // back in with the new password - this project has no
        // server-side session registry to revoke OTHER devices' sessions,
        // but ending this one is the practical, honest equivalent of
        // "invalidate existing authentication sessions where practical".
        logoutUser();
        flash('success', 'Your password has been changed successfully. Please log in again.');
        redirect(SITE_URL . '/login.php');
    }
}

$pageTitle = 'Change Password';
$pageRobots = 'noindex, nofollow';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>Change Password</h1></div>

        <div class="account-layout">
            <aside class="account-nav">
                <a href="<?= SITE_URL ?>/account.php" class="account-nav-link">Profile</a>
                <span class="account-nav-link is-disabled" title="Coming soon">Orders</span>
                <span class="account-nav-link is-disabled" title="Coming soon">Wishlist</span>
                <a href="<?= SITE_URL ?>/account-edit.php" class="account-nav-link active">Settings</a>
            </aside>

            <div class="account-content">
                <div class="account-panel" style="max-width:480px;">
                    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

                    <form method="post" action="">
                        <?= csrfField() ?>
                        <div class="form-group">
                            <label for="current_password">Current Password</label>
                            <input type="password" id="current_password" name="current_password" class="form-control" required autofocus>
                        </div>
                        <div class="form-group">
                            <label for="new_password">New Password</label>
                            <input type="password" id="new_password" name="new_password" class="form-control" required>
                            <p class="form-help">At least <?= PASSWORD_MIN_LENGTH ?> characters.</p>
                        </div>
                        <div class="form-group">
                            <label for="confirm_password">Confirm New Password</label>
                            <input type="password" id="confirm_password" name="confirm_password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                        <a href="<?= SITE_URL ?>/account.php" class="btn btn-outline">Cancel</a>
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
