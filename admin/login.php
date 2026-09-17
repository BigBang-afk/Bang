<?php
require_once __DIR__ . '/../includes/admin_auth.php';

if (is_admin_logged_in()) {
    redirect(BASE_URL . '/admin/index.php');
}

$error = '';

// Basic brute-force throttling using the session.
if (empty($_SESSION['admin_login_attempts'])) {
    $_SESSION['admin_login_attempts'] = 0;
    $_SESSION['admin_login_lock_until'] = 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    if (time() < ($_SESSION['admin_login_lock_until'] ?? 0)) {
        $error = 'Too many failed attempts. Please try again in a minute.';
    } else {
        $username = trim($_POST['username'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        if ($username === '' || $password === '') {
            $error = 'Please enter your username and password.';
        } else {
            $stmt = db()->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
            $stmt->execute([$username]);
            $admin = $stmt->fetch();

            if ($admin && $admin['status'] === 'active' && password_verify($password, $admin['password_hash'])) {
                $_SESSION['admin_login_attempts'] = 0;
                login_admin((int) $admin['id']);
                log_activity('Admin "' . $admin['username'] . '" logged in.');
                redirect(BASE_URL . '/admin/index.php');
            } else {
                $_SESSION['admin_login_attempts']++;
                if ($_SESSION['admin_login_attempts'] >= 5) {
                    $_SESSION['admin_login_lock_until'] = time() + 60;
                    $_SESSION['admin_login_attempts'] = 0;
                }
                $error = 'Invalid username or password.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login - Zarghoon Jewellers</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-login-wrap">
    <div class="admin-login-card">
        <h1>Zarghoon Jewellers</h1>
        <p class="sub">Admin Panel</p>
        <?php if ($error): ?><p class="login-error"><?= e($error) ?></p><?php endif; ?>
        <form method="post" action="">
            <?= csrf_field() ?>
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" class="form-control" required autofocus>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Sign In</button>
        </form>
    </div>
</div>
</body>
</html>
