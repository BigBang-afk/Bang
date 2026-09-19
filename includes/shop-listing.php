<?php
/**
 * Shared product-listing engine: search box, sort dropdown, filter
 * panel (desktop sidebar / mobile slide-over drawer), the product
 * grid, and pagination. Included by shop.php, category.php, and
 * collections.php (single-collection mode) - never requested directly.
 *
 * The calling page must require includes/functions.php and
 * includes/header.php BEFORE this file, then includes/footer.php
 * after it, and set these variables first:
 *
 *   $listingBaseUrl       - path only, e.g. 'shop.php', 'category.php'
 *                           (used to build filter-form actions and the
 *                           pagination base URL).
 *   $lockedFilters        - filters forced by the page context, e.g.
 *                           ['category_id' => 5] on category.php.
 *                           Always wins over the same key from the URL.
 *   $lockCategoryFilter   - bool: hide the category dropdown (true on
 *                           category.php, since it's implicit in the URL).
 *   $lockCollectionFilter - bool: hide the collection dropdown (true on
 *                           collections.php's single-collection view).
 *   $extraHiddenFields    - [name => value] hidden inputs every filter/
 *                           search form must resubmit, e.g.
 *                           ['slug' => 'gold-rings'] on category.php.
 */
require_once __DIR__ . '/functions.php';

$listingBaseUrl = $listingBaseUrl ?? 'shop.php';
$lockedFilters = $lockedFilters ?? [];
$lockCategoryFilter = $lockCategoryFilter ?? false;
$lockCollectionFilter = $lockCollectionFilter ?? false;
$extraHiddenFields = $extraHiddenFields ?? [];

$get = $_GET;
$page = max(1, (int) ($get['page'] ?? 1));

$filters = array_merge(buildShopFilters($get), $lockedFilters);
$result = getProducts($filters, $page, ITEMS_PER_PAGE);

$listingCategories = $lockCategoryFilter ? [] : getActiveCategories();
$listingCollections = $lockCollectionFilter ? [] : getActiveCollections();

$listingCurrentUser = getCurrentUser();
$wishlistProductIds = $listingCurrentUser ? getUserWishlistProductIds((int) $listingCurrentUser['id']) : [];

// Bulk-fetch up to two images per listed product in one query, instead
// of one query per card, so a full page of results costs a handful of
// queries rather than dozens.
$imagesByProduct = bulkFetchProductImages(array_column($result['items'], 'id'));

$queryWithoutPage = $get;
unset($queryWithoutPage['page']);
$listingBaseUrlWithQuery = $listingBaseUrl . ($queryWithoutPage ? '?' . http_build_query($queryWithoutPage) : '');
$bareUrl = $listingBaseUrl . ($extraHiddenFields ? '?' . http_build_query($extraHiddenFields) : '');

$selectedCategorySlug = $get['category'] ?? '';
$selectedCollectionSlug = $get['collection'] ?? '';
$selectedPurity = $get['purity'] ?? '';
$selectedStock = is_array($get['stock'] ?? null) ? $get['stock'] : [];
$searchTerm = trim((string) ($get['search'] ?? ''));
$currentSort = is_string($get['sort'] ?? null) && $get['sort'] !== '' ? $get['sort'] : 'featured';
?>
<div class="shop-toolbar">
    <form method="get" action="<?= SITE_URL ?>/<?= e($listingBaseUrl) ?>" class="shop-search-form">
        <?php foreach ($extraHiddenFields as $hiddenKey => $hiddenValue): ?><input type="hidden" name="<?= e($hiddenKey) ?>" value="<?= e($hiddenValue) ?>"><?php endforeach; ?>
        <input type="text" name="search" class="form-control shop-search-input" placeholder="SEARCH JEWELLERY" value="<?= e($searchTerm) ?>">
        <button type="submit" class="btn btn-primary btn-sm">Search</button>
    </form>

    <div class="shop-toolbar-right">
        <button type="button" class="btn btn-outline btn-sm shop-filters-toggle" data-filters-toggle>Filters</button>
        <select class="form-control shop-sort-select" data-sort-select aria-label="Sort by">
            <option value="featured" <?= $currentSort === 'featured' ? 'selected' : '' ?>>Sort By: Featured</option>
            <option value="newest" <?= $currentSort === 'newest' ? 'selected' : '' ?>>Newest</option>
            <option value="price_asc" <?= $currentSort === 'price_asc' ? 'selected' : '' ?>>Price: Low to High</option>
            <option value="price_desc" <?= $currentSort === 'price_desc' ? 'selected' : '' ?>>Price: High to Low</option>
            <option value="name_asc" <?= $currentSort === 'name_asc' ? 'selected' : '' ?>>Name: A-Z</option>
            <option value="name_desc" <?= $currentSort === 'name_desc' ? 'selected' : '' ?>>Name: Z-A</option>
        </select>
    </div>
</div>

<?php if ($searchTerm !== ''): ?>
    <p class="shop-search-status">Showing results for: <strong><?= e($searchTerm) ?></strong>
        <a href="<?= SITE_URL ?>/<?= e($bareUrl) ?>" class="shop-clear-search">CLEAR SEARCH</a>
    </p>
<?php endif; ?>

<div class="shop-layout">
    <aside class="shop-filters" id="shop-filters">
        <div class="shop-filters-head">
            <h3>Filters</h3>
            <button type="button" class="shop-filters-close" data-filters-close aria-label="Close filters">&times;</button>
        </div>
        <form method="get" action="<?= SITE_URL ?>/<?= e($listingBaseUrl) ?>">
            <?php foreach ($extraHiddenFields as $hiddenKey => $hiddenValue): ?><input type="hidden" name="<?= e($hiddenKey) ?>" value="<?= e($hiddenValue) ?>"><?php endforeach; ?>
            <?php if ($searchTerm !== ''): ?><input type="hidden" name="search" value="<?= e($searchTerm) ?>"><?php endif; ?>
            <input type="hidden" name="sort" value="<?= e($currentSort) ?>">

            <?php if (!$lockCategoryFilter): ?>
            <div class="filter-group">
                <label>Category</label>
                <select name="category" class="form-control">
                    <option value="">All</option>
                    <?php foreach ($listingCategories as $cat): ?>
                        <option value="<?= e($cat['slug']) ?>" <?= $selectedCategorySlug === $cat['slug'] ? 'selected' : '' ?>><?= e($cat['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>

            <?php if (!$lockCollectionFilter): ?>
            <div class="filter-group">
                <label>Collection</label>
                <select name="collection" class="form-control">
                    <option value="">All</option>
                    <?php foreach ($listingCollections as $col): ?>
                        <option value="<?= e($col['slug']) ?>" <?= $selectedCollectionSlug === $col['slug'] ? 'selected' : '' ?>><?= e($col['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>

            <div class="filter-group">
                <label>Purity</label>
                <select name="purity" class="form-control">
                    <option value="">All</option>
                    <?php foreach (['24K', '22K', '21K', '18K'] as $karat): ?>
                        <option value="<?= $karat ?>" <?= $selectedPurity === $karat ? 'selected' : '' ?>><?= $karat ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="filter-group">
                <label>Price Range (Rs.)</label>
                <div class="filter-range">
                    <input type="number" name="price_min" class="form-control" placeholder="Min" min="0" value="<?= e($get['price_min'] ?? '') ?>">
                    <span>&ndash;</span>
                    <input type="number" name="price_max" class="form-control" placeholder="Max" min="0" value="<?= e($get['price_max'] ?? '') ?>">
                </div>
            </div>

            <div class="filter-group">
                <label>Weight Range (g)</label>
                <div class="filter-range">
                    <input type="number" name="weight_min" class="form-control" placeholder="Min" min="0" step="0.01" value="<?= e($get['weight_min'] ?? '') ?>">
                    <span>&ndash;</span>
                    <input type="number" name="weight_max" class="form-control" placeholder="Max" min="0" step="0.01" value="<?= e($get['weight_max'] ?? '') ?>">
                </div>
            </div>

            <div class="filter-group">
                <label>Availability</label>
                <label class="checkbox-row"><input type="checkbox" name="stock[]" value="in_stock" <?= in_array('in_stock', $selectedStock, true) ? 'checked' : '' ?>> In Stock</label>
                <label class="checkbox-row"><input type="checkbox" name="stock[]" value="made_to_order" <?= in_array('made_to_order', $selectedStock, true) ? 'checked' : '' ?>> Coming Soon</label>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Apply Filters</button>
            <a href="<?= SITE_URL ?>/<?= e($bareUrl) ?>" class="btn btn-outline btn-block">Clear All</a>
        </form>
    </aside>

    <div class="shop-filters-overlay" data-filters-close></div>

    <div class="shop-results">
        <?php if (!$result['items']): ?>
            <div class="empty-state">
                <div class="icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <p>No jewellery found.</p>
            </div>
        <?php else: ?>
            <p class="shop-result-count"><?= (int) $result['total'] ?> piece<?= $result['total'] === 1 ? '' : 's' ?> found</p>
            <div class="product-grid">
                <?php foreach ($result['items'] as $product): ?>
                    <?php include __DIR__ . '/product-card.php'; ?>
                <?php endforeach; ?>
            </div>
            <?php renderPagination($result, $listingBaseUrlWithQuery); ?>
        <?php endif; ?>
    </div>
</div>
