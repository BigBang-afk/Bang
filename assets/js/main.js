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
        initHeroSlider();
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

    // Homepage hero slider (Phase 7): a plain, non-flashy autoplay
    // carousel - only runs when the homepage actually has more than one
    // active slide (a single slide renders statically with no controls,
    // see index.php). Autoplay pauses on hover/focus and resumes on
    // mouse leave, per the spec's "elegant, not flashy" requirement.
    function initHeroSlider() {
        var slider = document.querySelector('[data-hero-slider]');
        if (!slider) return;

        var slides = slider.querySelectorAll('[data-hero-slide]');
        var dots = slider.querySelectorAll('[data-hero-dot]');
        if (slides.length < 2) return;

        var current = 0;
        var autoplayMs = 6000;
        var timer = null;

        function show(index) {
            slides[current].classList.remove('active');
            if (dots[current]) dots[current].classList.remove('active');
            current = (index + slides.length) % slides.length;
            slides[current].classList.add('active');
            if (dots[current]) dots[current].classList.add('active');
        }

        function next() { show(current + 1); }
        function prev() { show(current - 1); }

        function startAutoplay() {
            stopAutoplay();
            timer = setInterval(next, autoplayMs);
        }
        function stopAutoplay() {
            if (timer) clearInterval(timer);
            timer = null;
        }

        var prevBtn = slider.querySelector('[data-hero-prev]');
        var nextBtn = slider.querySelector('[data-hero-next]');
        if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAutoplay(); });
        if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAutoplay(); });

        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () { show(i); startAutoplay(); });
        });

        slider.addEventListener('mouseenter', stopAutoplay);
        slider.addEventListener('mouseleave', startAutoplay);
        slider.addEventListener('focusin', stopAutoplay);
        slider.addEventListener('focusout', startAutoplay);

        startAutoplay();
    }
})();
