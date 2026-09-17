<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Gold Rates';
$activeNav = 'gold-rates';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M9 15V9l3 2 3-2v6"/></svg></div>
        <h2>Gold Rate Management</h2>
        <p>A form to update today's 24K/22K/21K/18K gold rates (with full history) will be available in an upcoming phase. The dashboard's gold rate widget already reads live from the <code>gold_rates</code> table.</p>
        <a href="<?= SITE_URL ?>/admin/index.php" class="btn btn-outline btn-sm" style="margin-top:16px;">&larr; Back to Dashboard</a>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
