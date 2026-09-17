<?php
require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    redirect(BASE_URL . '/account.php');
}

$errors = [];
$loginId = '';

if (empty($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['login_lock_until'] = 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $loginId = trim($_POST['login_id'] ?? '');
    $password = (string) ($_POST['password'] ?? '');

    if (time() < ($_SESSION['login_lock_until'] ?? 0)) {
        $errors[] = 'Too many failed attempts. Please try again in a minute.';
    } elseif ($loginId === '' || $password === '') {
        $errors[] = 'Please enter your username/mobile and password.';
    } else {
        $stmt = db()->prepare('SELECT * FROM users WHERE username = ? OR mobile = ? LIMIT 1');
        $stmt->execute([$loginId, $loginId]);
        $user = $stmt->fetch();

        if ($user && $user['status'] === 'active' && password_verify($password, $user['password_hash'])) {
            $_SESSION['login_attempts'] = 0;
            login_user((int) $user['id']);

            // Merge guest cart (session) into the persistent DB cart.
            if (!empty($_SESSION['guest_cart'])) {
                $stmt = db()->prepare(
                    'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
                );
                foreach ($_SESSION['guest_cart'] as $productId => $qty) {
                    $stmt->execute([$user['id'], (int) $productId, (int) $qty]);
                }
                unset($_SESSION['guest_cart']);
            }

            $redirectTo = $_SESSION['redirect_after_login'] ?? (BASE_URL . '/account.php');
            unset($_SESSION['redirect_after_login']);
            redirect($redirectTo);
        } elseif ($user && $user['status'] !== 'active') {
            $errors[] = 'Your account is inactive. Please contact us for assistance.';
        } else {
            $_SESSION['login_attempts']++;
            if ($_SESSION['login_attempts'] >= 6) {
                $_SESSION['login_lock_until'] = time() + 60;
                $_SESSION['login_attempts'] = 0;
            }
            $errors[] = 'Invalid username/mobile or password.';
        }
    }
}

$pageTitle = 'Login - Zarghoon Jewellers';
require __DIR__ . '/includes/header.php';
?>
<div class="section" style="padding-top:60px;">
    <div class="container">
        <div class="auth-card">
            <h1>Welcome Back</h1>
            <p class="subtitle">Sign in to manage your orders and wishlist.</p>
            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>
            <form method="post">
                <?= csrf_field() ?>
                <div class="form-group">
                    <label>Username or Mobile Number</label>
                    <input type="text" name="login_id" class="form-control" value="<?= e($loginId) ?>" required autofocus>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Sign In</button>
            </form>
            <p class="auth-switch">New to Zarghoon Jewellers? <a href="<?= BASE_URL ?>/register.php">Create an account</a></p>
        </div>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
