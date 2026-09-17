<?php
require_once __DIR__ . '/../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify()) {
    redirect(BASE_URL . '/index.php');
}

$email = trim($_POST['email'] ?? '');

if (valid_email($email)) {
    $stmt = db()->prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
    $stmt->execute(['Newsletter Subscriber', $email, 'Newsletter Signup', 'Requested to join the newsletter mailing list.']);
    flash('success', 'Thank you for subscribing!');
} else {
    flash('error', 'Please enter a valid email address.');
}

$referer = $_SERVER['HTTP_REFERER'] ?? '';
// Only redirect back to a same-site page to avoid an open-redirect via a spoofed Referer header.
if (strpos($referer, BASE_URL) !== 0) {
    $referer = BASE_URL . '/index.php';
}
redirect($referer);
