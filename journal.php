<?php
require_once __DIR__ . '/includes/functions.php';

// The Journal is an editorial content page. It is intentionally static (not
// database-driven) since a blog/CMS was outside the requested scope; edit
// the $articles array below to update the content.
$articles = [
    [
        'title' => 'Understanding Gold Purity: 24K, 22K, 21K & 18K Explained',
        'excerpt' => 'A simple guide to gold purity levels, what the "K" means, and how to choose the right purity for everyday wear versus investment pieces.',
        'image' => 'https://images.unsplash.com/photo-1610375461369-d613b564f4c4?w=900&q=80',
    ],
    [
        'title' => 'Caring for Your Gold Jewellery',
        'excerpt' => 'Simple habits to keep your gold pieces looking radiant for years, from safe storage to gentle cleaning routines.',
        'image' => 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&q=80',
    ],
    [
        'title' => 'Choosing Bridal Jewellery That Lasts a Lifetime',
        'excerpt' => 'What to look for when selecting bridal sets, from weight and purity to design longevity.',
        'image' => 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=900&q=80',
    ],
];

$pageTitle = 'Journal - ' . get_setting('shop_name', SITE_NAME);
$activeNav = 'journal';
require __DIR__ . '/includes/header.php';
?>
<div class="page-header">
    <div class="container">
        <div class="breadcrumb"><a href="<?= BASE_URL ?>/index.php">Home</a> / Journal</div>
        <h1>The Journal</h1>
        <p>Stories, guides and inspiration from Zarghoon Jewellers.</p>
    </div>
</div>
<div class="container section-tight">
    <div class="product-grid" style="grid-template-columns:repeat(3,1fr);">
        <?php foreach ($articles as $a): ?>
            <div class="product-card reveal">
                <div class="product-media" style="aspect-ratio:4/3;">
                    <img src="<?= e($a['image']) ?>" alt="<?= e($a['title']) ?>" loading="lazy">
                </div>
                <div class="product-info">
                    <h3><?= e($a['title']) ?></h3>
                    <p class="product-meta"><?= e($a['excerpt']) ?></p>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
