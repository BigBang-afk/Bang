/**
 * Zarghoon Jewellers - Admin Panel JavaScript (Phase 2)
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initMobileSidebar();
        initDropdowns();
        initConfirmDialogs();
        initAutoHideAlerts();
        initImagePreviews();
        initProductPricing();
    });

    // Live-preview any <input type="file" data-preview="#selector"> as soon
    // as a file is chosen, before the form is even submitted.
    function initImagePreviews() {
        document.querySelectorAll('input[type="file"][data-preview]').forEach(function (input) {
            input.addEventListener('change', function () {
                var target = document.querySelector(input.getAttribute('data-preview'));
                if (!target || !input.files || !input.files[0]) return;
                var reader = new FileReader();
                reader.onload = function (e) {
                    target.src = e.target.result;
                    target.style.display = 'block';
                };
                reader.readAsDataURL(input.files[0]);
            });
        });

        // Multi-file picker (admin/product-add.php, admin/product-edit.php):
        // show a thumbnail strip of everything selected, purely client-side.
        document.querySelectorAll('input[type="file"][data-preview-multi]').forEach(function (input) {
            input.addEventListener('change', function () {
                var target = document.querySelector(input.getAttribute('data-preview-multi'));
                if (!target) return;
                target.innerHTML = '';
                Array.prototype.forEach.call(input.files || [], function (file) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid var(--admin-border);';
                        target.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            });
        });
    }

    /**
     * Live gold pricing preview on admin/product-add.php and
     * admin/product-edit.php. The page embeds today's gold rates as
     * window.ZJ_GOLD_RATES = {"24K": 28500, "21K": 24937.50, ...} (see
     * the <script> block those two pages render). This is a preview
     * only - the server always recalculates and validates the final
     * price itself on save, never trusting this client-side number.
     */
    function initProductPricing() {
        var form = document.getElementById('product-form');
        if (!form || typeof window.ZJ_GOLD_RATES !== 'object') return;

        var puritySelect = form.querySelector('[name="purity"]');
        var netWeightInput = form.querySelector('[name="net_weight"]');
        var makingInput = form.querySelector('[name="making_charges"]');
        var stoneInput = form.querySelector('[name="stone_charges"]');
        var otherInput = form.querySelector('[name="other_charges"]');
        var discountInput = form.querySelector('[name="discount"]');
        var priceInput = form.querySelector('[name="price"]');
        var pricingTypeRadios = form.querySelectorAll('[name="pricing_type"]');
        var goldRateDisplay = document.getElementById('current-gold-rate-display');
        var goldValueDisplay = document.getElementById('preview-gold-value');
        var finalPriceDisplay = document.getElementById('preview-final-price');

        if (!puritySelect || !netWeightInput || !priceInput) return;

        function currentPricingType() {
            var checked = form.querySelector('[name="pricing_type"]:checked');
            return checked ? checked.value : 'auto';
        }

        function formatMoney(n) {
            return 'Rs. ' + Math.round(n).toLocaleString('en-US');
        }

        function recalc() {
            var purity = puritySelect.value;
            var rate = parseFloat(window.ZJ_GOLD_RATES[purity]) || 0;
            var netWeight = parseFloat(netWeightInput.value) || 0;
            var making = parseFloat(makingInput.value) || 0;
            var stone = parseFloat(stoneInput.value) || 0;
            var other = parseFloat(otherInput.value) || 0;
            var discount = parseFloat(discountInput.value) || 0;
            var isAuto = currentPricingType() === 'auto';

            var goldValue = netWeight * rate;
            var finalPrice = Math.max(0, goldValue + making + stone + other - discount);

            if (goldRateDisplay) {
                goldRateDisplay.textContent = rate > 0 ? formatMoney(rate) + ' / gram' : 'Not set for ' + purity;
            }
            if (goldValueDisplay) {
                goldValueDisplay.textContent = formatMoney(goldValue);
            }
            if (finalPriceDisplay) {
                finalPriceDisplay.textContent = formatMoney(finalPrice);
            }

            priceInput.readOnly = isAuto;
            if (isAuto) {
                priceInput.value = finalPrice.toFixed(2);
            }
        }

        [puritySelect, netWeightInput, makingInput, stoneInput, otherInput, discountInput].forEach(function (el) {
            if (el) el.addEventListener('input', recalc);
        });
        pricingTypeRadios.forEach(function (radio) {
            radio.addEventListener('change', recalc);
        });

        recalc();
    }

    function initMobileSidebar() {
        var toggle = document.querySelector('.admin-hamburger');
        var sidebar = document.querySelector('.admin-sidebar');
        var overlay = document.querySelector('.admin-sidebar-overlay');
        if (!toggle || !sidebar || !overlay) return;

        function openSidebar() {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }

        toggle.addEventListener('click', function () {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        // Clicking outside the sidebar (on the overlay) closes it.
        overlay.addEventListener('click', closeSidebar);
    }

    function initDropdowns() {
        var toggles = document.querySelectorAll('[data-dropdown-toggle]');

        toggles.forEach(function (toggle) {
            var targetId = toggle.getAttribute('data-dropdown-toggle');
            var menu = document.getElementById(targetId);
            if (!menu) return;

            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = menu.classList.contains('open');
                closeAllDropdowns();
                if (!isOpen) {
                    menu.classList.add('open');
                }
            });
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.admin-dropdown')) {
                closeAllDropdowns();
            }
        });

        function closeAllDropdowns() {
            document.querySelectorAll('.admin-dropdown-menu.open').forEach(function (m) {
                m.classList.remove('open');
            });
        }
    }

    // Native confirm() dialogs for destructive actions - element carries
    // data-confirm="Are you sure...?" and the click is cancelled if the
    // admin dismisses the dialog.
    function initConfirmDialogs() {
        document.querySelectorAll('[data-confirm]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (!window.confirm(el.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });
    }

    function initAutoHideAlerts() {
        document.querySelectorAll('.alert[data-autohide]').forEach(function (el) {
            setTimeout(function () {
                el.style.transition = 'opacity .4s ease';
                el.style.opacity = '0';
                setTimeout(function () { el.remove(); }, 400);
            }, 5000);
        });
    }
})();
