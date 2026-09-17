/* Zarghoon Jewellers - Admin Panel interactions */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // Confirm before any destructive action (delete buttons/links carry data-confirm)
        document.querySelectorAll('[data-confirm]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (!window.confirm(el.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });

        // Auto-hide alerts
        document.querySelectorAll('.alert[data-autohide]').forEach(function (el) {
            setTimeout(function () {
                el.style.transition = 'opacity .4s ease';
                el.style.opacity = '0';
                setTimeout(function () { el.remove(); }, 400);
            }, 5000);
        });

        // Live-preview selected image files before upload
        document.querySelectorAll('input[type="file"][data-preview]').forEach(function (input) {
            input.addEventListener('change', function () {
                var target = document.querySelector(input.getAttribute('data-preview'));
                if (!target || !input.files || !input.files[0]) return;
                var reader = new FileReader();
                reader.onload = function (e) { target.src = e.target.result; target.style.display = 'block'; };
                reader.readAsDataURL(input.files[0]);
            });
        });

        initAutoPricing();
    });

    // Recalculates the auto price preview on the product form as inputs change.
    function initAutoPricing() {
        var form = document.querySelector('#product-form');
        if (!form) return;
        var netWeight = form.querySelector('[name="net_weight"]');
        var goldRate = form.querySelector('[name="gold_rate"]');
        var making = form.querySelector('[name="making_charges"]');
        var stone = form.querySelector('[name="stone_charges"]');
        var other = form.querySelector('[name="other_charges"]');
        var discount = form.querySelector('[name="discount"]');
        var priceField = form.querySelector('[name="price"]');
        var priceModeAuto = form.querySelector('[name="price_mode"][value="auto"]');
        var preview = document.querySelector('#calculated-price-preview');
        if (!netWeight || !goldRate) return;

        function recalc() {
            var nw = parseFloat(netWeight.value) || 0;
            var gr = parseFloat(goldRate.value) || 0;
            var mk = parseFloat(making.value) || 0;
            var st = parseFloat(stone.value) || 0;
            var ot = parseFloat(other.value) || 0;
            var dc = parseFloat(discount.value) || 0;
            var total = Math.max(0, (nw * gr) + mk + st + ot - dc);
            if (preview) {
                preview.textContent = 'Rs. ' + total.toLocaleString('en-US', { maximumFractionDigits: 0 });
            }
            if (priceModeAuto && priceModeAuto.checked && priceField) {
                priceField.value = total.toFixed(2);
            }
        }

        [netWeight, goldRate, making, stone, other, discount].forEach(function (el) {
            el.addEventListener('input', recalc);
        });
        form.querySelectorAll('[name="price_mode"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (priceField) priceField.readOnly = (radio.value === 'auto' && radio.checked);
                recalc();
            });
        });
        recalc();
    }
})();
