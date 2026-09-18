<?php
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Shop Jewellery';
$pageMetaDescription = 'Discover timeless gold jewellery pieces crafted to celebrate every occasion, from ' . SITE_NAME . '.';
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Shop Jewellery</h1>
        <p class="text-muted">Discover timeless pieces crafted to celebrate every occasion.</p>
    </div>
</section>

<section class="section-tight">
    <div class="container">
        <?php
        $listingBaseUrl = 'shop.php';
        $lockedFilters = [];
        $lockCategoryFilter = false;
        $lockCollectionFilter = false;
        $extraHiddenFields = [];
        require __DIR__ . '/includes/shop-listing.php';
        ?>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
