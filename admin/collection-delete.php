<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

// POST only - a collection must never be deletable via a bare GET link
// (which browsers/crawlers/prefetchers can trigger unintentionally).
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(SITE_URL . '/admin/collections.php');
}

requireCsrf();

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid collection ID.');
    redirect(SITE_URL . '/admin/collections.php');
}

$collection = dbFetchOne('SELECT * FROM collections WHERE id = ?', [$id]);
if (!$collection) {
    flash('error', 'Collection not found.');
    redirect(SITE_URL . '/admin/collections.php');
}

// Safe deletion: never delete a collection while products still reference
// it, for the same reason as categories (see admin/categories.php).
$productCount = (int) dbFetchColumn('SELECT COUNT(*) FROM products WHERE collection_id = ?', [$id]);
if ($productCount > 0) {
    flash('error', "Cannot delete \"{$collection['name']}\" - $productCount product(s) are assigned to it. Reassign or remove those products first.");
    redirect(SITE_URL . '/admin/collections.php');
}

dbExecute('DELETE FROM collections WHERE id = ?', [$id]);
deleteUploadedImage($collection['image'], COLLECTIONS_UPLOAD_PATH);

flash('success', "Collection \"{$collection['name']}\" deleted.");
redirect(SITE_URL . '/admin/collections.php');
