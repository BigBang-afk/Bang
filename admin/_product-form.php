<?php
/**
 * Shared product form, included by admin/product-add.php and
 * admin/product-edit.php. Not a page on its own - always require
 * functions.php + requireAdmin() before including it (also enforced
 * here again as a defense-in-depth safety net, same pattern as
 * includes/admin-header.php).
 *
 * Expects: $data (current field values), $errors, $categories,
 * $collections, $goldRates (from getCurrentGoldRates()).
 * Edit mode additionally expects: $isEdit = true, $productId, $images.
 */
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$isEdit = $isEdit ?? false;
$stockStatusLabels = ['in_stock' => 'In Stock', 'out_of_stock' => 'Out of Stock', 'made_to_order' => 'Coming Soon'];

// Rates keyed by purity for the live JS calculator (see assets/js/admin.js).
$ratesForJs = [];
foreach ($goldRates as $karat => $row) {
    $ratesForJs[$karat] = (float) $row['rate'];
}
?>
<script nonce="<?= e(CSP_NONCE) ?>">window.ZJ_GOLD_RATES = <?= json_encode($ratesForJs) ?>;</script>

<div class="admin-panel-head">
    <h2><?= $isEdit ? 'Edit Product' : 'Add Product' ?></h2>
    <a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline btn-sm">&larr; Back to Products</a>
</div>

<?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

<div class="admin-grid-2" style="align-items:start;">
    <div class="admin-panel">
        <form method="post" enctype="multipart/form-data" id="product-form">
            <?= csrfField() ?>

            <div class="form-section-title">Product Information</div>
            <div class="form-row">
                <div class="form-group">
                    <label for="name">Product Name</label>
                    <input type="text" id="name" name="name" class="form-control" value="<?= e($data['name']) ?>" required>
                </div>
                <div class="form-group">
                    <label for="sku">SKU</label>
                    <input type="text" id="sku" name="sku" class="form-control" value="<?= e($data['sku']) ?>" placeholder="Leave empty to auto-generate">
                    <p class="form-help">Must be unique. Example format: ZJ-RIN-00001.</p>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="category_id">Category</label>
                    <select id="category_id" name="category_id" class="form-control">
                        <option value="">Uncategorized</option>
                        <?php foreach ($categories as $c): ?>
                            <option value="<?= (int) $c['id'] ?>" <?= (string) $data['category_id'] === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="collection_id">Collection</label>
                    <select id="collection_id" name="collection_id" class="form-control">
                        <option value="">None</option>
                        <?php foreach ($collections as $c): ?>
                            <option value="<?= (int) $c['id'] ?>" <?= (string) $data['collection_id'] === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="short_description">Short Description</label>
                <input type="text" id="short_description" name="short_description" class="form-control" maxlength="255" value="<?= e($data['short_description']) ?>" placeholder="Shown on product cards, e.g. &quot;Timeless polished gold pendant.&quot;">
            </div>
            <div class="form-group">
                <label for="description">Full Description</label>
                <textarea id="description" name="description" class="form-control" rows="5"><?= e($data['description']) ?></textarea>
            </div>

            <div class="form-section-title">Gold Information</div>
            <div class="form-row-3">
                <div class="form-group">
                    <label for="purity">Purity</label>
                    <select id="purity" name="purity" class="form-control">
                        <?php foreach (['24K', '22K', '21K', '18K'] as $k): ?>
                            <option value="<?= $k ?>" <?= $data['purity'] === $k ? 'selected' : '' ?>><?= $k ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="gross_weight">Gross Weight (g)</label>
                    <input type="number" id="gross_weight" name="gross_weight" class="form-control" step="0.001" min="0" value="<?= e((string) $data['gross_weight']) ?>">
                </div>
                <div class="form-group">
                    <label for="net_weight">Net Gold Weight (g)</label>
                    <input type="number" id="net_weight" name="net_weight" class="form-control" step="0.001" min="0" value="<?= e((string) $data['net_weight']) ?>" required>
                    <p class="form-help">Cannot exceed gross weight.</p>
                </div>
            </div>

            <div class="form-section-title">Pricing</div>
            <div class="gold-rate-banner">
                <?php foreach ($goldRates as $karat => $row): ?>
                    <span><strong><?= e($karat) ?>:</strong> <?= formatPrice((float) $row['rate']) ?>/g</span>
                <?php endforeach; ?>
                <?php if (!$goldRates): ?><span>No gold rates recorded yet - set them in Admin &gt; Gold Rates.</span><?php endif; ?>
            </div>

            <div class="checkbox-group">
                <label class="checkbox-row"><input type="radio" name="pricing_type" value="auto" <?= $data['pricing_type'] === 'auto' ? 'checked' : '' ?>> <strong>Automatic</strong> &mdash; Net Weight &times; current Gold Rate + Charges &minus; Discount</label>
                <label class="checkbox-row"><input type="radio" name="pricing_type" value="manual" <?= $data['pricing_type'] === 'manual' ? 'checked' : '' ?>> <strong>Manual</strong> &mdash; admin enters the final price directly</label>
            </div>
            <p class="form-help" style="margin:-10px 0 16px;">When the daily gold rate changes later, Automatic products re-price instantly everywhere they're shown; Manual products always keep the price entered here, even after a rate change.</p>

            <div class="form-row-3">
                <div class="form-group">
                    <label for="gold_rate">Current Gold Rate (Rs./g)</label>
                    <input type="number" id="gold_rate" name="gold_rate" class="form-control" step="0.01" min="0" value="<?= e((string) $data['gold_rate']) ?>" readonly>
                    <p class="form-help">Read-only snapshot: <span id="current-gold-rate-display">-</span></p>
                </div>
                <div class="form-group">
                    <label for="making_charges">Making Charges</label>
                    <input type="number" id="making_charges" name="making_charges" class="form-control" step="0.01" min="0" value="<?= e((string) $data['making_charges']) ?>">
                </div>
                <div class="form-group">
                    <label for="stone_charges">Stone Charges</label>
                    <input type="number" id="stone_charges" name="stone_charges" class="form-control" step="0.01" min="0" value="<?= e((string) $data['stone_charges']) ?>">
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label for="other_charges">Other Charges</label>
                    <input type="number" id="other_charges" name="other_charges" class="form-control" step="0.01" min="0" value="<?= e((string) $data['other_charges']) ?>">
                </div>
                <div class="form-group">
                    <label for="discount">Discount</label>
                    <input type="number" id="discount" name="discount" class="form-control" step="0.01" min="0" value="<?= e((string) $data['discount']) ?>">
                </div>
                <div class="form-group">
                    <label for="price">Final Price (Rs.)</label>
                    <input type="number" id="price" name="price" class="form-control" step="0.01" min="0" value="<?= e((string) $data['price']) ?>" <?= $data['pricing_type'] === 'auto' ? 'readonly' : '' ?>>
                </div>
            </div>

            <div class="price-preview-box">
                <div class="price-line"><span>Gold Value (Net Weight &times; Rate)</span><span id="preview-gold-value">Rs. 0</span></div>
                <div class="price-line total"><span>Final Price</span><span id="preview-final-price">Rs. 0</span></div>
            </div>

            <div class="form-section-title">Inventory</div>
            <div class="form-group">
                <label for="stock_status">Stock Status</label>
                <select id="stock_status" name="stock_status" class="form-control">
                    <?php foreach ($stockStatusLabels as $val => $label): ?>
                        <option value="<?= e($val) ?>" <?= $data['stock_status'] === $val ? 'selected' : '' ?>><?= e($label) ?></option>
                    <?php endforeach; ?>
                </select>
                <p class="form-help">Out-of-stock and coming-soon products stay visible with a "Enquire on WhatsApp" option, but cannot be purchased directly.</p>
            </div>

            <div class="form-section-title">Marketing</div>
            <div class="checkbox-group">
                <label class="checkbox-row"><input type="checkbox" name="featured" value="1" <?= $data['featured'] ? 'checked' : '' ?>> Featured Product</label>
                <label class="checkbox-row"><input type="checkbox" name="best_seller" value="1" <?= $data['best_seller'] ? 'checked' : '' ?>> Best Seller</label>
                <label class="checkbox-row"><input type="checkbox" name="new_arrival" value="1" <?= $data['new_arrival'] ? 'checked' : '' ?>> New Arrival</label>
            </div>

            <div class="form-section-title">Status</div>
            <div class="form-group">
                <select name="status" class="form-control" style="max-width:240px;">
                    <option value="active" <?= $data['status'] === 'active' ? 'selected' : '' ?>>Active (visible on storefront)</option>
                    <option value="inactive" <?= $data['status'] === 'inactive' ? 'selected' : '' ?>>Inactive (hidden)</option>
                </select>
            </div>

            <?php if (!$isEdit): ?>
            <div class="form-section-title">Images</div>
            <div class="form-group">
                <label for="images">Upload Images (first image becomes the main/primary image)</label>
                <input type="file" id="images" name="images[]" class="form-control" accept=".jpg,.jpeg,.png,.webp" multiple data-preview-multi="#new-images-preview">
                <p class="form-help">JPG, PNG, or WEBP. Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB each. You can add more after saving.</p>
                <div id="new-images-preview" class="image-grid"></div>
            </div>
            <?php endif; ?>

            <button type="submit" class="btn btn-gold" style="margin-top:10px;"><?= $isEdit ? 'Update Product' : 'Save Product' ?></button>
            <a href="<?= SITE_URL ?>/admin/products.php" class="btn btn-outline">Cancel</a>
        </form>
    </div>

    <?php if ($isEdit): ?>
    <div class="admin-panel">
        <h3>Product Images</h3>
        <form method="post" enctype="multipart/form-data" style="margin-bottom:18px;">
            <?= csrfField() ?>
            <input type="hidden" name="action" value="add_images">
            <div class="form-group">
                <label for="add_images">Upload Images</label>
                <input type="file" id="add_images" name="images[]" class="form-control" accept=".jpg,.jpeg,.png,.webp" multiple data-preview-multi="#add-images-preview">
                <div id="add-images-preview" class="image-grid"></div>
            </div>
            <button type="submit" class="btn btn-outline btn-sm">Upload Images</button>
        </form>

        <div class="image-grid">
            <?php foreach ($images as $img): ?>
                <div class="img-item <?= $img['is_primary'] ? 'is-primary' : '' ?>">
                    <?php if ($img['is_primary']): ?><span class="tag">Primary</span><?php endif; ?>
                    <img src="<?= e(PRODUCTS_UPLOAD_URL . $img['image']) ?>" alt="">
                    <div class="img-actions">
                        <?php if (!$img['is_primary']): ?>
                        <form method="post"><?= csrfField() ?><input type="hidden" name="action" value="set_primary"><input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>"><button type="submit" class="btn btn-outline btn-sm">Set Primary</button></form>
                        <?php endif; ?>
                        <form method="post"><?= csrfField() ?><input type="hidden" name="action" value="move_image"><input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>"><input type="hidden" name="direction" value="up"><button type="submit" class="btn btn-outline btn-sm" title="Move earlier">&uarr;</button></form>
                        <form method="post"><?= csrfField() ?><input type="hidden" name="action" value="move_image"><input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>"><input type="hidden" name="direction" value="down"><button type="submit" class="btn btn-outline btn-sm" title="Move later">&darr;</button></form>
                        <form method="post" data-confirm="Remove this image?"><?= csrfField() ?><input type="hidden" name="action" value="delete_image"><input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>"><button type="submit" class="btn btn-danger btn-sm" data-confirm="Remove this image?">Remove</button></form>
                    </div>
                </div>
            <?php endforeach; ?>
            <?php if (!$images): ?><p class="form-help">No images uploaded yet.</p><?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
</div>
