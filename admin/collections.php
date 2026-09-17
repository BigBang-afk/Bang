<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$pageTitle = 'Collections';
$activeNav = 'collections';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="coming-soon">
        <div class="icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v4H4zM6 8v12h12V8"/></svg></div>
        <h2>Collection Management</h2>
        <p>Adding and managing curated collections will be available in an upcoming phase.</p>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
