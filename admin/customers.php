<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_once __DIR__ . '/../includes/pagination.php';
require_admin();

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    require_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    if ($_POST['action'] === 'toggle_status' && $id) {
        $pdo->prepare("UPDATE users SET status = IF(status='active','inactive','active') WHERE id = ?")->execute([$id]);
        flash('success', 'Customer status updated.');
    }
    redirect(BASE_URL . '/admin/customers.php');
}

$viewId = (int) ($_GET['view'] ?? 0);
$viewCustomer = null;
$viewOrders = [];
if ($viewId) {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$viewId]);
    $viewCustomer = $stmt->fetch();
    if ($viewCustomer) {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$viewId]);
        $viewOrders = $stmt->fetchAll();
    }
}

$search = trim($_GET['q'] ?? '');
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;
$where = '';
$params = [];
if ($search !== '') {
    $where = 'WHERE username LIKE ? OR mobile LIKE ? OR email LIKE ?';
    $params = ["%$search%", "%$search%", "%$search%"];
}
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM users $where");
$countStmt->execute($params);
$pagination = paginate((int) $countStmt->fetchColumn(), $perPage, $page);

$stmt = $pdo->prepare(
    "SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
     FROM users u $where ORDER BY u.created_at DESC LIMIT {$pagination['perPage']} OFFSET {$pagination['offset']}"
);
$stmt->execute($params);
$customers = $stmt->fetchAll();

$pageTitle = 'Customers';
$activeAdminNav = 'customers';
require __DIR__ . '/../includes/admin_header.php';
?>

<?php if ($viewCustomer): ?>
<div class="admin-panel">
    <div class="admin-panel-head"><h2>Customer: <?= e($viewCustomer['username']) ?></h2><a href="customers.php" class="btn btn-outline btn-sm">&larr; Back</a></div>
    <div class="form-row">
        <div><strong>Mobile:</strong> <?= e($viewCustomer['mobile']) ?></div>
        <div><strong>Email:</strong> <?= e($viewCustomer['email'] ?? '-') ?></div>
        <div><strong>Registered:</strong> <?= date('d M Y', strtotime($viewCustomer['created_at'])) ?></div>
        <div><strong>Status:</strong> <span class="status-pill status-<?= e($viewCustomer['status']) ?>"><?= e(ucfirst($viewCustomer['status'])) ?></span></div>
    </div>
    <h3 style="margin-top:24px;">Order History</h3>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Order #</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
            <?php if (!$viewOrders): ?><tr><td colspan="4">No orders yet.</td></tr><?php endif; ?>
            <?php foreach ($viewOrders as $o): ?>
                <tr>
                    <td><a href="orders.php?id=<?= (int) $o['id'] ?>"><?= e($o['order_number']) ?></a></td>
                    <td><?= currency((float) $o['total']) ?></td>
                    <td><span class="status-pill status-<?= e($o['status']) ?>"><?= e(ucfirst($o['status'])) ?></span></td>
                    <td><?= date('d M Y', strtotime($o['created_at'])) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>All Customers</h2></div>
    <form method="get" class="filters-bar">
        <input type="text" name="q" placeholder="Search username, mobile, email..." value="<?= e($search) ?>">
        <button type="submit" class="btn btn-outline btn-sm">Search</button>
    </form>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>ID</th><th>Username</th><th>Mobile</th><th>Email</th><th>Registered</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if (!$customers): ?><tr><td colspan="8">No customers found.</td></tr><?php endif; ?>
            <?php foreach ($customers as $c): ?>
                <tr>
                    <td>#<?= (int) $c['id'] ?></td>
                    <td><?= e($c['username']) ?></td>
                    <td><?= e($c['mobile']) ?></td>
                    <td><?= e($c['email'] ?? '-') ?></td>
                    <td><?= date('d M Y', strtotime($c['created_at'])) ?></td>
                    <td><?= (int) $c['order_count'] ?></td>
                    <td>
                        <form method="post" style="display:inline;"><?= csrf_field() ?><input type="hidden" name="action" value="toggle_status"><input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
                        <button class="status-pill status-<?= e($c['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($c['status'])) ?></button></form>
                    </td>
                    <td><a href="customers.php?view=<?= (int) $c['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php render_pagination($pagination, 'customers.php?' . http_build_query(array_filter(['q' => $search]))); ?>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
