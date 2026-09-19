<?php
require_once __DIR__ . '/includes/functions.php';

if (isLoggedIn()) {
    redirect(SITE_URL . '/account.php');
}

$errors = [];
$data = ['full_name' => '', 'username' => '', 'mobile' => '', 'email' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $fullName = trim($_POST['full_name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $mobileInput = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');

    $data = ['full_name' => $fullName, 'username' => $username, 'mobile' => $mobileInput, 'email' => $email];

    // ---- Full Name ----
    if ($fullName === '') {
        $errors[] = 'Please enter your full name.';
    } elseif (mb_strlen($fullName) < 2 || mb_strlen($fullName) > 100) {
        $errors[] = 'Full name must be between 2 and 100 characters.';
    }

    // ---- Username: required, unique, safe characters only ----
    if ($username === '') {
        $errors[] = 'Please choose a username.';
    } elseif (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
        $errors[] = 'Username must be 3-30 characters and contain only letters, numbers, and underscores.';
    } elseif (dbFetchColumn('SELECT COUNT(*) FROM users WHERE username = ?', [$username])) {
        $errors[] = 'This username is already taken.';
    }

    // ---- Mobile: required, unique, normalized so "03..." and "+92..."
    // for the same number can never create two accounts ----
    $normalizedMobile = normalizeMobile($mobileInput);
    if ($mobileInput === '') {
        $errors[] = 'Please enter your mobile number.';
    } elseif ($normalizedMobile === null) {
        $errors[] = 'Please enter a valid Pakistani mobile number, e.g. 03001234567.';
    } elseif (dbFetchColumn('SELECT COUNT(*) FROM users WHERE mobile = ?', [$normalizedMobile])) {
        $errors[] = 'This mobile number is already registered.';
    }

    // ---- Email (optional): validate format only if provided ----
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address, or leave it empty.';
    }

    // ---- Password ----
    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        $errors[] = 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long.';
    }
    if ($password !== $confirmPassword) {
        $errors[] = 'Password and confirm password do not match.';
    }

    if (!$errors) {
        registerUser([
            'full_name' => $fullName,
            'username' => $username,
            'mobile' => $normalizedMobile,
            'email' => $email,
            'password' => $password,
        ]);

        sendNewCustomerAdminNotification(['full_name' => $fullName, 'username' => $username, 'mobile' => $normalizedMobile]);

        flash('success', 'Account created successfully. You can now log in.');
        redirect(SITE_URL . '/login.php');
    }
}

$pageTitle = 'Create Your Account';
require __DIR__ . '/includes/header.php';
?>
<section class="section auth-section">
    <div class="container auth-container">
        <div class="auth-card">
            <span class="eyebrow" style="display:block;text-align:center;">Join Zarghoon Jewellers</span>
            <h1 style="text-align:center;">Create Your Account</h1>

            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

            <form method="post" action="" novalidate>
                <?= csrfField() ?>

                <div class="form-group">
                    <label for="full_name">Full Name</label>
                    <input type="text" id="full_name" name="full_name" class="form-control" value="<?= e($data['full_name']) ?>" required autofocus>
                </div>

                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-control" value="<?= e($data['username']) ?>" required>
                    <p class="form-help">3-30 characters: letters, numbers, and underscores only.</p>
                </div>

                <div class="form-group">
                    <label for="mobile">Mobile Number</label>
                    <input type="text" id="mobile" name="mobile" class="form-control" value="<?= e($data['mobile']) ?>" placeholder="03XXXXXXXXX" required>
                </div>

                <div class="form-group">
                    <label for="email">Email Address <span class="text-muted">(optional)</span></label>
                    <input type="email" id="email" name="email" class="form-control" value="<?= e($data['email']) ?>">
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" class="form-control" required>
                    <p class="form-help">At least <?= PASSWORD_MIN_LENGTH ?> characters. For a stronger password, mix uppercase, lowercase, and numbers.</p>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" class="form-control" required>
                </div>

                <button type="submit" class="btn btn-primary btn-block">Create Account</button>
            </form>

            <p class="auth-switch">Already have an account? <a href="<?= SITE_URL ?>/login.php">Login</a></p>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
