<?php
/**
 * Admin sidebar navigation. Expects $activeNav to be set by the including
 * page (one of the 'key' values below) to highlight the current link.
 */
$activeNav = $activeNav ?? '';

$icon = function (string $name): string {
    $icons = [
        'dashboard' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
        'products' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>',
        'categories' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
        'collections' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v4H4zM6 8v12h12V8"/></svg>',
        'customers' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
        'orders' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l3 3v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
        'gold-rates' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 15V9l3 2 3-2v6"/></svg>',
        'banners' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="12" rx="1"/><path d="M3 19h18"/></svg>',
        'settings' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        'messages' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        'homepage' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
        'features' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>',
        'about' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
        'instagram' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/></svg>',
        'newsletter' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></svg>',
        'activity-logs' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
        'logout' => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    ];
    return $icons[$name] ?? '';
};
?>
<aside class="admin-sidebar">
    <div class="admin-sidebar-brand">
        <strong>Zarghoon Jewellers</strong>
        <span>Admin Panel</span>
    </div>

    <div class="admin-nav-group">
        <a class="admin-nav-link <?= $activeNav === 'dashboard' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/index.php">
            <?= $icon('dashboard') ?> Dashboard
        </a>
    </div>

    <div class="admin-nav-group">
        <div class="admin-nav-label">Catalog</div>
        <a class="admin-nav-link <?= $activeNav === 'products' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/products.php">
            <?= $icon('products') ?> Products
        </a>
        <a class="admin-nav-link <?= $activeNav === 'categories' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/categories.php">
            <?= $icon('categories') ?> Categories
        </a>
        <a class="admin-nav-link <?= $activeNav === 'collections' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/collections.php">
            <?= $icon('collections') ?> Collections
        </a>
    </div>

    <div class="admin-nav-group">
        <a class="admin-nav-link <?= $activeNav === 'customers' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/customers.php">
            <?= $icon('customers') ?> Customers
        </a>
        <a class="admin-nav-link <?= $activeNav === 'orders' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/orders.php">
            <?= $icon('orders') ?> Orders
        </a>
        <a class="admin-nav-link <?= $activeNav === 'gold-rates' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/gold-rates.php">
            <?= $icon('gold-rates') ?> Gold Rates
        </a>
    </div>

    <div class="admin-nav-group">
        <div class="admin-nav-label">Content</div>
        <a class="admin-nav-link <?= $activeNav === 'homepage' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/homepage.php">
            <?= $icon('homepage') ?> Homepage
        </a>
        <a class="admin-nav-link <?= $activeNav === 'banners' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/banners.php">
            <?= $icon('banners') ?> Banners
        </a>
        <a class="admin-nav-link <?= $activeNav === 'features' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/features.php">
            <?= $icon('features') ?> Features
        </a>
        <a class="admin-nav-link <?= $activeNav === 'about' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/content.php">
            <?= $icon('about') ?> About
        </a>
        <a class="admin-nav-link <?= $activeNav === 'instagram' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/instagram.php">
            <?= $icon('instagram') ?> Instagram
        </a>
        <a class="admin-nav-link <?= $activeNav === 'newsletter' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/newsletter.php">
            <?= $icon('newsletter') ?> Newsletter
        </a>
        <a class="admin-nav-link <?= $activeNav === 'messages' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/messages.php">
            <?= $icon('messages') ?> Messages
        </a>
        <a class="admin-nav-link <?= $activeNav === 'settings' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/settings.php">
            <?= $icon('settings') ?> Settings
        </a>
    </div>

    <div class="admin-nav-group">
        <div class="admin-nav-label">System</div>
        <a class="admin-nav-link <?= $activeNav === 'activity-logs' ? 'active' : '' ?>" href="<?= SITE_URL ?>/admin/activity-logs.php">
            <?= $icon('activity-logs') ?> Activity Logs
        </a>
    </div>

    <div class="admin-nav-group">
        <a class="admin-nav-link" href="<?= SITE_URL ?>/admin/logout.php">
            <?= $icon('logout') ?> Logout
        </a>
    </div>
</aside>
<div class="admin-sidebar-overlay"></div>
