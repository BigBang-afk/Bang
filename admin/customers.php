<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Customers';
$activeNav = 'customers';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></div>
        <h2>Customer Management</h2>
        <p>A searchable, paginated customer list with activate/deactivate controls will be available in an upcoming phase. In the meantime, you can view any individual customer's profile and order history from the dashboard's "Recent Customers" panel.</p>
        <a href="<?= SITE_URL ?>/admin/index.php" class="btn btn-outline btn-sm" style="margin-top:16px;">&larr; Back to Dashboard</a>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
