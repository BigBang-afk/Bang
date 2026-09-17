<?php
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: application/xml; charset=UTF-8');

$staticPages = ['index.php', 'shop.php', 'collections.php', 'about.php', 'contact.php', 'journal.php'];

$categories = db()->query('SELECT slug, updated_at FROM categories WHERE status = "active"')->fetchAll();
$collections = db()->query('SELECT slug, updated_at FROM collections WHERE status = "active"')->fetchAll();
$products = db()->query('SELECT slug, updated_at FROM products WHERE status = "active"')->fetchAll();

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<?php foreach ($staticPages as $page): ?>
    <url><loc><?= e(BASE_URL . '/' . $page) ?></loc><changefreq>weekly</changefreq></url>
<?php endforeach; ?>
<?php foreach ($categories as $c): ?>
    <url><loc><?= e(BASE_URL . '/category.php?slug=' . $c['slug']) ?></loc><lastmod><?= date('Y-m-d', strtotime($c['updated_at'])) ?></lastmod><changefreq>weekly</changefreq></url>
<?php endforeach; ?>
<?php foreach ($collections as $c): ?>
    <url><loc><?= e(BASE_URL . '/collections.php?slug=' . $c['slug']) ?></loc><lastmod><?= date('Y-m-d', strtotime($c['updated_at'])) ?></lastmod><changefreq>weekly</changefreq></url>
<?php endforeach; ?>
<?php foreach ($products as $p): ?>
    <url><loc><?= e(BASE_URL . '/product.php?slug=' . $p['slug']) ?></loc><lastmod><?= date('Y-m-d', strtotime($p['updated_at'])) ?></lastmod><changefreq>weekly</changefreq></url>
<?php endforeach; ?>
</urlset>
