/**
 * Zarghoon Jewellers - Shop/Product JavaScript (Phase 5)
 *
 * Loaded on every public page (see includes/footer.php), but every
 * function here starts with an element-existence guard, so it is a
 * silent no-op on pages that don't have the relevant markup.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initFiltersDrawer();
        initSortSelect();
        initProductGallery();
    });

    // Mobile "Filters" button opens the filter panel as a slide-over
    // drawer with a dimmed overlay behind it; desktop shows the same
    // markup as a normal sidebar (see assets/css/style.css/responsive.css).
    function initFiltersDrawer() {
        var toggle = document.querySelector('[data-filters-toggle]');
        var panel = document.getElementById('shop-filters');
        var overlay = document.querySelector('.shop-filters-overlay');
        var closers = document.querySelectorAll('[data-filters-close]');
        if (!toggle || !panel) return;

        function openDrawer() {
            panel.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.classList.add('no-scroll');
        }

        function closeDrawer() {
            panel.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.classList.remove('no-scroll');
        }

        toggle.addEventListener('click', openDrawer);
        closers.forEach(function (el) {
            el.addEventListener('click', closeDrawer);
        });
    }

    // The "Sort By" dropdown navigates immediately on change, rewriting
    // only the "sort" query parameter (and dropping "page", since a
    // re-sorted list should start back at page 1) while preserving
    // every other active filter/search term already in the URL.
    function initSortSelect() {
        var select = document.querySelector('[data-sort-select]');
        if (!select) return;

        select.addEventListener('change', function () {
            var params = new URLSearchParams(window.location.search);
            params.set('sort', select.value);
            params.delete('page');
            window.location.search = params.toString();
        });
    }

    // Product gallery: clicking a thumbnail swaps the main image;
    // clicking the main image opens a lightweight full-screen preview
    // (no external lightbox library - just a positioned overlay).
    function initProductGallery() {
        var main = document.querySelector('[data-gallery-main]');
        var thumbs = document.querySelectorAll('[data-gallery-thumb]');
        if (!main) return;

        thumbs.forEach(function (thumb) {
            thumb.addEventListener('click', function () {
                main.src = thumb.getAttribute('data-full');
                thumbs.forEach(function (t) { t.classList.remove('active'); });
                thumb.classList.add('active');
            });
        });

        main.addEventListener('click', function () {
            var overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            var img = document.createElement('img');
            img.src = main.src;
            overlay.appendChild(img);
            overlay.addEventListener('click', function () { overlay.remove(); });
            document.body.appendChild(overlay);
        });
    }
})();
