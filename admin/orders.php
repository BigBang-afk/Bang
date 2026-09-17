<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Orders';
$activeNav = 'orders';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h9l3 3v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></div>
        <h2>Order Management</h2>
        <p>A searchable, filterable, paginated order list with status updates will be available in an upcoming phase. In the meantime, you can view any individual order from the dashboard's "Recent Orders" panel.</p>
        <a href="<?= SITE_URL ?>/admin/index.php" class="btn btn-outline btn-sm" style="margin-top:16px;">&larr; Back to Dashboard</a>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
