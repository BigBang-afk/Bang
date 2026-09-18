<?php
/**
 * Product deletion strategy (see Phase 3 final report for the full
 * explanation):
 *
 * - If the product has NEVER appeared in any order_items row, it is
 *   safe to remove entirely: we hard-delete it, which cascades to its
 *   product_images rows and any wishlist entries via the existing
 *   ON DELETE CASCADE foreign keys.
 * - If the product HAS order history, we never hard-delete it - doing
 *   so would not corrupt past orders (order_items snapshots product
 *   name/sku/price and its product_id column is ON DELETE SET NULL),
 *   but it would silently sever a real product from its own sales
 *   history for no benefit. Instead we perform a soft delete: the
 *   product is set to status = "inactive" (immediately hidden from the
 *   public shop, per Phase 3's product status rules) while remaining
 *   fully intact and visible to admins for historical/reporting
 *   purposes.
 */
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

// POST only - deletion must never be triggerable via a bare GET link.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(SITE_URL . '/admin/products.php');
}

requireCsrf();

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    flash('error', 'Invalid product ID.');
    redirect(SITE_URL . '/admin/products.php');
}

$product = dbFetchOne('SELECT * FROM products WHERE id = ?', [$id]);
if (!$product) {
    flash('error', 'Product not found.');
    redirect(SITE_URL . '/admin/products.php');
}

$orderCount = (int) dbFetchColumn('SELECT COUNT(*) FROM order_items WHERE product_id = ?', [$id]);

if ($orderCount > 0) {
    dbExecute('UPDATE products SET status = "inactive" WHERE id = ?', [$id]);
    logAdminActivity('deactivate', 'product', $id, "Deactivated product \"{$product['name']}\" (had order history).");
    flash('success', "\"{$product['name']}\" has order history, so it was deactivated (hidden from the shop) instead of permanently deleted, to preserve past order records.");
} else {
    $images = dbFetchAll('SELECT image FROM product_images WHERE product_id = ?', [$id]);
    dbExecute('DELETE FROM products WHERE id = ?', [$id]); // cascades product_images, wishlists
    foreach ($images as $img) {
        deleteUploadedImage($img['image'], PRODUCTS_UPLOAD_PATH);
    }
    logAdminActivity('delete', 'product', $id, "Permanently deleted product \"{$product['name']}\".");
    flash('success', "\"{$product['name']}\" was permanently deleted.");
}

redirect(SITE_URL . '/admin/products.php');
