<?php
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(SITE_URL . '/');
}

requireCsrf();

$email = trim($_POST['email'] ?? '');
$redirectTo = safeInternalPath($_POST['redirect'] ?? null) ?? '/';

$result = subscribeToNewsletter($email);
flash($result['success'] ? 'success' : 'error', $result['message']);
redirect(SITE_URL . $redirectTo);
