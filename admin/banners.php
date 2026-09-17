<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Homepage Banners';
$activeNav = 'banners';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M3 19h18"/></svg></div>
        <h2>Homepage Banner Management</h2>
        <p>Managing the hero banner, collection banner, and featured content sections will be available in an upcoming phase.</p>
        <a href="<?= SITE_URL ?>/admin/index.php" class="btn btn-outline btn-sm" style="margin-top:16px;">&larr; Back to Dashboard</a>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
