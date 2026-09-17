<?php
/**
 * Admin panel shell header. Every admin/*.php page must call requireAdmin()
 * itself before including this file (this file also enforces it again as
 * a defense-in-depth safety net - authentication is never left to rely on
 * a page simply forgetting to include this header).
 *
 * Expects (set by the including page before requiring this file):
 *   $pageTitle    - short heading shown in the topbar, e.g. 'Dashboard'
 *   $browserTitle - optional, defaults to $pageTitle; used in <title>
 *   $activeNav    - sidebar highlight key, e.g. 'dashboard'
 */
require_once __DIR__ . '/functions.php';
requireAdmin();

$admin = getCurrentAdmin();
$pageTitle = $pageTitle ?? 'Dashboard';
$browserTitle = $browserTitle ?? $pageTitle;
$alertCounts = getAdminAlertCounts();
$notificationCount = $alertCounts['pending_orders'] + $alertCounts['unread_messages'];
$initials = strtoupper(substr($admin['full_name'] ?? $admin['username'], 0, 1));
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zarghoon Jewellers | <?= e($browserTitle) ?></title>
<meta name="robots" content="noindex, nofollow">
<meta name="csrf-token" content="<?= e(generateCsrfToken()) ?>">
<link rel="stylesheet" href="<?= SITE_URL ?>/assets/css/admin.css">
</head>
<body class="admin-body">
<div class="admin-shell">
    <?php require __DIR__ . '/admin-sidebar.php'; ?>

    <div class="admin-main">
        <header class="admin-topbar">
            <div class="admin-topbar-left">
                <button type="button" class="admin-hamburger" aria-label="Open menu">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <h1><?= e($pageTitle) ?></h1>
            </div>

            <form class="admin-topbar-search" method="get" action="<?= SITE_URL ?>/admin/search.php">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" name="q" placeholder="Search orders, products, customers..." value="<?= e($_GET['q'] ?? '') ?>">
            </form>

            <div class="admin-topbar-right">
                <div class="admin-dropdown">
                    <button type="button" class="admin-icon-btn" data-dropdown-toggle="notify-menu" aria-label="Notifications">
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <?php if ($notificationCount > 0): ?><span class="admin-icon-badge"><?= $notificationCount > 9 ? '9+' : $notificationCount ?></span><?php endif; ?>
                    </button>
                    <div class="admin-dropdown-menu admin-notify-panel" id="notify-menu">
                        <div class="menu-header"><strong>Notifications</strong></div>
                        <?php if ($alertCounts['pending_orders'] > 0): ?>
                            <a class="admin-notify-item" href="<?= SITE_URL ?>/admin/orders.php"><?= $alertCounts['pending_orders'] ?> pending order<?= $alertCounts['pending_orders'] === 1 ? '' : 's' ?></a>
                        <?php endif; ?>
                        <?php if ($alertCounts['unread_messages'] > 0): ?>
                            <a class="admin-notify-item" href="<?= SITE_URL ?>/admin/messages.php"><?= $alertCounts['unread_messages'] ?> unread message<?= $alertCounts['unread_messages'] === 1 ? '' : 's' ?></a>
                        <?php endif; ?>
                        <?php if ($alertCounts['new_customers_today'] > 0): ?>
                            <a class="admin-notify-item" href="<?= SITE_URL ?>/admin/customers.php"><?= $alertCounts['new_customers_today'] ?> new customer registration<?= $alertCounts['new_customers_today'] === 1 ? '' : 's' ?> today</a>
                        <?php endif; ?>
                        <?php if ($notificationCount === 0 && $alertCounts['new_customers_today'] === 0): ?>
                            <div class="admin-notify-empty">You're all caught up.</div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="admin-dropdown">
                    <button type="button" class="admin-dropdown-toggle" data-dropdown-toggle="profile-menu">
                        <span class="admin-avatar"><?= e($initials) ?></span>
                        <span class="admin-dropdown-name">
                            <strong><?= e($admin['full_name']) ?></strong>
                            <span>@<?= e($admin['username']) ?></span>
                        </span>
                    </button>
                    <div class="admin-dropdown-menu" id="profile-menu">
                        <div class="menu-header">
                            <strong><?= e($admin['full_name']) ?></strong>
                            <span>@<?= e($admin['username']) ?></span>
                            <span class="role-badge"><?= e(str_replace('_', ' ', $admin['role'])) ?></span>
                        </div>
                        <a href="<?= SITE_URL ?>/admin/index.php">Dashboard</a>
                        <a href="<?= SITE_URL ?>/admin/logout.php">Logout</a>
                    </div>
                </div>
            </div>
        </header>

        <div class="admin-content">
            <?php foreach ((flash() ?: []) as $f): ?>
                <div class="alert alert-<?= e($f['type']) ?>" data-autohide><?= e($f['message']) ?></div>
            <?php endforeach; ?>
