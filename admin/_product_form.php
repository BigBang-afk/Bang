<?php
/**
 * Shared product form partial, included by product-add.php and product-edit.php.
 * Expects: $data, $errors, $categories, $collections, $goldRates, and optionally
 * $productId + $images (edit mode only, enables the image management panel).
 */
$isEdit = isset($productId);
?>
<div class="admin-panel-head">
    <h2><?= $isEdit ? 'Edit Product' : 'Add Product' ?></h2>
    <a href="products.php" class="btn btn-outline btn-sm">&larr; Back to Products</a>
</div>

<?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

<div class="form-row" style="align-items:start;">
    <div class="admin-panel">
        <form method="post" enctype="multipart/form-data" id="product-form">
            <?= csrf_field() ?>
            <div class="form-row">
                <div class="form-group">
                    <label>Product Name</label>
                    <input type="text" name="name" class="form-control" value="<?= e($data['name']) ?>" required>
                </div>
                <div class="form-group">
                    <label>SKU</label>
                    <input type="text" name="sku" class="form-control" value="<?= e($data['sku']) ?>" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Category</label>
                    <select name="category_id" class="form-control">
                        <option value="">Uncategorized</option>
                        <?php foreach ($categories as $c): ?>
                            <option value="<?= (int) $c['id'] ?>" <?= (string) $data['category_id'] === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label>Collection</label>
                    <select name="collection_id" class="form-control">
                        <option value="">None</option>
                        <?php foreach ($collections as $c): ?>
                            <option value="<?= (int) $c['id'] ?>" <?= (string) $data['collection_id'] === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Short Description</label>
                <input type="text" name="short_description" class="form-control" maxlength="255" value="<?= e($data['short_description']) ?>" placeholder="Shown on product cards, e.g. 'Timeless polished gold pendant.'">
            </div>
            <div class="form-group">
                <label>Full Description</label>
                <textarea name="description" class="form-control" rows="5"><?= e($data['description']) ?></textarea>
            </div>

            <h3 style="margin-top:28px;">Weight, Purity &amp; Pricing</h3>
            <p class="form-help" style="margin-bottom:16px;">
                Current rates &mdash;
                <?php foreach ($goldRates as $k => $r): ?>
                    <strong><?= e($k) ?>:</strong> <?= currency((float) $r['rate_per_gram']) ?>/g&nbsp;&nbsp;
                <?php endforeach; ?>
                <a href="gold-rates.php" target="_blank">Manage rates &rarr;</a>
            </p>

            <div class="form-row-3">
                <div class="form-group">
                    <label>Purity</label>
                    <select name="purity" class="form-control">
                        <?php foreach (['24K','22K','21K','18K'] as $k): ?>
                            <option value="<?= $k ?>" <?= $data['purity'] === $k ? 'selected' : '' ?>><?= $k ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label>Gross Weight (g)</label>
                    <input type="number" step="0.001" min="0" name="gross_weight" class="form-control" value="<?= e((string) $data['gross_weight']) ?>">
                </div>
                <div class="form-group">
                    <label>Net Weight (g)</label>
                    <input type="number" step="0.001" min="0" name="net_weight" class="form-control" value="<?= e((string) $data['net_weight']) ?>" required>
                </div>
            </div>

            <div class="form-row-3">
                <div class="form-group">
                    <label>Gold Rate (per gram, used for calculation)</label>
                    <input type="number" step="0.01" min="0" name="gold_rate" class="form-control" value="<?= e((string) $data['gold_rate']) ?>">
                </div>
                <div class="form-group">
                    <label>Making Charges</label>
                    <input type="number" step="0.01" min="0" name="making_charges" class="form-control" value="<?= e((string) $data['making_charges']) ?>">
                </div>
                <div class="form-group">
                    <label>Stone Charges</label>
                    <input type="number" step="0.01" min="0" name="stone_charges" class="form-control" value="<?= e((string) $data['stone_charges']) ?>">
                </div>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label>Other Charges</label>
                    <input type="number" step="0.01" min="0" name="other_charges" class="form-control" value="<?= e((string) $data['other_charges']) ?>">
                </div>
                <div class="form-group">
                    <label>Discount</label>
                    <input type="number" step="0.01" min="0" name="discount" class="form-control" value="<?= e((string) $data['discount']) ?>">
                </div>
                <div class="form-group">
                    <label>Stock Status</label>
                    <select name="stock_status" class="form-control">
                        <option value="in_stock" <?= $data['stock_status'] === 'in_stock' ? 'selected' : '' ?>>In Stock</option>
                        <option value="out_of_stock" <?= $data['stock_status'] === 'out_of_stock' ? 'selected' : '' ?>>Out of Stock</option>
                        <option value="made_to_order" <?= $data['stock_status'] === 'made_to_order' ? 'selected' : '' ?>>Made to Order</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Pricing Mode</label>
                <div class="checkbox-group">
                    <label class="checkbox-row"><input type="radio" name="price_mode" value="auto" <?= $data['price_mode'] === 'auto' ? 'checked' : '' ?>> Automatic (Net Weight &times; Gold Rate + Charges - Discount)</label>
                    <label class="checkbox-row"><input type="radio" name="price_mode" value="manual" <?= $data['price_mode'] === 'manual' ? 'checked' : '' ?>> Manual Override</label>
                </div>
            </div>
            <div class="form-group">
                <label>Final Selling Price (PKR)</label>
                <input type="number" step="0.01" min="0" name="price" class="form-control" value="<?= e((string) $data['price']) ?>" <?= $data['price_mode'] === 'auto' ? 'readonly' : '' ?>>
                <p class="form-help">Calculated preview: <strong id="calculated-price-preview">Rs. 0</strong> &mdash; only used automatically when Pricing Mode is "Automatic".</p>
            </div>

            <h3 style="margin-top:28px;">Merchandising</h3>
            <div class="checkbox-group">
                <label class="checkbox-row"><input type="checkbox" name="featured" value="1" <?= $data['featured'] ? 'checked' : '' ?>> Featured</label>
                <label class="checkbox-row"><input type="checkbox" name="best_seller" value="1" <?= $data['best_seller'] ? 'checked' : '' ?>> Best Seller</label>
                <label class="checkbox-row"><input type="checkbox" name="new_arrival" value="1" <?= $data['new_arrival'] ? 'checked' : '' ?>> New Arrival</label>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" <?= $data['status'] === 'active' ? 'selected' : '' ?>>Active (visible on storefront)</option>
                    <option value="inactive" <?= $data['status'] === 'inactive' ? 'selected' : '' ?>>Inactive (hidden)</option>
                </select>
            </div>

            <h3 style="margin-top:28px;">SEO</h3>
            <div class="form-group">
                <label>SEO Title</label>
                <input type="text" name="seo_title" class="form-control" value="<?= e($data['seo_title']) ?>" placeholder="Defaults to product name if left blank">
            </div>
            <div class="form-group">
                <label>Meta Description</label>
                <textarea name="seo_description" class="form-control" rows="2" maxlength="255"><?= e($data['seo_description']) ?></textarea>
            </div>

            <?php if (!$isEdit): ?>
            <h3 style="margin-top:28px;">Product Images</h3>
            <div class="form-group">
                <label>Upload Images (first image becomes the main image)</label>
                <input type="file" name="images[]" class="form-control" accept=".jpg,.jpeg,.png,.webp" multiple>
                <p class="form-help">JPG, PNG or WEBP. Max 4MB each. You can add more images after saving.</p>
            </div>
            <?php endif; ?>

            <button type="submit" class="btn btn-gold" style="margin-top:10px;"><?= $isEdit ? 'Update Product' : 'Save Product' ?></button>
        </form>
    </div>

    <?php if ($isEdit): ?>
    <div class="admin-panel">
        <h3>Product Images</h3>
        <form method="post" enctype="multipart/form-data" style="margin-bottom:16px;">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="add_images">
            <div class="form-group">
                <label>Add More Images</label>
                <input type="file" name="images[]" class="form-control" accept=".jpg,.jpeg,.png,.webp" multiple>
            </div>
            <button type="submit" class="btn btn-outline btn-sm">Upload</button>
        </form>
        <div class="image-grid">
            <?php foreach ($images as $img): ?>
                <div class="img-item <?= $img['is_main'] ? 'is-main' : '' ?>">
                    <?php if ($img['is_main']): ?><span class="tag">Main</span><?php endif; ?>
                    <img src="<?= e(image_url($img['image_path'])) ?>" alt="">
                    <div class="actions">
                        <?php if (!$img['is_main']): ?>
                        <form method="post">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="set_main_image">
                            <input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>">
                            <button type="submit" class="btn btn-outline btn-sm">Set Main</button>
                        </form>
                        <?php endif; ?>
                        <form method="post" data-confirm="Remove this image?">
                            <?= csrf_field() ?>
                            <input type="hidden" name="action" value="delete_image">
                            <input type="hidden" name="image_id" value="<?= (int) $img['id'] ?>">
                            <button type="submit" class="btn btn-danger btn-sm" data-confirm="Remove this image?">&times;</button>
                        </form>
                    </div>
                </div>
            <?php endforeach; ?>
            <?php if (!$images): ?><p class="form-help">No images uploaded yet.</p><?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
</div>
