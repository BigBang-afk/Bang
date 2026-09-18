<?php
require_once __DIR__ . '/includes/functions.php';

$slug = trim((string) ($_GET['slug'] ?? ''));

if ($slug !== '') {
    // ---- Single-collection landing page: image/name/description +
    // the shared product listing, scoped and locked to this collection ----
    $collection = getCollectionBySlug($slug);

    if (!$collection) {
        http_response_code(404);
        require __DIR__ . '/404.php';
        exit;
    }

    $productCount = getCollectionProductCount((int) $collection['id']);

    $pageTitle = $collection['name'];
    $pageMetaDescription = $collection['description'] ?: ('Shop the ' . $collection['name'] . ' collection at ' . SITE_NAME . '.');
    $pageCanonical = SITE_URL . '/collections.php?slug=' . $collection['slug'];
    require __DIR__ . '/includes/header.php';
    ?>
    <section class="section-tight category-hero">
        <div class="container category-hero-inner">
            <?php if ($collection['image']): ?>
                <img src="<?= e(COLLECTIONS_UPLOAD_URL . $collection['image']) ?>" alt="<?= e($collection['name']) ?>" class="category-hero-image">
            <?php endif; ?>
            <div>
                <nav class="breadcrumbs">
                    <a href="<?= SITE_URL ?>/">Home</a>
                    <span>/</span>
                    <a href="<?= SITE_URL ?>/collections.php">Collections</a>
                    <span>/</span>
                    <span class="breadcrumb-current"><?= e($collection['name']) ?></span>
                </nav>
                <h1><?= e($collection['name']) ?></h1>
                <?php if ($collection['description']): ?><p class="text-muted"><?= e($collection['description']) ?></p><?php endif; ?>
                <p class="category-count"><?= $productCount ?> piece<?= $productCount === 1 ? '' : 's' ?></p>
            </div>
        </div>
    </section>

    <section class="section-tight">
        <div class="container">
            <?php
            $listingBaseUrl = 'collections.php';
            $lockedFilters = ['collection_id' => (int) $collection['id']];
            $lockCategoryFilter = false;
            $lockCollectionFilter = true;
            $extraHiddenFields = ['slug' => $collection['slug']];
            require __DIR__ . '/includes/shop-listing.php';
            ?>
        </div>
    </section>
    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php
} else {
    // ---- No slug: grid of every active collection ----
    $collectionsList = getActiveCollections();

    $pageTitle = 'Collections';
    $pageMetaDescription = 'Explore our curated jewellery collections at ' . SITE_NAME . '.';
    require __DIR__ . '/includes/header.php';
    ?>
    <section class="section-tight" style="text-align:center;">
        <div class="container">
            <span class="eyebrow"><?= e(SITE_NAME) ?></span>
            <h1>Our Collections</h1>
            <p class="text-muted">Curated edits of our finest jewellery, for every story.</p>
        </div>
    </section>

    <section class="section-tight">
        <div class="container">
            <?php if (!$collectionsList): ?>
                <div class="empty-state">
                    <p>No collections have been added yet.</p>
                </div>
            <?php else: ?>
                <div class="collections-grid">
                    <?php foreach ($collectionsList as $col): ?>
                        <?php $colCount = getCollectionProductCount((int) $col['id']); ?>
                        <a href="<?= SITE_URL ?>/collections.php?slug=<?= e($col['slug']) ?>" class="collection-card">
                            <?php if ($col['image']): ?>
                                <img src="<?= e(COLLECTIONS_UPLOAD_URL . $col['image']) ?>" alt="<?= e($col['name']) ?>">
                            <?php else: ?>
                                <span class="collection-card-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h16v4H4zM6 8v12h12V8"/></svg></span>
                            <?php endif; ?>
                            <div class="collection-card-body">
                                <h3><?= e($col['name']) ?></h3>
                                <?php if ($col['description']): ?><p class="text-muted"><?= e($col['description']) ?></p><?php endif; ?>
                                <p class="collection-card-count"><?= $colCount ?> piece<?= $colCount === 1 ? '' : 's' ?></p>
                                <span class="btn btn-outline btn-sm">Explore Collection</span>
                            </div>
                        </a>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </section>
    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php
}
