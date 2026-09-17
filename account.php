<?php
require_once __DIR__ . '/includes/auth.php';
require_login();

$user = current_user();
$errors = [];
$activeTab = $_GET['tab'] ?? 'profile';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'update_profile') {
        $username = trim($_POST['username'] ?? '');
        $mobile = trim($_POST['mobile'] ?? '');
        $email = trim($_POST['email'] ?? '');

        if (!preg_match('/^[a-zA-Z0-9_.]{3,30}$/', $username)) {
            $errors[] = 'Username must be 3-30 characters (letters, numbers, dot, underscore only).';
        }
        if (!valid_mobile($mobile)) {
            $errors[] = 'Please enter a valid mobile number.';
        }
        if ($email !== '' && !valid_email($email)) {
            $errors[] = 'Please enter a valid email address.';
        }

        if (!$errors) {
            $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE username = ? AND id != ?');
            $stmt->execute([$username, $user['id']]);
            if ($stmt->fetchColumn() > 0) $errors[] = 'Username already taken.';

            $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE mobile = ? AND id != ?');
            $stmt->execute([$mobile, $user['id']]);
            if ($stmt->fetchColumn() > 0) $errors[] = 'Mobile number already registered to another account.';

            if ($email !== '') {
                $stmt = db()->prepare('SELECT COUNT(*) FROM users WHERE email = ? AND id != ?');
                $stmt->execute([$email, $user['id']]);
                if ($stmt->fetchColumn() > 0) $errors[] = 'Email already registered to another account.';
            }
        }

        if (!$errors) {
            $stmt = db()->prepare('UPDATE users SET username=?, mobile=?, email=? WHERE id=?');
            $stmt->execute([$username, $mobile, $email ?: null, $user['id']]);
            flash('success', 'Profile updated successfully.');
            redirect(BASE_URL . '/account.php');
        }
        $activeTab = 'profile';
    }

    if ($action === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        if (!password_verify($current, $user['password_hash'])) {
            $errors[] = 'Current password is incorrect.';
        } elseif (strlen($new) < 8) {
            $errors[] = 'New password must be at least 8 characters.';
        } elseif ($new !== $confirm) {
            $errors[] = 'New password and confirmation do not match.';
        } else {
            $hash = password_hash($new, PASSWORD_DEFAULT);
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, $user['id']]);
            flash('success', 'Password changed successfully.');
            redirect(BASE_URL . '/account.php');
        }
        $activeTab = 'password';
    }
}

$stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10');
$stmt->execute([$user['id']]);
$orders = $stmt->fetchAll();

$enquiries = [];
if ($user['email']) {
    $stmt = db()->prepare('SELECT * FROM messages WHERE phone = ? OR email = ? ORDER BY created_at DESC LIMIT 10');
    $stmt->execute([$user['mobile'], $user['email']]);
} else {
    $stmt = db()->prepare('SELECT * FROM messages WHERE phone = ? ORDER BY created_at DESC LIMIT 10');
    $stmt->execute([$user['mobile']]);
}
$enquiries = $stmt->fetchAll();

$pageTitle = 'My Account - Zarghoon Jewellers';
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <h1>My Account</h1>
        <p>Welcome back, <?= e($user['username']) ?></p>
    </div>
</div>
<div class="container section-tight">
    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:32px;">
        <a href="?tab=profile" class="btn <?= $activeTab === 'profile' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Profile</a>
        <a href="?tab=password" class="btn <?= $activeTab === 'password' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Change Password</a>
        <a href="?tab=orders" class="btn <?= $activeTab === 'orders' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Orders</a>
        <a href="?tab=enquiries" class="btn <?= $activeTab === 'enquiries' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Enquiries</a>
        <a href="<?= BASE_URL ?>/wishlist.php" class="btn btn-outline btn-sm">Wishlist</a>
        <a href="<?= BASE_URL ?>/logout.php" class="btn btn-outline btn-sm">Logout</a>
    </div>

    <?php if ($activeTab === 'profile'): ?>
        <div class="auth-card" style="margin:0;">
            <h1 style="font-size:1.4rem;">Profile Details</h1>
            <form method="post">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="update_profile">
                <div class="form-group"><label>Username</label><input type="text" name="username" class="form-control" value="<?= e($user['username']) ?>" required></div>
                <div class="form-group"><label>Mobile Number</label><input type="text" name="mobile" class="form-control" value="<?= e($user['mobile']) ?>" required></div>
                <div class="form-group"><label>Email</label><input type="email" name="email" class="form-control" value="<?= e($user['email'] ?? '') ?>"></div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
        </div>
    <?php elseif ($activeTab === 'password'): ?>
        <div class="auth-card" style="margin:0;">
            <h1 style="font-size:1.4rem;">Change Password</h1>
            <form method="post">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="change_password">
                <div class="form-group"><label>Current Password</label><input type="password" name="current_password" class="form-control" required></div>
                <div class="form-group"><label>New Password</label><input type="password" name="new_password" class="form-control" minlength="8" required></div>
                <div class="form-group"><label>Confirm New Password</label><input type="password" name="confirm_password" class="form-control" minlength="8" required></div>
                <button type="submit" class="btn btn-primary">Change Password</button>
            </form>
        </div>
    <?php elseif ($activeTab === 'orders'): ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                <?php if (!$orders): ?><tr><td colspan="4">You haven't placed any orders yet.</td></tr><?php endif; ?>
                <?php foreach ($orders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= currency((float) $o['total']) ?></td>
                        <td><span class="stock-tag stock-<?= $o['status'] === 'cancelled' ? 'out' : 'in' ?>"><?= e(ucfirst($o['status'])) ?></span></td>
                        <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php elseif ($activeTab === 'enquiries'): ?>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Subject</th><th>Message</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                <?php if (!$enquiries): ?><tr><td colspan="4">You haven't sent any enquiries yet.</td></tr><?php endif; ?>
                <?php foreach ($enquiries as $m): ?>
                    <tr>
                        <td><?= e($m['subject'] ?: 'General Enquiry') ?></td>
                        <td><?= e(mb_strimwidth($m['message'], 0, 100, '...')) ?></td>
                        <td><?= e(ucfirst($m['status'])) ?></td>
                        <td><?= date('d M Y', strtotime($m['created_at'])) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
