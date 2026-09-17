<?php
/**
 * Renders the shared shop/category/search filter bar.
 * $current = current GET filter values; $categories = active categories for the dropdown (optional).
 * $hideCategory = true when already on a fixed category page (no need to show the category filter).
 */
function render_shop_filters(array $current, array $categories = [], bool $hideCategory = false): void
{
    ?>
    <form method="get" class="filters-bar">
        <?php foreach ($_GET as $key => $val): if (!is_string($val) || in_array($key, ['category','purity','stock_status','min_price','max_price','min_weight','max_weight','sort','page','q'], true)) continue; ?>
            <input type="hidden" name="<?= e($key) ?>" value="<?= e($val) ?>">
        <?php endforeach; ?>
        <?php if (!empty($current['q'])): ?><input type="hidden" name="q" value="<?= e($current['q']) ?>"><?php endif; ?>

        <?php if (!$hideCategory && $categories): ?>
        <select name="category" onchange="this.form.submit()">
            <option value="">All Categories</option>
            <?php foreach ($categories as $c): ?>
                <option value="<?= (int) $c['id'] ?>" <?= (string) ($current['category'] ?? '') === (string) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <?php endif; ?>

        <select name="purity" onchange="this.form.submit()">
            <option value="">All Purity</option>
            <?php foreach (['24K','22K','21K','18K'] as $k): ?>
                <option value="<?= $k ?>" <?= ($current['purity'] ?? '') === $k ? 'selected' : '' ?>><?= $k ?></option>
            <?php endforeach; ?>
        </select>

        <select name="stock_status" onchange="this.form.submit()">
            <option value="">All Availability</option>
            <option value="in_stock" <?= ($current['stock_status'] ?? '') === 'in_stock' ? 'selected' : '' ?>>In Stock</option>
            <option value="made_to_order" <?= ($current['stock_status'] ?? '') === 'made_to_order' ? 'selected' : '' ?>>Made to Order</option>
        </select>

        <input type="number" name="min_price" placeholder="Min Price" value="<?= e($current['min_price'] ?? '') ?>" style="width:110px;">
        <input type="number" name="max_price" placeholder="Max Price" value="<?= e($current['max_price'] ?? '') ?>" style="width:110px;">

        <select name="sort" onchange="this.form.submit()">
            <option value="newest" <?= ($current['sort'] ?? 'newest') === 'newest' ? 'selected' : '' ?>>Newest First</option>
            <option value="price_asc" <?= ($current['sort'] ?? '') === 'price_asc' ? 'selected' : '' ?>>Price: Low to High</option>
            <option value="price_desc" <?= ($current['sort'] ?? '') === 'price_desc' ? 'selected' : '' ?>>Price: High to Low</option>
            <option value="name_asc" <?= ($current['sort'] ?? '') === 'name_asc' ? 'selected' : '' ?>>Name: A-Z</option>
        </select>

        <button type="submit" class="btn btn-outline btn-sm">Apply</button>
    </form>
    <?php
}
