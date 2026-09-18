<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect(SITE_URL . '/account.php');
}

$errors = [];
$loginId = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    if (isLoginBlocked()) {
        $errors[] = 'Too many failed attempts. Please wait a minute and try again.';
    } else {
        $loginId = trim($_POST['login'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        if ($loginId === '' || $password === '') {
            $errors[] = 'Please enter your username/mobile number and password.';
        } else {
            // Never reveal whether the account exists: a missing user and
            // a wrong password both fall through to the same generic
            // error message below.
            $user = findUserByLogin($loginId);

            if ($user && password_verify($password, $user['password'])) {
                resetLoginAttempts();
                loginUser($user);
                redirect(SITE_URL . getAndClearRedirectAfterLogin());
            } else {
                recordFailedLogin();
                $errors[] = 'Invalid username or password.';
            }
        }
    }
}

$pageTitle = 'Login';
require __DIR__ . '/includes/header.php';
?>
<section class="section auth-section">
    <div class="container auth-container">
        <div class="auth-card">
            <span class="eyebrow" style="display:block;text-align:center;">Login to Your Account</span>
            <h1 style="text-align:center;">Welcome Back</h1>

            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

            <form method="post" action="" novalidate>
                <?= csrfField() ?>
                <div class="form-group">
                    <label for="login">Username or Mobile Number</label>
                    <input type="text" id="login" name="login" class="form-control" value="<?= e($loginId) ?>" required autofocus>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" class="form-control" required>
                </div>
                <p style="text-align:right;margin-top:-10px;"><a href="<?= SITE_URL ?>/forgot-password.php" class="text-muted">Forgot password?</a></p>
                <button type="submit" class="btn btn-primary btn-block">Login</button>
            </form>

            <p class="auth-switch">Don't have an account? <a href="<?= SITE_URL ?>/register.php">Create one</a></p>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
