<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'toggle_section') {
        $key = $_POST['section_key'] ?? '';
        $exists = dbFetchOne('SELECT section_key FROM homepage_sections WHERE section_key = ?', [$key]);
        if ($exists) {
            dbExecute("UPDATE homepage_sections SET status = IF(status = 'active', 'inactive', 'active') WHERE section_key = ?", [$key]);
            flash('success', 'Section visibility updated.');
        }
    } elseif ($action === 'reorder_section') {
        $key = $_POST['section_key'] ?? '';
        $direction = $_POST['direction'] ?? '';
        $current = dbFetchOne('SELECT section_key, sort_order FROM homepage_sections WHERE section_key = ?', [$key]);
        if ($current) {
            $cmp = $direction === 'up' ? '<' : '>';
            $order = $direction === 'up' ? 'DESC' : 'ASC';
            $neighbor = dbFetchOne(
                "SELECT section_key, sort_order FROM homepage_sections WHERE sort_order $cmp ? ORDER BY sort_order $order LIMIT 1",
                [$current['sort_order']]
            );
            if ($neighbor) {
                dbExecute('UPDATE homepage_sections SET sort_order = ? WHERE section_key = ?', [$neighbor['sort_order'], $current['section_key']]);
                dbExecute('UPDATE homepage_sections SET sort_order = ? WHERE section_key = ?', [$current['sort_order'], $neighbor['section_key']]);
            }
        }
    } elseif ($action === 'save_counts') {
        $featuredCount = max(1, min(20, (int) ($_POST['homepage_featured_count'] ?? 8)));
        $bestSellersCount = max(1, min(20, (int) ($_POST['homepage_best_sellers_count'] ?? 8)));
        $newArrivalsCount = max(1, min(20, (int) ($_POST['homepage_new_arrivals_count'] ?? 8)));
        $tickerEnabled = !empty($_POST['gold_rate_ticker_enabled']) ? '1' : '0';

        updateSetting('homepage_featured_count', (string) $featuredCount);
        updateSetting('homepage_best_sellers_count', (string) $bestSellersCount);
        updateSetting('homepage_new_arrivals_count', (string) $newArrivalsCount);
        updateSetting('gold_rate_ticker_enabled', $tickerEnabled);
        flash('success', 'Homepage display settings saved.');
    }

    redirect(SITE_URL . '/admin/homepage.php');
}

$sections = dbFetchAll('SELECT * FROM homepage_sections ORDER BY sort_order ASC');

$pageTitle = 'Homepage';
$activeNav = 'homepage';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Homepage Sections</h2></div>
    <p class="form-help" style="margin-top:0;">Control which sections appear on the homepage and in what order. Disabled sections are not rendered at all.</p>

    <div class="table-responsive">
        <table class="data-table">
            <thead><tr><th>Section</th><th>Status</th><th>Order</th></tr></thead>
            <tbody>
            <?php foreach ($sections as $s): ?>
                <tr>
                    <td><?= e($s['section_title']) ?></td>
                    <td>
                        <form method="post" style="display:inline;">
                            <?= csrfField() ?>
                            <input type="hidden" name="action" value="toggle_section">
                            <input type="hidden" name="section_key" value="<?= e($s['section_key']) ?>">
                            <button type="submit" class="status-pill status-<?= e($s['status']) ?>" style="border:none;cursor:pointer;"><?= e(ucfirst($s['status'])) ?></button>
                        </form>
                    </td>
                    <td style="white-space:nowrap;">
                        <?= (int) $s['sort_order'] ?>
                        <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder_section"><input type="hidden" name="section_key" value="<?= e($s['section_key']) ?>"><input type="hidden" name="direction" value="up"><button type="submit" class="btn btn-outline btn-sm" style="padding:3px 8px;">&uarr;</button></form>
                        <form method="post" style="display:inline;"><?= csrfField() ?><input type="hidden" name="action" value="reorder_section"><input type="hidden" name="section_key" value="<?= e($s['section_key']) ?>"><input type="hidden" name="direction" value="down"><button type="submit" class="btn btn-outline btn-sm" style="padding:3px 8px;">&darr;</button></form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="admin-panel" style="max-width:560px;">
    <div class="admin-panel-head"><h2>Display Settings</h2></div>
    <form method="post">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="save_counts">

        <div class="form-row-3">
            <div class="form-group">
                <label for="homepage_featured_count">Featured Products</label>
                <input type="number" id="homepage_featured_count" name="homepage_featured_count" class="form-control" min="1" max="20" value="<?= (int) getSetting('homepage_featured_count', '8') ?>">
            </div>
            <div class="form-group">
                <label for="homepage_best_sellers_count">Best Sellers</label>
                <input type="number" id="homepage_best_sellers_count" name="homepage_best_sellers_count" class="form-control" min="1" max="20" value="<?= (int) getSetting('homepage_best_sellers_count', '8') ?>">
            </div>
            <div class="form-group">
                <label for="homepage_new_arrivals_count">New Arrivals</label>
                <input type="number" id="homepage_new_arrivals_count" name="homepage_new_arrivals_count" class="form-control" min="1" max="20" value="<?= (int) getSetting('homepage_new_arrivals_count', '8') ?>">
            </div>
        </div>

        <div class="form-group">
            <label class="checkbox-row"><input type="checkbox" name="gold_rate_ticker_enabled" value="1" <?= getSetting('gold_rate_ticker_enabled', '0') === '1' ? 'checked' : '' ?>> Show a small gold rate ticker in the site header</label>
        </div>

        <button type="submit" class="btn btn-gold">Save Display Settings</button>
    </form>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
