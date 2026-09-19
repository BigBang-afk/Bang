<?php
/**
 * Zarghoon Jewellers - One-time production admin setup (Phase 10)
 *
 * Earlier phases shipped a seeded admin account with a fixed password
 * documented right in database.sql - a real risk on any live install
 * that imports the schema as-is. database.sql now creates ZERO admin
 * accounts, and this script is the only way to create the first one.
 *
 * SECURITY:
 *   - Refuses to run at all once at least one admin account already
 *     exists, so it can never be used to plant a second, hidden admin
 *     account later, or replayed if someone finds an old copy of it.
 *   - CSRF-protected like every other POST in this project.
 *   - Never logs the submitted password anywhere.
 *
 * IMPORTANT: DELETE THIS FILE from your server immediately after use.
 * It is intentionally reachable without logging in first (there is no
 * admin yet to log in as) - leaving it in place after setup is a
 * standing risk, not a convenience for later.
 */
require_once __DIR__ . '/includes/functions.php';

$adminCount = (int) dbFetchColumn('SELECT COUNT(*) FROM admins');
$errors = [];
$success = false;

$fullName = '';
$username = '';
$email = '';

if ($adminCount === 0 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $fullName = trim($_POST['full_name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    $passwordConfirm = (string) ($_POST['password_confirm'] ?? '');

    if ($fullName === '') {
        $errors[] = 'Full name is required.';
    }
    if (!preg_match('/^[a-zA-Z0-9_.]{3,50}$/', $username)) {
        $errors[] = 'Username must be 3-50 characters (letters, numbers, dot, underscore only).';
    }
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'A valid email address is required.';
    }
    if (mb_strlen($password) < PASSWORD_MIN_LENGTH) {
        $errors[] = 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters.';
    }
    if ($password !== $passwordConfirm) {
        $errors[] = 'Passwords do not match.';
    }

    // Re-check immediately before the insert too - closes the (very
    // narrow) window where two people could otherwise both pass the
    // initial $adminCount === 0 check at nearly the same instant.
    if (!$errors && (int) dbFetchColumn('SELECT COUNT(*) FROM admins') > 0) {
        $errors[] = 'An administrator account already exists. Setup has already been completed.';
    }

    if (!$errors) {
        dbExecute(
            'INSERT INTO admins (username, email, password, full_name, role, status) VALUES (?, ?, ?, ?, "super_admin", "active")',
            [$username, $email, password_hash($password, PASSWORD_DEFAULT), $fullName]
        );
        $success = true;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zarghoon Jewellers | Admin Setup</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-login-wrap">
    <div class="admin-login-card">
        <div class="admin-login-brand">
            <span class="brand-name">Zarghoon Jewellers</span>
            <span class="brand-sub">First-Time Admin Setup</span>
        </div>

        <?php if ($adminCount > 0 && !$success): ?>
            <div class="admin-login-error">
                An administrator account already exists. Setup has already been completed.
            </div>
            <p style="text-align:center;margin-top:16px;">
                <strong>DELETE this file (setup-admin.php) from your server now.</strong><br>
                <a href="<?= SITE_URL ?>/admin/login.php">Go to Admin Login</a>
            </p>
        <?php elseif ($success): ?>
            <div class="admin-login-error" style="background-color:#e9f5e9;color:#1c5c1c;border-color:#c7e6c7;">
                Administrator account created successfully.
            </div>
            <p style="text-align:center;margin-top:16px;">
                <strong style="color:#8a1f11;">IMPORTANT: DELETE THIS FILE (setup-admin.php) FROM YOUR SERVER RIGHT NOW.</strong><br>
                Leaving it on a live server is a security risk even though it now refuses to create another account.
            </p>
            <p style="text-align:center;margin-top:12px;">
                <a href="<?= SITE_URL ?>/admin/login.php" class="btn btn-primary">Go to Admin Login</a>
            </p>
        <?php else: ?>
            <?php foreach ($errors as $err): ?><div class="admin-login-error"><?= e($err) ?></div><?php endforeach; ?>

            <p class="text-muted" style="margin-bottom:16px;">
                This creates the first (super admin) account for this site. It only works once -
                after this, delete this file.
            </p>

            <form method="post" action="">
                <?= csrfField() ?>
                <div class="form-group">
                    <label for="full_name">Full Name</label>
                    <input type="text" id="full_name" name="full_name" class="form-control" value="<?= e($fullName) ?>" required autofocus>
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-control" value="<?= e($username) ?>" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" class="form-control" value="<?= e($email) ?>" required>
                </div>
                <div class="form-group">
                    <label for="password">Password (min. <?= PASSWORD_MIN_LENGTH ?> characters)</label>
                    <input type="password" id="password" name="password" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="password_confirm">Confirm Password</label>
                    <input type="password" id="password_confirm" name="password_confirm" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Create Administrator Account</button>
            </form>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
