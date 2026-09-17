<?php
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/cart.php';

$user = current_user();

// Show one-time confirmation after a successful order, then clear it.
if (!empty($_SESSION['last_order_confirmation'])) {
    $confirmation = $_SESSION['last_order_confirmation'];
    unset($_SESSION['last_order_confirmation']);

    $pageTitle = 'Order Confirmed - ' . get_setting('shop_name', SITE_NAME);
    require __DIR__ . '/includes/header.php';
    ?>
    <div class="container section">
        <div class="empty-state" style="max-width:560px;margin:0 auto;">
            <h2 style="color:var(--dark);">Thank you, <?= e($confirmation['name']) ?>!</h2>
            <p>Your order <strong><?= e($confirmation['order_number']) ?></strong> has been received. Our team will contact you at <strong><?= e($confirmation['mobile']) ?></strong> shortly to confirm the details.</p>
            <p style="font-size:1.3rem;color:var(--gold-dark);font-family:var(--font-serif);"><?= currency($confirmation['total']) ?></p>
            <div class="hero-actions" style="justify-content:center;">
                <a href="<?= BASE_URL ?>/shop.php" class="btn btn-outline">Continue Shopping</a>
                <?php if ($user): ?><a href="<?= BASE_URL ?>/orders.php" class="btn btn-primary">View My Orders</a><?php endif; ?>
            </div>
        </div>
    </div>
    <?php
    require __DIR__ . '/includes/footer.php';
    exit;
}

$items = get_cart_items();
if (!$items) {
    flash('info', 'Your cart is empty. Please add items before checking out.');
    redirect(BASE_URL . '/cart.php');
}
$subtotal = cart_subtotal($items);

$errors = [];
$name = $user['username'] ?? '';
$mobile = $user['mobile'] ?? '';
$email = $user['email'] ?? '';
$address = '';
$city = '';
$notes = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $notes = trim($_POST['notes'] ?? '');

    if ($name === '') $errors[] = 'Please enter your name.';
    if (!valid_mobile($mobile)) $errors[] = 'Please enter a valid mobile number (e.g. 03001234567).';
    if ($email !== '' && !valid_email($email)) $errors[] = 'Please enter a valid email address.';
    if ($address === '') $errors[] = 'Please enter your delivery address.';
    if ($city === '') $errors[] = 'Please enter your city.';

    // Re-verify cart server-side right before committing the order (defends against stale/tampered data).
    $items = get_cart_items();
    if (!$items) {
        $errors[] = 'Your cart is empty.';
    }

    if (!$errors) {
        $subtotal = cart_subtotal($items);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $orderNumber = generate_order_number();
            $stmt = $pdo->prepare(
                'INSERT INTO orders (order_number, user_id, name, mobile, email, address, city, notes, subtotal, total, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,"pending")'
            );
            $stmt->execute([
                $orderNumber, $user['id'] ?? null, $name, $mobile, $email ?: null,
                $address, $city, $notes ?: null, $subtotal, $subtotal,
            ]);
            $orderId = (int) $pdo->lastInsertId();

            $itemStmt = $pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, product_name, sku, purity, net_weight, gold_rate, unit_price, quantity, line_total)
                 VALUES (?,?,?,?,?,?,?,?,?,?)'
            );
            foreach ($items as $item) {
                $p = $item['product'];
                $rateUsed = get_rate_for_karat($p['purity']) ?? (float) $p['gold_rate'];
                $itemStmt->execute([
                    $orderId, $p['id'], $p['name'], $p['sku'], $p['purity'],
                    $p['net_weight'], $rateUsed, $item['unit_price'], $item['quantity'], $item['line_total'],
                ]);
            }

            $pdo->commit();
            clear_cart();
            log_activity('New order ' . $orderNumber . ' placed by ' . $name . '.');

            $_SESSION['last_order_confirmation'] = [
                'order_number' => $orderNumber, 'name' => $name, 'mobile' => $mobile, 'total' => $subtotal,
            ];
            redirect(BASE_URL . '/checkout.php');
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Order creation failed: ' . $e->getMessage());
            $errors[] = 'Something went wrong while placing your order. Please try again.';
        }
    }
}

$pageTitle = 'Checkout - ' . get_setting('shop_name', SITE_NAME);
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Checkout</div>
        <h1>Checkout</h1>
    </div>
</div>

<div class="container section-tight">
    <div class="form-row" style="align-items:start;gap:50px;">
        <div>
            <h3>Delivery Details</h3>
            <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>
            <form method="post">
                <?= csrf_field() ?>
                <div class="form-row">
                    <div class="form-group"><label>Full Name</label><input type="text" name="name" class="form-control" value="<?= e($name) ?>" required></div>
                    <div class="form-group"><label>Mobile Number</label><input type="text" name="mobile" class="form-control" value="<?= e($mobile) ?>" placeholder="03001234567" required></div>
                </div>
                <div class="form-group"><label>Email (optional)</label><input type="email" name="email" class="form-control" value="<?= e($email) ?>"></div>
                <div class="form-group"><label>Delivery Address</label><input type="text" name="address" class="form-control" value="<?= e($address) ?>" required></div>
                <div class="form-group"><label>City</label><input type="text" name="city" class="form-control" value="<?= e($city) ?>" required></div>
                <div class="form-group"><label>Order Notes (optional)</label><textarea name="notes" class="form-control"><?= e($notes) ?></textarea></div>
                <p class="form-help">This places your order as a confirmed enquiry. Our team will contact you to finalize payment and delivery.</p>
                <button type="submit" class="btn btn-primary btn-block">Place Order</button>
            </form>
        </div>
        <div>
            <h3>Order Summary</h3>
            <div class="table-wrap">
                <table class="data-table">
                    <?php foreach ($items as $item): $p = $item['product']; ?>
                        <tr>
                            <td><?= e($p['name']) ?> &times; <?= (int) $item['quantity'] ?></td>
                            <td style="text-align:right;"><?= currency($item['line_total']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <tr><td><strong>Subtotal</strong></td><td style="text-align:right;"><strong><?= currency($subtotal) ?></strong></td></tr>
                </table>
            </div>
        </div>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
