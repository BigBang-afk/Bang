<?php
require_once __DIR__ . '/includes/functions.php';

$cart = getCartDetails();

// Never show a checkout form for an empty bag, regardless of login state.
if (!$cart['items']) {
    redirect(SITE_URL . '/cart.php');
}

// Guest checkout is supported (see Part 3 of the spec): a visitor is never
// forced to log in to place an order. Logged-in customers still get their
// saved details pre-filled below; guests simply see blank fields. No
// customer account is ever created as a side effect of a guest order.
$currentUser = getCurrentUser();
$errors = [];

$fullName = $currentUser['full_name'] ?? '';
$mobile = $currentUser['mobile'] ?? '';
$email = $currentUser['email'] ?? '';
$address = '';
$city = '';
$notes = '';
$paymentMethod = 'cash_on_delivery';

$paymentMethods = getPaymentMethodOptions();

// A one-time token, separate from the CSRF token, that guards against a
// double-click on "Place Order" or a browser "resend form data" replay
// creating two orders from a single checkout: it is generated once per
// GET render of this page and consumed (unset) the instant a POST is
// accepted for processing, so a second submission with the same token
// is rejected outright rather than placing a second order.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $_SESSION['checkout_token'] = bin2hex(random_bytes(16));
}
$checkoutToken = $_SESSION['checkout_token'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $submittedToken = $_POST['checkout_token'] ?? '';
    $expectedToken = $_SESSION['checkout_token'] ?? null;

    if ($expectedToken === null || !hash_equals($expectedToken, $submittedToken)) {
        flash('info', 'This checkout may have already been submitted. Please check My Orders, or review your bag and try again.');
        redirect(SITE_URL . '/cart.php');
    }
    unset($_SESSION['checkout_token']); // one-time use, consumed immediately

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

    if (!array_key_exists($paymentMethod, $paymentMethods)) {
        $errors[] = 'Please select a valid payment method.';
    }

    // Re-check the bag right before placing the order - it may have
    // changed (or emptied) since the page was first loaded.
    $cart = getCartDetails();
    if (!$cart['items']) {
        flash('error', 'Your cart is empty.');
        redirect(SITE_URL . '/cart.php');
    }

    if (!$errors) {
        $userId = $currentUser['id'] ?? null;

        try {
            $orderId = dbTransaction(function () use ($userId, $fullName, $normalizedMobile, $email, $address, $city, $notes, $paymentMethod) {
                // Re-read the cart from the session and lock each product
                // row for the duration of this transaction, so a
                // concurrent admin edit (e.g. marking something out of
                // stock) can't race with this checkout.
                $sessionCart = getCart();
                if (!$sessionCart) {
                    throw new RuntimeException('Your cart is empty.');
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
                        throw new RuntimeException('One or more items are no longer available. Please review your cart.');
                    }
                    if ($product['stock_status'] !== 'in_stock') {
                        throw new RuntimeException('One or more items are no longer available. Please review your cart.');
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
                    throw new RuntimeException('Your cart is empty.');
                }

                $orderNumber = generateUniqueOrderNumber();

                dbExecute(
                    'INSERT INTO orders (user_id, order_number, customer_name, mobile, email, address, city, notes,
                        subtotal, discount, total, payment_method, order_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")',
                    [
                        $userId, $orderNumber, $fullName, $normalizedMobile, $email !== '' ? $email : null,
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

            if (!$userId) {
                rememberGuestOrder($orderId);
            }

            flash('success', 'Your order has been placed successfully.');
            redirect(SITE_URL . '/order-success.php?id=' . $orderId);
        } catch (Throwable $e) {
            error_log('Checkout failed: ' . $e->getMessage());
            $errors[] = ($e instanceof RuntimeException) ? $e->getMessage() : 'Something went wrong while placing your order. Please try again.';
        }
    }

    // A fresh token is needed to redisplay the form after a validation
    // failure, since the one that was submitted has already been consumed.
    $_SESSION['checkout_token'] = bin2hex(random_bytes(16));
    $checkoutToken = $_SESSION['checkout_token'];

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

        <?php if (!$currentUser): ?>
            <div class="alert alert-info">
                Checking out as a guest. Already have an account? <a href="<?= SITE_URL ?>/login.php" style="text-decoration:underline;">Login</a> for faster checkout and to track your orders.
            </div>
        <?php endif; ?>

        <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

        <div class="checkout-layout">
            <div class="admin-panel checkout-form-panel">
                <h3>Delivery Information</h3>
                <form method="post" action="">
                    <?= csrfField() ?>
                    <input type="hidden" name="checkout_token" value="<?= e($checkoutToken) ?>">
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
                        <?php foreach ($paymentMethods as $value => $label): ?>
                            <label class="checkbox-row"><input type="radio" name="payment_method" value="<?= e($value) ?>" <?= $paymentMethod === $value ? 'checked' : '' ?>> <?= e($label) ?></label>
                        <?php endforeach; ?>
                    </div>
                    <p class="form-help">Online payment is not available yet. Select the option that best describes how you'll settle this order - our team will confirm details with you directly.</p>

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
                    <div class="cart-summary-total"><span>Total</span><strong><?= formatPrice($cart['total']) ?></strong></div>
                    <p class="product-price-disclaimer"><?= e($goldPriceNotice) ?></p>
                </div>
            </div>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
