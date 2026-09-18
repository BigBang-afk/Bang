<?php
require_once __DIR__ . '/../includes/functions.php';

if (isAdminLoggedIn()) {
    redirect(SITE_URL . '/admin/index.php');
}

$error = '';
$loginId = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    if (isAdminLoginBlocked()) {
        $error = 'Too many failed attempts. Please try again in a minute.';
    } else {
        $loginId = trim($_POST['login_id'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        if ($loginId === '' || $password === '') {
            $error = 'Please enter your username/email and password.';
        } else {
            // Never reveal whether the username/email exists: the WHERE
            // clause already excludes inactive accounts, so a deactivated
            // admin naturally falls through to the same generic error below.
            $admin = dbFetchOne(
                'SELECT * FROM admins WHERE (username = ? OR email = ?) AND status = "active" LIMIT 1',
                [$loginId, $loginId]
            );

            if ($admin && password_verify($password, $admin['password'])) {
                resetAdminLoginAttempts();
                loginAdmin($admin);
                logAdminActivity('login', 'admin', (int) $admin['id'], 'Admin "' . $admin['username'] . '" logged in.');
                redirect(SITE_URL . '/admin/index.php');
            } else {
                recordFailedAdminLogin();
                // Never log the attempted password - only that a login
                // attempt failed and which username/email was tried.
                logAdminActivity('login_failed', 'admin', null, 'Failed admin login attempt for "' . $loginId . '".');
                $error = 'Invalid username or password.';
            }
        }
    }
}

$browserTitle = 'Admin Login';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zarghoon Jewellers | <?= e($browserTitle) ?></title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-login-wrap">
    <div class="admin-login-card">
        <div class="admin-login-brand">
            <span class="brand-name">Zarghoon Jewellers</span>
            <span class="brand-sub">Admin Panel</span>
        </div>

        <?php if ($error): ?><div class="admin-login-error"><?= e($error) ?></div><?php endif; ?>
        <?php foreach ((flash() ?: []) as $f): ?>
            <div class="admin-login-error" style="background-color:#f1ece4;color:#292725;border-color:#e7e0d5;"><?= e($f['message']) ?></div>
        <?php endforeach; ?>

        <form method="post" action="">
            <?= csrfField() ?>
            <div class="form-group">
                <label for="login_id">Username or Email</label>
                <input type="text" id="login_id" name="login_id" class="form-control" value="<?= e($loginId) ?>" required autofocus>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Login to Dashboard</button>
        </form>
    </div>
</div>
</body>
</html>
