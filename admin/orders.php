<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_once __DIR__ . '/../includes/pagination.php';
require_admin();

$pdo = db();
$orderStatuses = ['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled'];

$orderId = (int) ($_GET['id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    if (isset($_POST['update_status']) && $orderId) {
        $newStatus = $_POST['status'] ?? '';
        if (in_array($newStatus, $orderStatuses, true)) {
            $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$newStatus, $orderId]);
            log_activity('Order #' . $orderId . ' status changed to ' . $newStatus . '.');
            flash('success', 'Order status updated.');
        }
        redirect(BASE_URL . '/admin/orders.php?id=' . $orderId);
    }
}

if ($orderId) {
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) {
        flash('error', 'Order not found.');
        redirect(BASE_URL . '/admin/orders.php');
    }
    $stmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll();

    $pageTitle = 'Order ' . $order['order_number'];
    $activeAdminNav = 'orders';
    require __DIR__ . '/../includes/admin_header.php';
    ?>
    <div class="admin-panel">
        <div class="admin-panel-head">
            <h2>Order <?= e($order['order_number']) ?></h2>
            <div>
                <a href="order-print.php?id=<?= (int) $order['id'] ?>" target="_blank" class="btn btn-outline btn-sm">Print Invoice</a>
                <a href="orders.php" class="btn btn-outline btn-sm">&larr; Back</a>
            </div>
        </div>
        <div class="form-row">
            <div>
                <p><strong>Customer:</strong> <?= e($order['name']) ?></p>
                <p><strong>Mobile:</strong> <?= e($order['mobile']) ?></p>
                <p><strong>Email:</strong> <?= e($order['email'] ?? '-') ?></p>
            </div>
            <div>
                <p><strong>Address:</strong> <?= e($order['address']) ?>, <?= e($order['city']) ?></p>
                <p><strong>Placed:</strong> <?= date('d M Y, H:i', strtotime($order['created_at'])) ?></p>
                <p><strong>Notes:</strong> <?= e($order['notes'] ?: '-') ?></p>
            </div>
        </div>

        <form method="post" style="display:flex;gap:12px;align-items:center;margin:20px 0;">
            <?= csrf_field() ?>
            <input type="hidden" name="update_status" value="1">
            <label style="margin:0;">Order Status:</label>
            <select name="status" class="form-control" style="width:auto;">
                <?php foreach ($orderStatuses as $s): ?>
                    <option value="<?= $s ?>" <?= $order['status'] === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="btn btn-gold btn-sm">Update Status</button>
        </form>

        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Purity</th><th>Net Wt.</th><th>Rate</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                <?php foreach ($items as $it): ?>
                    <tr>
                        <td><?= e($it['product_name']) ?></td>
                        <td><?= e($it['sku']) ?></td>
                        <td><?= e($it['purity']) ?></td>
                        <td><?= format_weight((float) $it['net_weight']) ?></td>
                        <td><?= currency((float) $it['gold_rate']) ?></td>
                        <td><?= currency((float) $it['unit_price']) ?></td>
                        <td><?= (int) $it['quantity'] ?></td>
                        <td><?= currency((float) $it['line_total']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
                <tfoot>
                    <tr><td colspan="7" style="text-align:right;"><strong>Subtotal</strong></td><td><?= currency((float) $order['subtotal']) ?></td></tr>
                    <tr><td colspan="7" style="text-align:right;"><strong>Total</strong></td><td><strong><?= currency((float) $order['total']) ?></strong></td></tr>
                </tfoot>
            </table>
        </div>
    </div>
    <?php
    require __DIR__ . '/../includes/admin_footer.php';
    exit;
}

// ---- Orders list ----
$search = trim($_GET['q'] ?? '');
$statusFilter = $_GET['status'] ?? '';
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;

$where = [];
$params = [];
if ($search !== '') {
    $where[] = '(order_number LIKE ? OR name LIKE ? OR mobile LIKE ?)';
    $params[] = "%$search%"; $params[] = "%$search%"; $params[] = "%$search%";
}
if ($statusFilter !== '' && in_array($statusFilter, $orderStatuses, true)) {
    $where[] = 'status = ?';
    $params[] = $statusFilter;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders $whereSql");
$countStmt->execute($params);
$pagination = paginate((int) $countStmt->fetchColumn(), $perPage, $page);

$stmt = $pdo->prepare("SELECT * FROM orders $whereSql ORDER BY created_at DESC LIMIT {$pagination['perPage']} OFFSET {$pagination['offset']}");
$stmt->execute($params);
$orders = $stmt->fetchAll();

$pageTitle = 'Orders';
$activeAdminNav = 'orders';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>All Orders</h2></div>
    <form method="get" class="filters-bar">
        <input type="text" name="q" placeholder="Search order #, name, mobile..." value="<?= e($search) ?>">
        <select name="status">
            <option value="">All Statuses</option>
            <?php foreach ($orderStatuses as $s): ?>
                <option value="<?= $s ?>" <?= $statusFilter === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option>
            <?php endforeach; ?>
        </select>
        <button type="submit" class="btn btn-outline btn-sm">Filter</button>
        <a href="orders.php" class="btn btn-outline btn-sm">Reset</a>
    </form>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Mobile</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if (!$orders): ?><tr><td colspan="7">No orders found.</td></tr><?php endif; ?>
            <?php foreach ($orders as $o): ?>
                <tr>
                    <td><?= e($o['order_number']) ?></td>
                    <td><?= e($o['name']) ?></td>
                    <td><?= e($o['mobile']) ?></td>
                    <td><?= currency((float) $o['total']) ?></td>
                    <td><span class="status-pill status-<?= e($o['status']) ?>"><?= e(ucfirst($o['status'])) ?></span></td>
                    <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                    <td><a href="orders.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php render_pagination($pagination, 'orders.php?' . http_build_query(array_filter(['q' => $search, 'status' => $statusFilter]))); ?>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
