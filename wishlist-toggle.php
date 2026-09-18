<?php
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(SITE_URL . '/shop.php');
}

requireCsrf();

$productId = filter_input(INPUT_POST, 'product_id', FILTER_VALIDATE_INT);
$redirectTo = safeInternalPath($_POST['redirect'] ?? null) ?? '/shop.php';

if (!isLoggedIn()) {
    // Preserve exactly where the guest was, the same way requireLogin()
    // does, so login.php sends them right back after signing in.
    $_SESSION['redirect_after_login'] = $redirectTo;
    flash('info', 'Please log in to save products to your wishlist.');
    redirect(SITE_URL . '/login.php');
}

$product = $productId ? getProductById($productId) : null;

if (!$product) {
    flash('error', 'That product is no longer available.');
} else {
    $nowSaved = toggleWishlistItem((int) getCurrentUser()['id'], (int) $product['id']);
    flash('success', $nowSaved ? 'Added to your wishlist.' : 'Removed from your wishlist.');
}

redirect(SITE_URL . $redirectTo);
