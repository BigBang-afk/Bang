<?php
/**
 * Admin panel shell header. Set $pageTitle and $activeAdminNav before including.
 * Automatically enforces admin authentication.
 */
require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/alerts.php';
require_admin();

$admin = current_admin();
$pageTitle = $pageTitle ?? 'Dashboard';
$activeAdminNav = $activeAdminNav ?? '';

$navGroups = [
    'Overview' => [
        ['key' => 'dashboard', 'label' => 'Dashboard', 'href' => 'index.php'],
    ],
    'Catalog' => [
        ['key' => 'products', 'label' => 'Products', 'href' => 'products.php'],
        ['key' => 'categories', 'label' => 'Categories', 'href' => 'categories.php'],
        ['key' => 'collections', 'label' => 'Collections', 'href' => 'collections.php'],
        ['key' => 'gold-rates', 'label' => 'Gold Rates', 'href' => 'gold-rates.php'],
    ],
    'Sales' => [
        ['key' => 'orders', 'label' => 'Orders', 'href' => 'orders.php'],
        ['key' => 'customers', 'label' => 'Customers', 'href' => 'customers.php'],
        ['key' => 'messages', 'label' => 'Messages', 'href' => 'messages.php'],
    ],
    'Website' => [
        ['key' => 'banners', 'label' => 'Homepage & Banners', 'href' => 'banners.php'],
        ['key' => 'settings', 'label' => 'Settings', 'href' => 'settings.php'],
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($pageTitle) ?> - Admin - Zarghoon Jewellers</title>
<meta name="robots" content="noindex, nofollow">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-shell">
    <aside class="admin-sidebar">
        <div class="brand">
            <strong>Zarghoon Jewellers</strong>
            <span>Admin Panel</span>
        </div>
        <?php foreach ($navGroups as $groupLabel => $items): ?>
            <div class="admin-nav-group">
                <div class="admin-nav-label"><?= e($groupLabel) ?></div>
                <?php foreach ($items as $item): ?>
                    <a class="nav-link <?= $activeAdminNav === $item['key'] ? 'active' : '' ?>" href="<?= BASE_URL ?>/admin/<?= e($item['href']) ?>"><?= e($item['label']) ?></a>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
        <div class="admin-nav-group">
            <a class="nav-link" href="<?= BASE_URL ?>/index.php" target="_blank">View Storefront &rarr;</a>
            <a class="nav-link" href="<?= BASE_URL ?>/admin/logout.php">Logout</a>
        </div>
    </aside>
    <div class="admin-main">
        <div class="admin-topbar">
            <h1><?= e($pageTitle) ?></h1>
            <span class="who">Signed in as <strong><?= e($admin['name']) ?></strong> (<?= e($admin['role']) ?>)</span>
        </div>
        <div class="admin-content">
            <?php render_alerts(); ?>
