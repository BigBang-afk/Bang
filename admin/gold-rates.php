<?php
require_once __DIR__ . '/../includes/functions.php';
requireAdmin();

$allowedPurities = ['24K', '22K', '21K', '18K'];
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();

    $purity = $_POST['purity'] ?? '';
    $rateInput = trim($_POST['rate'] ?? '');
    $effectiveDate = trim($_POST['effective_date'] ?? '');

    if (!in_array($purity, $allowedPurities, true)) {
        $errors[] = 'Please select a valid purity.';
    }

    $rate = filter_var($rateInput, FILTER_VALIDATE_FLOAT);
    if ($rate === false || $rate <= 0) {
        $errors[] = 'Rate must be a number greater than 0.';
    }

    $effectiveDateTime = DateTime::createFromFormat('Y-m-d', $effectiveDate);
    if (!$effectiveDateTime || $effectiveDateTime->format('Y-m-d') !== $effectiveDate) {
        $errors[] = 'Please enter a valid effective date.';
    }

    if (!$errors) {
        // Always INSERT a new row - never UPDATE an existing one. This is
        // what preserves rate history (Part 14): getGoldRate()/
        // getCurrentGoldRates() already read the latest row by
        // effective_date/created_at, so a new row here instantly becomes
        // the "current" rate without disturbing any prior record.
        dbExecute(
            'INSERT INTO gold_rates (purity, rate, effective_date) VALUES (?, ?, ?)',
            [$purity, round($rate, 2), $effectiveDate]
        );
        logAdminActivity('create', 'gold_rate', (int) dbInsertId(), "Set $purity gold rate to " . formatPrice(round($rate, 2)) . "/g, effective $effectiveDate.");
        flash('success', "Gold rate for $purity updated to " . formatPrice(round($rate, 2)) . "/g.");
        redirect(SITE_URL . '/admin/gold-rates.php');
    }
}

$currentRates = getCurrentGoldRates();
$history = dbFetchAll('SELECT * FROM gold_rates ORDER BY effective_date DESC, created_at DESC LIMIT 100');

$pageTitle = 'Gold Rates';
$activeNav = 'gold-rates';
require __DIR__ . '/../includes/admin-header.php';
?>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Today's Gold Rates</h2></div>
    <div class="gold-rate-grid">
        <?php foreach (['24K', '22K', '21K', '18K'] as $karat): ?>
            <div class="gold-rate-item">
                <div class="karat"><?= $karat ?></div>
                <?php if (isset($currentRates[$karat])): ?>
                    <div class="rate"><?= formatPrice((float) $currentRates[$karat]['rate']) ?></div>
                    <div class="text-muted" style="font-size:.75rem;">as of <?= date('d M Y', strtotime($currentRates[$karat]['effective_date'])) ?></div>
                <?php else: ?>
                    <div class="rate unset">Not set</div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<div class="admin-panel" style="max-width:560px;">
    <div class="admin-panel-head"><h2>Update Rate</h2></div>

    <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

    <form method="post">
        <?= csrfField() ?>
        <div class="form-row">
            <div class="form-group">
                <label for="purity">Purity</label>
                <select id="purity" name="purity" class="form-control" required>
                    <?php foreach ($allowedPurities as $p): ?>
                        <option value="<?= $p ?>" <?= ($_POST['purity'] ?? '') === $p ? 'selected' : '' ?>><?= $p ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label for="rate">Rate per Gram (<?= e(getSetting('currency_symbol', DEFAULT_CURRENCY_SYMBOL)) ?>)</label>
                <input type="number" id="rate" name="rate" class="form-control" step="0.01" min="0.01" value="<?= e($_POST['rate'] ?? '') ?>" required>
            </div>
        </div>
        <div class="form-group">
            <label for="effective_date">Effective Date</label>
            <input type="date" id="effective_date" name="effective_date" class="form-control" value="<?= e($_POST['effective_date'] ?? date('Y-m-d')) ?>" required>
            <p class="form-help">The rate used everywhere on the site is the one with the most recent effective date (never just the most recently added row).</p>
        </div>
        <button type="submit" class="btn btn-gold">Update Rate</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Rate History</h2></div>
    <?php if (!$history): ?>
        <div class="empty-state"><p>No gold rates have been recorded yet.</p></div>
    <?php else: ?>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Effective Date</th><th>Purity</th><th>Rate / g</th><th>Updated</th></tr></thead>
                <tbody>
                <?php foreach ($history as $h): ?>
                    <tr>
                        <td><?= date('d M Y', strtotime($h['effective_date'])) ?></td>
                        <td><?= e($h['purity']) ?></td>
                        <td><?= formatPrice((float) $h['rate']) ?></td>
                        <td><?= date('d M Y, H:i', strtotime($h['created_at'])) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require __DIR__ . '/../includes/admin-footer.php'; ?>
