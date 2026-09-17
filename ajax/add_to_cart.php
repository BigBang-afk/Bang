<?php
require_once __DIR__ . '/../includes/cart.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify()) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request.']);
    exit;
}

$productId = (int) ($_POST['product_id'] ?? 0);
$quantity = max(1, min(10, (int) ($_POST['quantity'] ?? 1)));

$stmt = db()->prepare('SELECT stock_status FROM products WHERE id = ? AND status = "active"');
$stmt->execute([$productId]);
$product = $stmt->fetch();

if (!$product) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Product not found.']);
    exit;
}
if ($product['stock_status'] === 'out_of_stock') {
    echo json_encode(['status' => 'error', 'message' => 'This item is currently out of stock.']);
    exit;
}

add_to_cart($productId, $quantity);

echo json_encode(['status' => 'ok', 'count' => cart_count()]);
