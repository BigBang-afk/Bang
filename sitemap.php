<?php
/**
 * Dynamic sitemap.xml (Phase 9). Served at /sitemap.xml via the rewrite
 * rule in .htaccess. Lists only real, public, indexable pages - static
 * content pages, active categories, active collections, and active
 * products - never admin, auth, cart/checkout, or account/order pages.
 * Regenerated fresh on every request directly from the database, so a
 * newly added or deactivated product is reflected immediately with no
 * separate rebuild step.
 */
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: application/xml; charset=UTF-8');

function sitemapUrl(string $loc, ?string $lastmod = null, string $changefreq = 'weekly', string $priority = '0.5'): string
{
    $xml = '<url><loc>' . e($loc) . '</loc>';
    if ($lastmod) {
        $xml .= '<lastmod>' . e(date('Y-m-d', strtotime($lastmod))) . '</lastmod>';
    }
    $xml .= '<changefreq>' . e($changefreq) . '</changefreq><priority>' . e($priority) . '</priority></url>';
    return $xml;
}

$urls = [];
$urls[] = sitemapUrl(SITE_URL . '/', null, 'daily', '1.0');
$urls[] = sitemapUrl(SITE_URL . '/shop.php', null, 'daily', '0.9');
$urls[] = sitemapUrl(SITE_URL . '/collections.php', null, 'weekly', '0.7');
$urls[] = sitemapUrl(SITE_URL . '/about.php', null, 'monthly', '0.5');
$urls[] = sitemapUrl(SITE_URL . '/contact.php', null, 'monthly', '0.4');
$urls[] = sitemapUrl(SITE_URL . '/faq.php', null, 'monthly', '0.4');
$urls[] = sitemapUrl(SITE_URL . '/shipping-returns.php', null, 'monthly', '0.3');
$urls[] = sitemapUrl(SITE_URL . '/privacy-policy.php', null, 'yearly', '0.2');
$urls[] = sitemapUrl(SITE_URL . '/terms.php', null, 'yearly', '0.2');

foreach (getActiveCategories() as $cat) {
    $urls[] = sitemapUrl(SITE_URL . '/category.php?slug=' . $cat['slug'], null, 'weekly', '0.7');
}

foreach (getActiveCollections() as $col) {
    $urls[] = sitemapUrl(SITE_URL . '/collections.php?slug=' . $col['slug'], null, 'weekly', '0.7');
}

$products = dbFetchAll("SELECT slug, updated_at FROM products WHERE status = 'active' ORDER BY id ASC");
foreach ($products as $p) {
    $urls[] = sitemapUrl(SITE_URL . '/product.php?slug=' . $p['slug'], $p['updated_at'] ?? null, 'weekly', '0.8');
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $url) {
    echo $url . "\n";
}
echo '</urlset>';
