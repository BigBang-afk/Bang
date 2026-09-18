<?php
/**
 * Luxury 500 (Server Error) page, styled to match 404.php. Used as the
 * Apache ErrorDocument 500 target (see .htaccess). Deliberately does not
 * require includes/functions.php in the normal way (a 500 is often
 * reached BECAUSE something - possibly the database - is already
 * broken), so this page renders with hard-coded markup only and never
 * risks a second fatal error while trying to display the first one.
 */
http_response_code(500);
$siteUrl = getenv('SITE_URL') ?: '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Something Went Wrong | Zarghoon Jewellers</title>
<meta name="robots" content="noindex, nofollow">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/responsive.css">
</head>
<body>
<section class="section" style="text-align:center;min-height:70vh;display:flex;align-items:center;">
    <div class="container" style="max-width:560px;margin:0 auto;">
        <span class="eyebrow">500</span>
        <h1>Something Went Wrong on Our End.</h1>
        <p class="text-muted">We're experiencing a technical issue. Please try again shortly, or contact us if the problem continues.</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:24px;">
            <a href="/" class="btn btn-primary">Back to Home</a>
        </div>
    </div>
</section>
</body>
</html>
