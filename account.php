<?php
require_once __DIR__ . '/includes/functions.php';
requireLogin();

$user = getCurrentUser();

$pageTitle = 'My Account';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading">
            <h1>My Account</h1>
            <p class="text-muted">Welcome, <?= e($user['full_name']) ?></p>
        </div>

        <div class="account-layout">
            <aside class="account-nav">
                <a href="<?= SITE_URL ?>/account.php" class="account-nav-link active">Profile</a>
                <span class="account-nav-link is-disabled" title="Coming soon">Orders</span>
                <a href="<?= SITE_URL ?>/wishlist.php" class="account-nav-link">Wishlist</a>
                <a href="<?= SITE_URL ?>/account-edit.php" class="account-nav-link">Settings</a>
            </aside>

            <div class="account-content">
                <div class="account-cards">
                    <div class="account-card">
                        <h3>My Profile</h3>
                        <p class="text-muted">View and edit your personal details.</p>
                        <a href="<?= SITE_URL ?>/account-edit.php" class="btn btn-outline btn-sm">Edit Profile</a>
                    </div>
                    <div class="account-card is-disabled" id="orders">
                        <h3>My Orders</h3>
                        <p class="text-muted">Order history is coming in a later phase.</p>
                        <span class="tag-coming-soon">Coming Soon</span>
                    </div>
                    <div class="account-card">
                        <h3>My Wishlist</h3>
                        <p class="text-muted">View the pieces you've saved for later.</p>
                        <a href="<?= SITE_URL ?>/wishlist.php" class="btn btn-outline btn-sm">View Wishlist</a>
                    </div>
                    <div class="account-card is-disabled">
                        <h3>My Enquiries</h3>
                        <p class="text-muted">Your messages to us will appear here.</p>
                        <span class="tag-coming-soon">Coming Soon</span>
                    </div>
                </div>

                <div class="account-panel">
                    <h3>Profile Information</h3>
                    <dl class="account-info">
                        <div><dt>Full Name</dt><dd><?= e($user['full_name']) ?></dd></div>
                        <div><dt>Username</dt><dd><?= e($user['username']) ?></dd></div>
                        <div><dt>Mobile</dt><dd><?= e($user['mobile']) ?></dd></div>
                        <div><dt>Email</dt><dd><?= e($user['email'] ?: 'Not provided') ?></dd></div>
                        <div><dt>Member Since</dt><dd><?= date('d M Y', strtotime($user['created_at'])) ?></dd></div>
                    </dl>

                    <div class="account-actions">
                        <a href="<?= SITE_URL ?>/account-edit.php" class="btn btn-primary">Edit Profile</a>
                        <a href="<?= SITE_URL ?>/account-password.php" class="btn btn-outline">Change Password</a>
                        <a href="<?= SITE_URL ?>/logout.php" class="btn btn-outline">Logout</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
