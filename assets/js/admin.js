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
    });

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
