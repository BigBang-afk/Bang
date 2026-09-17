<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Categories';
$activeNav = 'categories';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></div>
        <h2>Category Management</h2>
        <p>Adding, editing, reordering, and managing categories (including images) will be available in an upcoming phase.</p>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
