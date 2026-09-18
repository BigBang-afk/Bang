/**
 * Zarghoon Jewellers - Site-wide JavaScript
 *
 * Covers the shared public header/account UI: mobile account menu
 * toggle, the header search icon/panel (Phase 5), and auto-hiding
 * flash messages. Shop/product-page-specific behavior (filters,
 * sorting, gallery) lives in assets/js/shop.js.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initAccountMenu();
        initSearchToggle();
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

    // Header search icon (Phase 5): reveals a small search panel on
    // click, on both desktop and mobile (full-width via CSS at small
    // widths) - connects straight to shop.php via a plain GET form.
    function initSearchToggle() {
        var toggle = document.querySelector('[data-search-toggle]');
        var panel = document.getElementById('site-search-panel');
        if (!toggle || !panel) return;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.classList.toggle('open');
            if (panel.classList.contains('open')) {
                var input = panel.querySelector('input[name="search"]');
                if (input) input.focus();
            }
        });

        document.addEventListener('click', function (e) {
            if (!panel.contains(e.target) && e.target !== toggle) {
                panel.classList.remove('open');
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
