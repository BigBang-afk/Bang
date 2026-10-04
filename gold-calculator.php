<?php
/**
 * Gold Calculators (Phase 13): two public, read-only tools that use the
 * same live gold rate data that already drives every product price:
 *
 *  - Old Gold Exchange Estimator: roughly how much a customer's old gold
 *    might be worth if traded in, using the current market rate minus an
 *    admin-configured deduction (refining/wastage) - defaults to 0% (no
 *    deduction) until the shop sets a real policy figure, since this
 *    project never invents a business number on its own.
 *  - Budget -> Weight Calculator: roughly how much gold weight a given
 *    budget buys at today's rate, linking into the real shop filtered to
 *    that weight.
 *
 * Both are pure client-side JS (today's rates are embedded once below,
 * the same window.ZJ_GOLD_RATES pattern admin/_product-form.php already
 * uses) - nothing here writes to the database, so no CSRF/POST handling
 * is needed; it is purely informational and never a binding offer.
 */
require_once __DIR__ . '/includes/functions.php';

$currentRates = getCurrentGoldRates();
$ratesForJs = [];
foreach ($currentRates as $karat => $row) {
    $ratesForJs[$karat] = (float) $row['rate'];
}
$exchangeDeductionPercent = (float) getSetting('gold_exchange_deduction_percent', '0');

$pageTitle = 'Gold Calculators';
$pageMetaDescription = 'Estimate the value of your old gold for exchange, or see roughly how much gold your budget buys, using ' . SITE_NAME . "'s live gold rates.";
require __DIR__ . '/includes/header.php';
?>
<section class="section-tight" style="text-align:center;">
    <div class="container">
        <span class="eyebrow"><?= e(SITE_NAME) ?></span>
        <h1>Gold Calculators</h1>
        <p class="text-muted">Quick estimates based on today's gold rate - not a final price or offer.</p>
    </div>
</section>

<section class="section-tight">
    <div class="container" style="max-width:720px;display:grid;gap:24px;">

        <div class="admin-panel">
            <h3>Exchange Your Old Gold</h3>
            <p class="text-muted" style="margin-top:0;">Estimate what your old gold jewellery might be worth as an exchange toward a new piece.</p>

            <div class="form-row">
                <div class="form-group">
                    <label for="exchange-purity">Purity</label>
                    <select id="exchange-purity" class="form-control">
                        <?php foreach (['24K', '22K', '21K', '18K'] as $karat): ?>
                            <option value="<?= $karat ?>"><?= $karat ?><?= isset($ratesForJs[$karat]) ? '' : ' (rate not set)' ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="exchange-weight">Weight (grams)</label>
                    <input type="number" id="exchange-weight" class="form-control" min="0" step="0.01" placeholder="e.g. 10">
                </div>
            </div>

            <div id="exchange-result" class="product-price-breakdown" style="display:none;">
                <div><span>Market Value</span><span id="exchange-market-value"></span></div>
                <div id="exchange-deduction-row" style="display:none;"><span>Less <?= e(rtrim(rtrim(number_format($exchangeDeductionPercent, 1), '0'), '.')) ?>% Deduction</span><span id="exchange-deduction-amount"></span></div>
                <div style="font-weight:600;"><span>Estimated Exchange Value</span><span id="exchange-final-value"></span></div>
            </div>

            <p class="product-price-disclaimer">This is an estimate only. Final value is confirmed in-store after our team inspects the piece.</p>
        </div>

        <div class="admin-panel">
            <h3>What Can My Budget Buy?</h3>
            <p class="text-muted" style="margin-top:0;">See roughly how much gold weight your budget covers at today's rate.</p>

            <div class="form-row">
                <div class="form-group">
                    <label for="budget-purity">Purity</label>
                    <select id="budget-purity" class="form-control">
                        <?php foreach (['24K', '22K', '21K', '18K'] as $karat): ?>
                            <option value="<?= $karat ?>"><?= $karat ?><?= isset($ratesForJs[$karat]) ? '' : ' (rate not set)' ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label for="budget-amount">Your Budget (<?= e(getSetting('currency_symbol', DEFAULT_CURRENCY_SYMBOL)) ?>)</label>
                    <input type="number" id="budget-amount" class="form-control" min="0" step="100" placeholder="e.g. 100000">
                </div>
            </div>

            <div id="budget-result" class="product-price-breakdown" style="display:none;">
                <div style="font-weight:600;"><span>Approximate Weight</span><span id="budget-weight"></span></div>
            </div>
            <a href="#" id="budget-shop-link" class="btn btn-outline" style="display:none;margin-top:10px;">Browse Pieces Near This Weight</a>

            <p class="product-price-disclaimer">Making charges, stone charges, and discounts vary by design and are not included here - browse the shop for exact, final prices.</p>
        </div>

    </div>
</section>

<script nonce="<?= e(CSP_NONCE) ?>">
(function () {
    'use strict';
    var RATES = <?= json_encode($ratesForJs) ?>;
    var DEDUCTION_PERCENT = <?= json_encode($exchangeDeductionPercent) ?>;
    var CURRENCY = <?= json_encode(getSetting('currency_symbol', DEFAULT_CURRENCY_SYMBOL)) ?>;

    function money(n) {
        return CURRENCY + ' ' + Math.round(n).toLocaleString('en-US');
    }

    function initExchange() {
        var purity = document.getElementById('exchange-purity');
        var weight = document.getElementById('exchange-weight');
        var result = document.getElementById('exchange-result');
        var deductionRow = document.getElementById('exchange-deduction-row');

        function recalc() {
            var w = parseFloat(weight.value) || 0;
            var rate = RATES[purity.value] || 0;
            if (w <= 0 || rate <= 0) {
                result.style.display = 'none';
                return;
            }
            var marketValue = w * rate;
            var deduction = marketValue * (DEDUCTION_PERCENT / 100);
            var finalValue = marketValue - deduction;

            document.getElementById('exchange-market-value').textContent = money(marketValue);
            if (DEDUCTION_PERCENT > 0) {
                deductionRow.style.display = '';
                document.getElementById('exchange-deduction-amount').textContent = '− ' + money(deduction);
            } else {
                deductionRow.style.display = 'none';
            }
            document.getElementById('exchange-final-value').textContent = money(finalValue);
            result.style.display = '';
        }

        purity.addEventListener('change', recalc);
        weight.addEventListener('input', recalc);
    }

    function initBudget() {
        var purity = document.getElementById('budget-purity');
        var amount = document.getElementById('budget-amount');
        var result = document.getElementById('budget-result');
        var shopLink = document.getElementById('budget-shop-link');

        function recalc() {
            var budget = parseFloat(amount.value) || 0;
            var rate = RATES[purity.value] || 0;
            if (budget <= 0 || rate <= 0) {
                result.style.display = 'none';
                shopLink.style.display = 'none';
                return;
            }
            var weight = budget / rate;
            document.getElementById('budget-weight').textContent = weight.toFixed(2) + 'g';
            result.style.display = '';

            shopLink.href = '<?= SITE_URL ?>/shop.php?purity=' + encodeURIComponent(purity.value) + '&weight_max=' + weight.toFixed(2);
            shopLink.style.display = '';
        }

        purity.addEventListener('change', recalc);
        amount.addEventListener('input', recalc);
    }

    initExchange();
    initBudget();
})();
</script>
<?php require __DIR__ . '/includes/footer.php'; ?>
