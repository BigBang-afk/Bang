<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Messages';
$activeNav = 'messages';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <h2>Customer Messages &amp; Enquiries</h2>
        <p>Viewing and responding to contact form submissions (backed by the existing <code>messages</code> table) will be available in an upcoming phase.</p>
        <a href="<?= SITE_URL ?>/admin/index.php" class="btn btn-outline btn-sm" style="margin-top:16px;">&larr; Back to Dashboard</a>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
