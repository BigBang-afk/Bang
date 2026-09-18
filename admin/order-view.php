<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid order ID.');
    redirect(SITE_URL . '/admin/orders.php');
}

$order = dbFetchOne('SELECT * FROM orders WHERE id = ?', [$id]);
if (!$order) {
    flash('error', 'Order not found.');
    redirect(SITE_URL . '/admin/orders.php');
}

$statusOptions = getOrderStatusOptions();
$paymentLabels = getPaymentMethodOptions();
$admin = getCurrentAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'update_status') {
        $newStatus = $_POST['order_status'] ?? '';
        $note = trim($_POST['status_note'] ?? '');

        if (!array_key_exists($newStatus, $statusOptions)) {
            flash('error', 'Invalid order status.');
        } elseif ($newStatus === $order['order_status']) {
            flash('info', 'Order status is already "' . $statusOptions[$newStatus] . '".');
        } else {
            dbTransaction(function () use ($order, $newStatus, $note, $admin) {
                dbExecute('UPDATE orders SET order_status = ? WHERE id = ?', [$newStatus, $order['id']]);
                dbExecute(
                    'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
                    [$order['id'], $order['order_status'], $newStatus, $admin['id'], $note !== '' ? $note : null]
                );
            });
            flash('success', 'Order status updated to "' . $statusOptions[$newStatus] . '".');
        }
    } elseif ($action === 'add_note') {
        $note = trim($_POST['note'] ?? '');
        if ($note === '') {
            flash('error', 'Note cannot be empty.');
        } elseif (mb_strlen($note) > 2000) {
            flash('error', 'Note must be 2000 characters or fewer.');
        } else {
            dbExecute('INSERT INTO order_admin_notes (order_id, admin_id, note) VALUES (?, ?, ?)', [$order['id'], $admin['id'], $note]);
            flash('success', 'Internal note added.');
        }
    }

    redirect(SITE_URL . '/admin/order-view.php?id=' . $id);
}

$items = dbFetchAll('SELECT * FROM order_items WHERE order_id = ?', [$id]);
$statusHistory = dbFetchAll(
    'SELECT h.*, a.full_name AS admin_name
     FROM order_status_history h
     LEFT JOIN admins a ON a.id = h.changed_by
     WHERE h.order_id = ? ORDER BY h.created_at ASC',
    [$id]
);
$adminNotes = dbFetchAll(
    'SELECT n.*, a.full_name AS admin_name
     FROM order_admin_notes n
     LEFT JOIN admins a ON a.id = n.admin_id
     WHERE n.order_id = ? ORDER BY n.created_at DESC',
    [$id]
);

$whatsappNumber = getSetting('whatsapp_number', '');
$whatsappConfigured = $whatsappNumber !== '' && $whatsappNumber !== 'CHANGE_ME';
$whatsappLink = $whatsappConfigured ? buildOrderWhatsAppLink($order) : null;

$pageTitle = 'Order ' . $order['order_number'];
$browserTitle = 'Order ' . $order['order_number'];
$activeNav = 'orders';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel-head">
    <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;">Order <?= e($order['order_number']) ?></h2>
    <div style="display:flex;gap:8px;">
        <a href="<?= SITE_URL ?>/admin/order-print.php?id=<?= (int) $order['id'] ?>" target="_blank" class="btn btn-outline btn-sm">Print Invoice</a>
        <?php if ($whatsappConfigured): ?>
            <a href="<?= e($whatsappLink) ?>" target="_blank" rel="noopener" class="btn btn-gold btn-sm">Confirm via WhatsApp</a>
        <?php endif; ?>
        <a href="<?= SITE_URL ?>/admin/orders.php" class="btn btn-outline btn-sm">&larr; Back to Orders</a>
    </div>
</div>

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Customer</h2></div>
        <p><strong>Name:</strong> <?= e($order['customer_name']) ?></p>
        <p><strong>Account Type:</strong> <?= $order['user_id'] ? 'Registered Customer' : 'Guest Order' ?></p>
        <p><strong>Mobile:</strong> <?= e($order['mobile']) ?></p>
        <p><strong>Email:</strong> <?= e($order['email'] ?: '-') ?></p>
        <p><strong>Address:</strong> <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
        <?php if ($order['notes']): ?><p><strong>Customer Notes:</strong> <?= e($order['notes']) ?></p><?php endif; ?>
    </div>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Order Summary</h2></div>
        <p><strong>Status:</strong> <span class="status-pill status-<?= e($order['order_status']) ?>"><?= e($statusOptions[$order['order_status']] ?? $order['order_status']) ?></span></p>
        <p><strong>Payment Method:</strong> <?= e($paymentLabels[$order['payment_method']] ?? ucwords(str_replace('_', ' ', $order['payment_method']))) ?></p>
        <p><strong>Placed:</strong> <?= date('d M Y, H:i', strtotime($order['created_at'])) ?></p>
        <p><strong>Subtotal:</strong> <?= formatPrice((float) $order['subtotal']) ?></p>
        <p><strong>Discount:</strong> <?= formatPrice((float) $order['discount']) ?></p>
        <p><strong>Total:</strong> <?= formatPrice((float) $order['total']) ?></p>
    </div>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Items</h2></div>
    <?php if (!$items): ?>
        <div class="empty-state"><p>No line items recorded for this order.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                <?php foreach ($items as $it): ?>
                    <tr>
                        <td><?= e($it['product_name']) ?></td>
                        <td><?= e($it['sku']) ?></td>
                        <td><?= e($it['purity']) ?></td>
                        <td><?= rtrim(rtrim(number_format((float) $it['net_weight'], 3), '0'), '.') ?>g</td>
                        <td><?= formatPrice((float) $it['unit_price']) ?></td>
                        <td><?= (int) $it['quantity'] ?></td>
                        <td><?= formatPrice((float) $it['total_price']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<div class="admin-grid-2">
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Update Status</h2></div>
        <form method="post">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="update_status">
            <div class="form-group">
                <label for="order_status">Order Status</label>
                <select id="order_status" name="order_status" class="form-control">
                    <?php foreach ($statusOptions as $val => $label): ?>
                        <option value="<?= $val ?>" <?= $order['order_status'] === $val ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label for="status_note">Note <span class="text-muted">(optional, recorded in the status history below)</span></label>
                <textarea id="status_note" name="status_note" class="form-control" rows="2"></textarea>
            </div>
            <button type="submit" class="btn btn-gold">Update Status</button>
        </form>

        <?php if ($statusHistory): ?>
        <div class="form-section-title">Status History</div>
        <ul class="admin-alert-list">
            <?php foreach (array_reverse($statusHistory) as $h): ?>
                <li>
                    <span class="dot"></span>
                    <div>
                        <strong><?= $h['old_status'] ? e($statusOptions[$h['old_status']] ?? $h['old_status']) . ' &rarr; ' : '' ?><?= e($statusOptions[$h['new_status']] ?? $h['new_status']) ?></strong>
                        <div class="text-muted" style="font-size:.8rem;">
                            <?= date('d M Y, H:i', strtotime($h['created_at'])) ?><?= $h['admin_name'] ? ' &bull; ' . e($h['admin_name']) : '' ?>
                            <?= $h['note'] ? ' &mdash; ' . e($h['note']) : '' ?>
                        </div>
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
        <?php endif; ?>
    </div>

    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Internal Notes</h2></div>
        <p class="form-help" style="margin-top:0;">Visible to admins only - customers never see these notes.</p>
        <form method="post" style="margin-bottom:16px;">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="add_note">
            <div class="form-group">
                <textarea name="note" class="form-control" rows="2" placeholder="Add an internal note..." required></textarea>
            </div>
            <button type="submit" class="btn btn-outline btn-sm">Add Note</button>
        </form>

        <?php if (!$adminNotes): ?>
            <p class="text-muted">No internal notes yet.</p>
        <?php else: ?>
            <ul class="admin-alert-list">
                <?php foreach ($adminNotes as $n): ?>
                    <li>
                        <span class="dot"></span>
                        <div>
                            <div><?= nl2br(e($n['note'])) ?></div>
                            <div class="text-muted" style="font-size:.8rem;"><?= date('d M Y, H:i', strtotime($n['created_at'])) ?><?= $n['admin_name'] ? ' &bull; ' . e($n['admin_name']) : '' ?></div>
                        </div>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
