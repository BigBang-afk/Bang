<?php
require_once __DIR__ . '/../includes/admin_auth.php';
require_admin();

$pdo = db();
$admin = current_admin();
$karats = ['24K', '22K', '21K', '18K'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $stmt = $pdo->prepare('INSERT INTO gold_rates (karat, rate_per_gram, effective_date, created_by) VALUES (?, ?, CURDATE(), ?)');
    $updated = [];
    foreach ($karats as $k) {
        $rate = (float) ($_POST['rate_' . $k] ?? 0);
        if ($rate > 0) {
            $stmt->execute([$k, $rate, $admin['id']]);
            $updated[] = $k;
        }
    }
    if ($updated) {
        log_activity('Gold rates updated for ' . implode(', ', $updated) . ' by ' . $admin['username'] . '.');
        flash('success', 'Gold rates updated. All automatically-priced products now reflect the new rates.');
    } else {
        flash('error', 'Please enter at least one valid rate.');
    }
    redirect(BASE_URL . '/admin/gold-rates.php');
}

$currentRates = get_current_gold_rates();
$history = $pdo->query(
    'SELECT g.*, a.username FROM gold_rates g LEFT JOIN admins a ON a.id = g.created_by ORDER BY g.created_at DESC LIMIT 20'
)->fetchAll();

$pageTitle = 'Gold Rates';
$activeAdminNav = 'gold-rates';
require __DIR__ . '/../includes/admin_header.php';
?>

<div class="admin-panel" style="max-width:760px;">
    <div class="admin-panel-head"><h2>Update Today's Gold Rates</h2></div>
    <p class="form-help" style="margin-bottom:18px;"><?= e(get_setting('pricing_formula_note', '')) ?></p>
    <form method="post">
        <?= csrf_field() ?>
        <div class="form-row-3">
            <?php foreach ($karats as $k): ?>
                <div class="form-group">
                    <label><?= $k ?> Gold Rate (PKR/gram)</label>
                    <input type="number" step="0.01" min="0" name="rate_<?= $k ?>" class="form-control"
                        value="<?= isset($currentRates[$k]) ? e((string) $currentRates[$k]['rate_per_gram']) : '' ?>"
                        placeholder="e.g. 24937.50">
                    <?php if (isset($currentRates[$k])): ?>
                        <p class="form-help">Last updated <?= date('d M Y, H:i', strtotime($currentRates[$k]['created_at'])) ?></p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <button type="submit" class="btn btn-gold">Update Rates</button>
    </form>
</div>

<div class="admin-panel">
    <div class="admin-panel-head"><h2>Rate History</h2></div>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Karat</th><th>Rate (per gram)</th><th>Effective Date</th><th>Updated By</th><th>Timestamp</th></tr></thead>
            <tbody>
            <?php foreach ($history as $h): ?>
                <tr>
                    <td><?= e($h['karat']) ?></td>
                    <td><?= currency((float) $h['rate_per_gram']) ?></td>
                    <td><?= date('d M Y', strtotime($h['effective_date'])) ?></td>
                    <td><?= e($h['username'] ?? '-') ?></td>
                    <td><?= date('d M Y, H:i', strtotime($h['created_at'])) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require __DIR__ . '/../includes/admin_footer.php'; ?>
