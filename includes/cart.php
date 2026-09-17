<?php
/**
 * Cart helpers shared by cart.php, checkout.php, and the AJAX endpoints.
 * Guests: cart stored in $_SESSION['guest_cart'] as [product_id => quantity].
 * Logged-in customers: persisted in the cart_items table.
 */
require_once __DIR__ . '/auth.php';

/**
 * Returns cart line items with live product + effective price data attached.
 * Each item: ['product' => array, 'quantity' => int, 'line_total' => float]
 */
function get_cart_items(): array
{
    $pdo = db();
    $user = current_user();
    $rows = [];

    if ($user) {
        $stmt = $pdo->prepare('SELECT product_id, quantity FROM cart_items WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        $rows = $stmt->fetchAll();
    } else {
        foreach ($_SESSION['guest_cart'] ?? [] as $productId => $qty) {
            $rows[] = ['product_id' => (int) $productId, 'quantity' => (int) $qty];
        }
    }

    if (!$rows) {
        return [];
    }

    $ids = array_column($rows, 'product_id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT p.*, (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_main DESC, pi.sort_order ASC LIMIT 1) AS main_image
         FROM products p WHERE p.id IN ($placeholders) AND p.status = 'active'"
    );
    $stmt->execute($ids);
    $products = [];
    foreach ($stmt->fetchAll() as $p) {
        $products[$p['id']] = $p;
    }

    $items = [];
    foreach ($rows as $row) {
        $pid = (int) $row['product_id'];
        if (!isset($products[$pid])) continue; // product deleted/deactivated since being added
        $product = $products[$pid];
        $qty = max(1, (int) $row['quantity']);
        $unitPrice = get_effective_price($product);
        $items[] = [
            'product' => $product,
            'quantity' => $qty,
            'unit_price' => $unitPrice,
            'line_total' => round($unitPrice * $qty, 2),
        ];
    }
    return $items;
}

function cart_subtotal(array $items): float
{
    return array_sum(array_column($items, 'line_total'));
}

function add_to_cart(int $productId, int $quantity): void
{
    $quantity = max(1, min(10, $quantity));
    $user = current_user();
    if ($user) {
        $stmt = db()->prepare(
            'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), 10)'
        );
        $stmt->execute([$user['id'], $productId, $quantity]);
    } else {
        $_SESSION['guest_cart'][$productId] = min(10, ($_SESSION['guest_cart'][$productId] ?? 0) + $quantity);
    }
}

function update_cart_quantity(int $productId, int $quantity): void
{
    $user = current_user();
    if ($quantity <= 0) {
        remove_from_cart($productId);
        return;
    }
    $quantity = min(10, $quantity);
    if ($user) {
        $stmt = db()->prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?');
        $stmt->execute([$quantity, $user['id'], $productId]);
    } else {
        $_SESSION['guest_cart'][$productId] = $quantity;
    }
}

function remove_from_cart(int $productId): void
{
    $user = current_user();
    if ($user) {
        $stmt = db()->prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?');
        $stmt->execute([$user['id'], $productId]);
    } else {
        unset($_SESSION['guest_cart'][$productId]);
    }
}

function clear_cart(): void
{
    $user = current_user();
    if ($user) {
        db()->prepare('DELETE FROM cart_items WHERE user_id = ?')->execute([$user['id']]);
    } else {
        unset($_SESSION['guest_cart']);
    }
}
