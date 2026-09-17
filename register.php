<?php
require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    redirect(BASE_URL . '/account.php');
}

$errors = [];
$username = '';
$mobile = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $username = trim($_POST['username'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');

    if (!preg_match('/^[a-zA-Z0-9_.]{3,30}$/', $username)) {
        $errors[] = 'Username must be 3-30 characters (letters, numbers, dot, underscore only).';
    }
    if (!valid_mobile($mobile)) {
        $errors[] = 'Please enter a valid mobile number (e.g. 03001234567).';
    }
    if ($email !== '' && !valid_email($email)) {
        $errors[] = 'Please enter a valid email address.';
    }
    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters.';
    }
    if ($password !== $confirmPassword) {
        $errors[] = 'Password and confirmation do not match.';
    }

    if (!$errors) {
        $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() > 0) $errors[] = 'This username is already taken.';

        $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE mobile = ?');
        $stmt->execute([$mobile]);
        if ($stmt->fetchColumn() > 0) $errors[] = 'This mobile number is already registered.';

        if ($email !== '') {
            $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetchColumn() > 0) $errors[] = 'This email is already registered.';
        }
    }

    if (!$errors) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = db()->prepare('INSERT INTO users (username, mobile, email, password_hash) VALUES (?, ?, ?, ?)');
        $stmt->execute([$username, $mobile, $email ?: null, $hash]);
        $userId = (int) db()->lastInsertId();
        login_user($userId);
        flash('success', 'Welcome to Zarghoon Jewellers, ' . $username . '!');
        redirect(BASE_URL . '/account.php');
    }
}

$pageTitle = 'Create Account - Zarghoon Jewellers';
$activeNav = '';
require __DIR__ . '/includes/header.php';
?>
<div class="section" style="padding-top:60px;">
    <div class="container">
        <div class="auth-card">
            <h1>Create Account</h1>
            <p class="subtitle">Join Zarghoon Jewellers for a personalised shopping experience.</p>
            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>
            <form method="post">
                <?= csrf_field() ?>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" class="form-control" value="<?= e($username) ?>" required>
                </div>
                <div class="form-group">
                    <label>Mobile Number</label>
                    <input type="text" name="mobile" class="form-control" value="<?= e($mobile) ?>" placeholder="03001234567" required>
                </div>
                <div class="form-group">
                    <label>Email (optional)</label>
                    <input type="email" name="email" class="form-control" value="<?= e($email) ?>">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" class="form-control" minlength="8" required>
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" name="confirm_password" class="form-control" minlength="8" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Create Account</button>
            </form>
            <p class="auth-switch">Already have an account? <a href="<?= BASE_URL ?>/login.php">Sign in</a></p>
        </div>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
