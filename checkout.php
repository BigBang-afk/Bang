<?php
require_once __DIR__ . '/includes/functions.php';

$cart = getCartDetails();

// Never show a checkout form for an empty bag, regardless of login state.
if (!$cart['items']) {
    redirect(SITE_URL . '/cart.php');
}

if (!isLoggedIn()) {
    // Preserve exactly where the customer was headed, the same way
    // requireLogin() does, so they land back on checkout right after
    // logging in (or registering, which itself redirects through login.php).
    $_SESSION['redirect_after_login'] = '/checkout.php';

    $pageTitle = 'Checkout';
    require __DIR__ . '/includes/header.php';
    ?>
    <section class="section auth-section">
        <div class="container auth-container">
            <div class="auth-card" style="text-align:center;">
                <span class="eyebrow">Checkout</span>
                <h1>Almost There</h1>
                <p class="text-muted">Please login or create an account to continue.</p>
                <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
                    <a href="<?= SITE_URL ?>/login.php" class="btn btn-primary">Login</a>
                    <a href="<?= SITE_URL ?>/register.php" class="btn btn-outline">Create Account</a>
                </div>
            </div>
        </div>
    </section>
    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php
    exit;
}

$user = getCurrentUser();
$errors = [];

$fullName = $user['full_name'];
$mobile = $user['mobile'];
$email = $user['email'] ?? '';
$address = '';
$city = '';
$notes = '';
$paymentMethod = 'cash_on_delivery';

// Only one payment option exists this phase - kept as a whitelist array
// (rather than a hard-coded single value) so a future phase can add
// bank_transfer/online payment options without restructuring this check.
$allowedPaymentMethods = ['cash_on_delivery' => 'Cash / Pay on Confirmation'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $fullName = trim($_POST['full_name'] ?? '');
    $mobileInput = trim($_POST['mobile'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $notes = trim($_POST['notes'] ?? '');
    $paymentMethod = $_POST['payment_method'] ?? 'cash_on_delivery';

    if ($fullName === '') {
        $errors[] = 'Please enter your full name.';
    } elseif (mb_strlen($fullName) > 100) {
        $errors[] = 'Full name must be 100 characters or fewer.';
    }

    $normalizedMobile = normalizeMobile($mobileInput);
    if ($mobileInput === '') {
        $errors[] = 'Please enter your mobile number.';
    } elseif ($normalizedMobile === null) {
        $errors[] = 'Please enter a valid Pakistani mobile number, e.g. 03001234567.';
    }
    $mobile = $mobileInput;

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address, or leave it empty.';
    }

    if ($address === '') {
        $errors[] = 'Please enter your delivery address.';
    } elseif (mb_strlen($address) > 255) {
        $errors[] = 'Address must be 255 characters or fewer.';
    }

    if ($city === '') {
        $errors[] = 'Please enter your city.';
    } elseif (mb_strlen($city) > 100) {
        $errors[] = 'City must be 100 characters or fewer.';
    }

    if (mb_strlen($notes) > 1000) {
        $errors[] = 'Order notes must be 1000 characters or fewer.';
    }

    if (!array_key_exists($paymentMethod, $allowedPaymentMethods)) {
        $errors[] = 'Please select a valid payment method.';
    }

    // Re-check the bag right before placing the order - it may have
    // changed (or emptied) since the page was first loaded.
    $cart = getCartDetails();
    if (!$cart['items']) {
        flash('error', 'Your bag is empty.');
        redirect(SITE_URL . '/cart.php');
    }

    if (!$errors) {
        try {
            $orderId = dbTransaction(function () use ($user, $fullName, $normalizedMobile, $email, $address, $city, $notes, $paymentMethod) {
                // Re-read the cart from the session and lock each product
                // row for the duration of this transaction, so a
                // concurrent admin edit (e.g. marking something out of
                // stock) can't race with this checkout.
                $sessionCart = getCart();
                if (!$sessionCart) {
                    throw new RuntimeException('Your bag is empty.');
                }

                $subtotal = 0.0;
                $discountTotal = 0.0;
                $grandTotal = 0.0;
                $orderItemRows = [];

                foreach ($sessionCart as $productId => $quantity) {
                    $quantity = (int) $quantity;
                    if ($quantity < 1) {
                        continue;
                    }

                    $product = dbFetchOne('SELECT * FROM products WHERE id = ? FOR UPDATE', [(int) $productId]);
                    if (!$product || $product['status'] !== 'active') {
                        throw new RuntimeException('One of the items in your bag is no longer available. Please review your bag and try again.');
                    }
                    if ($product['stock_status'] !== 'in_stock') {
                        throw new RuntimeException('"' . $product['name'] . '" is no longer available for purchase. Please remove it from your bag and try again.');
                    }

                    $breakdown = calculateProductPrice($product);
                    $unitPrice = $breakdown['final_price'];
                    $unitDiscount = $breakdown['discount'];
                    $unitPreDiscount = $breakdown['gold_value'] + $breakdown['making_charges'] + $breakdown['stone_charges'] + $breakdown['other_charges'];

                    $subtotal += $unitPreDiscount * $quantity;
                    $discountTotal += $unitDiscount * $quantity;
                    $grandTotal += $unitPrice * $quantity;

                    $orderItemRows[] = [
                        'product_id' => (int) $product['id'],
                        'product_name' => $product['name'],
                        'sku' => $product['sku'],
                        'purity' => $product['purity'],
                        'net_weight' => $product['net_weight'],
                        'quantity' => $quantity,
                        'unit_price' => round($unitPrice, 2),
                        'total_price' => round($unitPrice * $quantity, 2),
                    ];
                }

                if (!$orderItemRows) {
                    throw new RuntimeException('Your bag is empty.');
                }

                $orderNumber = generateUniqueOrderNumber();

                dbExecute(
                    'INSERT INTO orders (user_id, order_number, customer_name, mobile, email, address, city, notes,
                        subtotal, discount, total, payment_method, order_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")',
                    [
                        $user['id'], $orderNumber, $fullName, $normalizedMobile, $email !== '' ? $email : null,
                        $address, $city, $notes !== '' ? $notes : null,
                        round($subtotal, 2), round($discountTotal, 2), round($grandTotal, 2), $paymentMethod,
                    ]
                );
                $orderId = (int) dbInsertId();

                foreach ($orderItemRows as $row) {
                    dbExecute(
                        'INSERT INTO order_items (order_id, product_id, product_name, sku, purity, net_weight, quantity, unit_price, total_price)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            $orderId, $row['product_id'], $row['product_name'], $row['sku'], $row['purity'],
                            $row['net_weight'], $row['quantity'], $row['unit_price'], $row['total_price'],
                        ]
                    );
                }

                dbExecute(
                    'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
                     VALUES (?, NULL, "pending", NULL, "Order placed by customer.")',
                    [$orderId]
                );

                return $orderId;
            });

            // Only clear the bag once the order has actually committed.
            $_SESSION['cart'] = [];

            flash('success', 'Your order has been placed successfully.');
            redirect(SITE_URL . '/order-success.php?id=' . $orderId);
        } catch (Throwable $e) {
            error_log('Checkout failed: ' . $e->getMessage());
            $errors[] = ($e instanceof RuntimeException) ? $e->getMessage() : 'Something went wrong while placing your order. Please try again.';
        }
    }

    // Re-fetch the bag for display alongside the validation errors below.
    $cart = getCartDetails();
}

$goldPriceNotice = getSetting(
    'gold_price_notice',
    'Gold prices may change according to the latest market rate. Please confirm the final price with ' . SITE_NAME . ' before order confirmation.'
);

$pageTitle = 'Checkout';
require __DIR__ . '/includes/header.php';
?>
<section class="section account-section">
    <div class="container">
        <div class="account-heading"><h1>Checkout</h1></div>

        <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

        <div class="checkout-layout">
            <div class="admin-panel checkout-form-panel">
                <h3>Delivery Information</h3>
                <form method="post" action="">
                    <?= csrfField() ?>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="full_name">Full Name</label>
                            <input type="text" id="full_name" name="full_name" class="form-control" value="<?= e($fullName) ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="mobile">Mobile Number</label>
                            <input type="text" id="mobile" name="mobile" class="form-control" value="<?= e($mobile) ?>" placeholder="03XXXXXXXXX" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address <span class="text-muted">(optional)</span></label>
                        <input type="email" id="email" name="email" class="form-control" value="<?= e($email) ?>">
                    </div>
                    <div class="form-group">
                        <label for="address">Address</label>
                        <textarea id="address" name="address" class="form-control" rows="3" required><?= e($address) ?></textarea>
                    </div>
                    <div class="form-group">
                        <label for="city">City</label>
                        <input type="text" id="city" name="city" class="form-control" value="<?= e($city) ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="notes">Order Notes <span class="text-muted">(optional)</span></label>
                        <textarea id="notes" name="notes" class="form-control" rows="3"><?= e($notes) ?></textarea>
                    </div>

                    <div class="form-section-title">Payment Method</div>
                    <div class="checkbox-group">
                        <?php foreach ($allowedPaymentMethods as $value => $label): ?>
                            <label class="checkbox-row"><input type="radio" name="payment_method" value="<?= e($value) ?>" <?= $paymentMethod === $value ? 'checked' : '' ?>> <?= e($label) ?></label>
                        <?php endforeach; ?>
                    </div>
                    <p class="form-help">Online payment is not available yet - more payment methods will be added in a future update.</p>

                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:16px;">Place Order</button>
                </form>
            </div>

            <div class="checkout-summary-panel">
                <div class="admin-panel">
                    <h3>Order Summary</h3>
                    <div class="checkout-items">
                        <?php foreach ($cart['items'] as $item): $p = $item['product']; ?>
                            <div class="checkout-item">
                                <div>
                                    <strong><?= e($p['name']) ?></strong>
                                    <p class="text-muted"><?= (int) $item['quantity'] ?> &times; <?= formatPrice($item['unit_price']) ?></p>
                                </div>
                                <div><?= formatPrice($item['line_total']) ?></div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="cart-summary-line"><span>Subtotal</span><span><?= formatPrice($cart['subtotal']) ?></span></div>
                    <div class="cart-summary-line"><span>Discount</span><span>&minus; <?= formatPrice($cart['discount']) ?></span></div>
                    <div class="cart-summary-total"><span>Grand Total</span><strong><?= formatPrice($cart['total']) ?></strong></div>
                    <p class="product-price-disclaimer"><?= e($goldPriceNotice) ?></p>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
