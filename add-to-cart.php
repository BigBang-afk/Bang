<?php
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(SITE_URL . '/shop.php');
}

requireCsrf();

$productId = filter_input(INPUT_POST, 'product_id', FILTER_VALIDATE_INT);
$quantity = filter_input(INPUT_POST, 'quantity', FILTER_VALIDATE_INT);
$quantity = $quantity !== false && $quantity !== null ? $quantity : 1;
$redirectTo = safeInternalPath($_POST['redirect'] ?? null) ?? '/shop.php';

// The product's existence, active status, and price are always
// re-verified server-side here - nothing about the product is ever
// trusted from the submitted form itself beyond its id.
$product = $productId ? getProductById($productId) : null;

if (!$product) {
    flash('error', 'That product is no longer available.');
    redirect(SITE_URL . $redirectTo);
}

if ($product['stock_status'] !== 'in_stock') {
    flash('error', 'That product is not currently available to purchase.');
    redirect(SITE_URL . $redirectTo);
}

addToCart((int) $product['id'], max(1, min(CART_MAX_QUANTITY_PER_ITEM, $quantity)));
flash('success', 'Added to your bag.', 'View Cart', '/cart.php');
redirect(SITE_URL . $redirectTo);
