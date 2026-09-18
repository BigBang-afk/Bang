<?php
require_once __DIR__ . '/includes/functions.php';

$slug = trim((string) ($_GET['slug'] ?? ''));
$category = $slug !== '' ? getCategoryBySlug($slug) : null;

if (!$category) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$productCount = getCategoryProductCount((int) $category['id']);

$pageTitle = $category['name'];
$pageMetaDescription = $category['description'] ?: ('Shop ' . $category['name'] . ' at ' . SITE_NAME . '.');
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight category-hero">
    <div class="container category-hero-inner">
        <?php if ($category['image']): ?>
            <img src="<?= e(CATEGORIES_UPLOAD_URL . $category['image']) ?>" alt="<?= e($category['name']) ?>" class="category-hero-image">
        <?php endif; ?>
        <div>
            <nav class="breadcrumbs">
                <a href="<?= SITE_URL ?>/">Home</a>
                <span>/</span>
                <span class="breadcrumb-current"><?= e($category['name']) ?></span>
            </nav>
            <h1><?= e($category['name']) ?></h1>
            <?php if ($category['description']): ?><p class="text-muted"><?= e($category['description']) ?></p><?php endif; ?>
            <p class="category-count"><?= $productCount ?> piece<?= $productCount === 1 ? '' : 's' ?></p>
        </div>
    </div>
</section>

<section class="section-tight">
    <div class="container">
        <?php
        $listingBaseUrl = 'category.php';
        $lockedFilters = ['category_id' => (int) $category['id']];
        $lockCategoryFilter = true;
        $lockCollectionFilter = false;
        $extraHiddenFields = ['slug' => $category['slug']];
        require __DIR__ . '/includes/shop-listing.php';
        ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
