<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$q = trim($_GET['q'] ?? '');
$products = [];
$customers = [];
$orders = [];

if ($q !== '') {
    $like = '%' . $q . '%';

    $products = dbFetchAll(
        'SELECT id, name, sku, status FROM products WHERE name LIKE ? OR sku LIKE ? ORDER BY created_at DESC LIMIT 10',
        [$like, $like]
    );
    $customers = dbFetchAll(
        'SELECT id, username, mobile, status FROM users WHERE username LIKE ? OR mobile LIKE ? ORDER BY created_at DESC LIMIT 10',
        [$like, $like]
    );
    $orders = dbFetchAll(
        'SELECT id, order_number, customer_name, mobile, total, order_status FROM orders
         WHERE order_number LIKE ? OR customer_name LIKE ? OR mobile LIKE ? ORDER BY created_at DESC LIMIT 10',
        [$like, $like, $like]
    );
}

$hasResults = $products || $customers || $orders;

$pageTitle = 'Search Results';
$browserTitle = 'Search';
$activeNav = '';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel-head">
    <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;"><?= $q !== '' ? 'Results for "' . e($q) . '"' : 'Search' ?></h2>
</div>

<?php if ($q === ''): ?>
    <div class="admin-panel">
        <div class="empty-state"><p>Enter a search term in the header search box above.</p></div>
    </div>
<?php elseif (!$hasResults): ?>
    <div class="admin-panel">
        <div class="empty-state"><p>No products, customers, or orders matched "<?= e($q) ?>".</p></div>
    </div>
<?php else: ?>

    <?php if ($orders): ?>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Orders</h2></div>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Order #</th><th>Customer</th><th>Mobile</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($orders as $o): ?>
                    <tr>
                        <td><?= e($o['order_number']) ?></td>
                        <td><?= e($o['customer_name']) ?></td>
                        <td><?= e($o['mobile']) ?></td>
                        <td><?= formatPrice((float) $o['total']) ?></td>
                        <td><span class="status-pill status-<?= e($o['order_status']) ?>"><?= e(ucfirst($o['order_status'])) ?></span></td>
                        <td><a href="<?= SITE_URL ?>/admin/order-view.php?id=<?= (int) $o['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>

    <?php if ($customers): ?>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Customers</h2></div>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Username</th><th>Mobile</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($customers as $c): ?>
                    <tr>
                        <td><?= e($c['username']) ?></td>
                        <td><?= e($c['mobile']) ?></td>
                        <td><span class="status-pill status-<?= e($c['status']) ?>"><?= e(ucfirst($c['status'])) ?></span></td>
                        <td><a href="<?= SITE_URL ?>/admin/customer-view.php?id=<?= (int) $c['id'] ?>" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>

    <?php if ($products): ?>
    <div class="admin-panel">
        <div class="admin-panel-head"><h2>Products</h2></div>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Name</th><th>SKU</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($products as $p): ?>
                    <tr>
                        <td><?= e($p['name']) ?></td>
                        <td><?= e($p['sku']) ?></td>
                        <td><span class="status-pill status-<?= e($p['status']) ?>"><?= e(ucfirst($p['status'])) ?></span></td>
                        <td><a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline btn-sm">View</a></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>

<?php endif; ?>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
