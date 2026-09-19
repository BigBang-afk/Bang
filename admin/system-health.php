<?php
/**
 * Production readiness / system health dashboard (Phase 10). Admin-only,
 * read-only - never displays a database password, SMTP password, or any
 * other secret value, only whether each is configured.
 *
 * Every check below either runs a real test (PHP version, extensions,
 * a live DB query, is_writable() on disk, the current request's HTTPS
 * state) or reads real Admin > Settings values - nothing here is ever
 * hard-coded to PASS.
 */
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

/** @return array{status:string,label:string} status is 'pass'|'warning'|'fail' */
function healthRow(string $status, string $label): array
{
    return ['status' => $status, 'label' => $label];
}

function healthBadgeClass(string $status): string
{
    return ['pass' => 'status-active', 'warning' => 'status-pending', 'fail' => 'status-inactive'][$status] ?? 'status-pending';
}

$checks = [];

// ---- PHP version ----
$phpOk = version_compare(PHP_VERSION, '8.1.0', '>=');
$checks['PHP Version'][] = healthRow($phpOk ? 'pass' : 'fail', 'Running PHP ' . PHP_VERSION . ($phpOk ? ' (8.1+ required, OK)' : ' - PHP 8.1 or newer is required'));

// ---- Required PHP extensions (only ones this app actually uses) ----
$requiredExtensions = [
    'pdo' => 'Database access (PDO)',
    'pdo_mysql' => 'MySQL/MariaDB driver',
    'mbstring' => 'Multi-byte string handling (names, descriptions)',
    'fileinfo' => 'Real MIME-type detection for image uploads',
    'json' => 'JSON encoding (settings, JSON-LD, activity logs)',
    'openssl' => 'HTTPS/TLS support for SMTP email',
    'session' => 'Login sessions (customers and admins)',
];
foreach ($requiredExtensions as $ext => $why) {
    $loaded = extension_loaded($ext);
    $checks['PHP Extensions'][] = healthRow($loaded ? 'pass' : 'fail', "$ext - $why" . ($loaded ? '' : ' (MISSING)'));
}

// ---- Database ----
try {
    $version = dbFetchColumn('SELECT VERSION()');
    $checks['Database'][] = healthRow('pass', 'Connected to MySQL/MariaDB (version ' . $version . ')');
    $adminCount = (int) dbFetchColumn('SELECT COUNT(*) FROM admins');
    $checks['Database'][] = healthRow($adminCount > 0 ? 'pass' : 'fail', $adminCount . ' admin account(s) exist');
} catch (Throwable $e) {
    $checks['Database'][] = healthRow('fail', 'Could not connect to the database.');
}

// ---- Upload directories ----
$uploadDirs = [
    'products' => PRODUCTS_UPLOAD_PATH, 'categories' => CATEGORIES_UPLOAD_PATH,
    'collections' => COLLECTIONS_UPLOAD_PATH, 'banners' => BANNERS_UPLOAD_PATH,
    'logo' => LOGO_UPLOAD_PATH, 'favicon' => FAVICON_UPLOAD_PATH, 'gallery' => GALLERY_UPLOAD_PATH,
];
foreach ($uploadDirs as $label => $path) {
    if (!is_dir($path)) {
        $parentWritable = is_writable(dirname($path));
        $checks['Upload Directories'][] = healthRow(
            $parentWritable ? 'warning' : 'fail',
            "uploads/$label/ does not exist yet" . ($parentWritable ? ' - will be created automatically on first upload' : ' - AND its parent folder is not writable, uploads will fail')
        );
    } else {
        $writable = is_writable($path);
        $checks['Upload Directories'][] = healthRow($writable ? 'pass' : 'fail', "uploads/$label/ " . ($writable ? 'is writable' : 'is NOT writable - uploads to this folder will fail'));
    }
}

// ---- HTTPS ----
$https = isHttpsRequest();
$checks['HTTPS'][] = healthRow($https ? 'pass' : 'warning', $https ? 'This request was served over HTTPS.' : 'This request was NOT served over HTTPS (expected on local development; must be fixed before launch).');

// ---- Configuration ----
$checks['Configuration'][] = healthRow(APP_ENV === 'production' ? 'pass' : 'warning', 'APP_ENV is "' . APP_ENV . '"' . (APP_ENV === 'production' ? '' : ' (set to "production" in config/env.php on your live server)'));
if (!APP_DEBUG) {
    $debugStatus = 'pass';
} elseif (APP_ENV === 'production') {
    $debugStatus = 'fail';
} else {
    $debugStatus = 'warning';
}
$checks['Configuration'][] = healthRow($debugStatus, 'APP_DEBUG is ' . (APP_DEBUG ? 'ON (errors are shown - fine for local dev, must be OFF in production)' : 'OFF (errors are hidden from visitors)'));
$siteUrlIsDefault = str_contains(SITE_URL, 'localhost');
$checks['Configuration'][] = healthRow($siteUrlIsDefault ? 'warning' : 'pass', 'SITE_URL is "' . SITE_URL . '"' . ($siteUrlIsDefault ? ' - still the local default, set your real domain in config/env.php before launch' : ''));

// ---- Shop settings completeness ----
$settingsChecks = [
    'shop_name' => 'Shop Name',
    'whatsapp_number' => 'WhatsApp Number',
    'email' => 'Contact Email',
    'phone' => 'Phone',
    'address' => 'Address',
];
foreach ($settingsChecks as $key => $label) {
    $value = getSetting($key, '');
    $isPlaceholder = $value === '' || $value === 'CHANGE_ME';
    $checks['Shop Settings'][] = healthRow($isPlaceholder ? 'warning' : 'pass', $label . ($isPlaceholder ? ' is not set - update it in Admin > Settings' : ' is set'));
}
$logo = getSetting('logo', '');
$checks['Shop Settings'][] = healthRow($logo !== '' ? 'pass' : 'warning', $logo !== '' ? 'Logo is uploaded.' : 'No logo uploaded (site shows the text logo - fine, but optional to add one).');

// ---- Gold rates ----
$currentRates = getCurrentGoldRates();
foreach (['24K', '21K', '18K'] as $karat) {
    $checks['Gold Rates'][] = healthRow(isset($currentRates[$karat]) ? 'pass' : 'warning', $karat . ' rate ' . (isset($currentRates[$karat]) ? 'is set (as of ' . date('d M Y', strtotime($currentRates[$karat]['effective_date'])) . ')' : 'has not been set yet - add it in Admin > Gold Rates'));
}

// ---- Email (SMTP) ----
$smtpHost = getSetting('smtp_host', '');
$checks['Email'][] = healthRow($smtpHost !== '' ? 'pass' : 'warning', $smtpHost !== '' ? 'SMTP is configured (host: ' . $smtpHost . ').' : 'SMTP is not configured - order/contact/registration email notifications will not be sent, but the site otherwise works normally.');

// ---- Maintenance mode ----
$maintenanceOn = getSetting('maintenance_mode', '0') === '1';
$checks['Maintenance Mode'][] = healthRow($maintenanceOn ? 'warning' : 'pass', $maintenanceOn ? 'Maintenance mode is ON - the public site is showing the "we will be right back" page to visitors right now.' : 'Maintenance mode is off.');

$overallCounts = ['pass' => 0, 'warning' => 0, 'fail' => 0];
foreach ($checks as $group) {
    foreach ($group as $row) {
        $overallCounts[$row['status']]++;
    }
}

$pageTitle = 'System Health';
$activeNav = 'system-health';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head">
        <h2>Production Readiness</h2>
        <div>
            <span class="status-pill status-active"><?= $overallCounts['pass'] ?> Pass</span>
            <span class="status-pill status-pending"><?= $overallCounts['warning'] ?> Warning</span>
            <span class="status-pill status-inactive"><?= $overallCounts['fail'] ?> Fail</span>
        </div>
    </div>
    <p class="form-help" style="margin-top:0;">Every row below reflects an actual check run right now (PHP version, live database query, real file permissions, current settings) - nothing here is assumed.</p>
</div>

<?php foreach ($checks as $groupName => $rows): ?>
<div class="admin-panel">
    <div class="admin-panel-head"><h2><?= e($groupName) ?></h2></div>
    <ul class="admin-alert-list">
        <?php foreach ($rows as $row): ?>
            <li>
                <span class="status-pill <?= healthBadgeClass($row['status']) ?>" style="min-width:76px;text-align:center;"><?= strtoupper($row['status']) ?></span>
                <div><?= e($row['label']) ?></div>
            </li>
        <?php endforeach; ?>
    </ul>
</div>
<?php endforeach; ?>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
