<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();
$errors = [];
$fullName = $user['full_name'];
$email = $user['email'] ?? '';
$mobile = $user['mobile'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $fullName = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $mobileInput = trim($_POST['mobile'] ?? '');
    $mobile = $mobileInput;

    if ($fullName === '') {
        $errors[] = 'Please enter your full name.';
    } elseif (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 100) {
        $errors[] = 'Full name must be between 2 and 100 characters.';
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address, or leave it empty.';
    }

    $normalizedMobile = normalizeMobile($mobileInput);
    if ($mobileInput === '') {
        $errors[] = 'Please enter your mobile number.';
    } elseif ($normalizedMobile === null) {
        $errors[] = 'Please enter a valid Pakistani mobile number, e.g. 03001234567.';
    } elseif ($normalizedMobile !== $user['mobile']
        && dbFetchColumn('SELECT COUNT(*) FROM users WHERE mobile = ? AND id != ?', [$normalizedMobile, $user['id']])
    ) {
        $errors[] = 'This mobile number is already registered to another account.';
    }

    if (!$errors) {
        dbExecute(
            'UPDATE users SET full_name = ?, email = ?, mobile = ? WHERE id = ?',
            [$fullName, $email !== '' ? $email : null, $normalizedMobile, $user['id']]
        );
        flash('success', 'Profile updated successfully.');
        redirect(SITE_URL . '/account.php');
    }
}

$pageTitle = 'Edit Profile';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>Edit Profile</h1></div>

        <div class="account-layout">
            <aside class="account-nav">
                <a href="<?= SITE_URL ?>/account.php" class="account-nav-link">Profile</a>
                <span class="account-nav-link is-disabled" title="Coming soon">Orders</span>
                <span class="account-nav-link is-disabled" title="Coming soon">Wishlist</span>
                <a href="<?= SITE_URL ?>/account-edit.php" class="account-nav-link active">Settings</a>
            </aside>

            <div class="account-content">
                <div class="account-panel" style="max-width:520px;">
                    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

                    <form method="post" action="">
                        <?= csrfField() ?>
                        <div class="form-group">
                            <label for="full_name">Full Name</label>
                            <input type="text" id="full_name" name="full_name" class="form-control" value="<?= e($fullName) ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="username_display">Username</label>
                            <input type="text" id="username_display" class="form-control" value="<?= e($user['username']) ?>" disabled>
                            <p class="form-help">Your username cannot be changed.</p>
                        </div>
                        <div class="form-group">
                            <label for="mobile">Mobile Number</label>
                            <input type="text" id="mobile" name="mobile" class="form-control" value="<?= e($mobile) ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email Address <span class="text-muted">(optional)</span></label>
                            <input type="email" id="email" name="email" class="form-control" value="<?= e($email) ?>">
                        </div>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <a href="<?= SITE_URL ?>/account.php" class="btn btn-outline">Cancel</a>
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
