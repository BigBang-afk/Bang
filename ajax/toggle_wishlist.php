<?php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify()) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request.']);
    exit;
}

$user = current_user();
if (!$user) {
    echo json_encode(['status' => 'auth_required']);
    exit;
}

$productId = (int) ($_POST['product_id'] ?? 0);
$stmt = db()->prepare('SELECT COUNT(*) FROM products WHERE id = ? AND status = "active"');
$stmt->execute([$productId]);
if (!$productId || !$stmt->fetchColumn()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Product not found.']);
    exit;
}

$stmt = db()->prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?');
$stmt->execute([$user['id'], $productId]);
$existing = $stmt->fetch();

if ($existing) {
    db()->prepare('DELETE FROM wishlists WHERE id = ?')->execute([$existing['id']]);
    $action = 'removed';
} else {
    db()->prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)')->execute([$user['id'], $productId]);
    $action = 'added';
}

echo json_encode(['status' => 'ok', 'action' => $action, 'count' => wishlist_count()]);
