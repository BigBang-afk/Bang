<?php
require_once __DIR__ . '/../includes/functions.php';

$admin = getCurrentAdmin();
if ($admin) {
    logAdminActivity('logout', 'admin', (int) $admin['id'], 'Admin "' . $admin['username'] . '" logged out.');
}

logoutAdmin();
redirect(SITE_URL . '/admin/login.php');
