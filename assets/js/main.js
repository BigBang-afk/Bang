/**
 * Zarghoon Jewellers - Site-wide JavaScript (Phase 4)
 *
 * Covers the shared public header/account UI introduced in Phase 4
 * (mobile account menu toggle, auto-hiding flash messages).
 * Component-specific behavior for the storefront itself (product
 * grids, cart, etc.) will be added alongside those pages in a later
 * phase.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initAccountMenu();
        initAutoHideAlerts();
    });

    function initAccountMenu() {
        var toggle = document.querySelector('[data-account-menu-toggle]');
        var menu = document.getElementById('site-account-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        document.addEventListener('click', function (e) {
            if (!menu.contains(e.target) && e.target !== toggle) {
                menu.classList.remove('open');
            }
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
