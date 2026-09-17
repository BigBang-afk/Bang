<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Products';
$activeNav = 'products';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg></div>
        <h2>Product Management</h2>
        <p>Adding, editing, and managing products (including image uploads and gold-rate-based pricing) will be available in an upcoming phase.</p>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
