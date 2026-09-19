<?php
/**
 * Maintenance mode page (Phase 10). Rendered directly by includes/header.php
 * when Admin > Settings has maintenance mode switched on and the current
 * visitor isn't a logged-in admin - it does NOT require includes/header.php
 * itself (that would recurse). Safe to also open directly.
 */
if (!defined('SITE_NAME')) {
    require_once __DIR__ . '/includes/functions.php';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e(SITE_NAME) ?> | We'll Be Right Back</title>
<meta name="robots" content="noindex, nofollow">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/responsive.css">
</head>
<body>
<section class="section" style="text-align:center;min-height:80vh;display:flex;align-items:center;">
    <div class="container" style="max-width:560px;margin:0 auto;">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>We're Preparing Something Beautiful.</h1>
        <p class="text-muted">Our website is temporarily undergoing maintenance. Please check back shortly.</p>
    </div>
</section>
</body>
</html>
