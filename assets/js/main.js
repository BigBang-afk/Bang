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
        initHeaderScroll();
        initQuickView();
        initModals();
        initScrollReveal();
    });

    // Phase 8: the header/hamburger menu is now a real slide-in drawer
    // with its own overlay and close button (not a dropdown), and locks
    // body scroll while open so the page behind it can't scroll.
    function initAccountMenu() {
        var toggle = document.querySelector('[data-account-menu-toggle]');
        var menu = document.getElementById('site-account-menu');
        var overlay = document.querySelector('.site-account-menu-overlay');
        if (!toggle || !menu) return;

        function open() {
            menu.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.classList.add('no-scroll');
            toggle.setAttribute('aria-expanded', 'true');
        }

        function close() {
            menu.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.classList.remove('no-scroll');
            toggle.setAttribute('aria-expanded', 'false');
        }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            if (menu.classList.contains('open')) { close(); } else { open(); }
        });

        document.querySelectorAll('[data-account-menu-close]').forEach(function (el) {
            el.addEventListener('click', close);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('open')) close();
        });
    }

    // Phase 8: a subtle shadow + tighter padding once the page scrolls
    // past a small threshold - purely a class toggle, all the actual
    // visual change lives in CSS (.site-header.is-scrolled).
    function initHeaderScroll() {
        var header = document.querySelector('.site-header');
        if (!header) return;

        function update() {
            if (window.scrollY > 12) {
                header.classList.add('is-scrolled');
            } else {
                header.classList.remove('is-scrolled');
            }
        }

        update();
        window.addEventListener('scroll', update, { passive: true });
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

    // Phase 8: server-rendered flash messages (still produced by the
    // existing PRG/flash() flow - nothing about how they're generated
    // changes) are now presented as a stacked corner toast rather than a
    // full-width inline banner. A message with an action link (e.g.
    // "Added to your bag. View Cart") is left in place inline instead of
    // being toasted, since a toast that auto-dismisses in 5s is a poor
    // home for a link the visitor might want to click.
    function initAutoHideAlerts() {
        var stack = document.getElementById('toast-stack');

        document.querySelectorAll('.alert').forEach(function (el) {
            var hasAction = !!el.querySelector('.alert-action');
            if (!stack || hasAction) {
                if (el.hasAttribute('data-autohide')) {
                    setTimeout(function () {
                        el.style.transition = 'opacity .4s ease';
                        el.style.opacity = '0';
                        setTimeout(function () { el.remove(); }, 400);
                    }, 5000);
                }
                return;
            }

            var wrapper = el.closest('.container') || el;
            var type = 'info';
            ['success', 'error', 'info'].forEach(function (t) {
                if (el.classList.contains('alert-' + t)) type = t;
            });

            el.classList.add('toast', 'toast-' + type);
            stack.appendChild(el);
            wrapper.parentNode && wrapper !== el && wrapper.remove();

            setTimeout(function () {
                el.classList.add('toast-hide');
                setTimeout(function () { el.remove(); }, 220);
            }, 4500);
        });
    }

    // Phase 8: Quick View - reads the data-* attributes already present
    // on the clicked product card (see includes/product-card.php) and
    // populates the shared modal declared once in includes/footer.php.
    // No AJAX endpoint needed: everything shown is already public data
    // already rendered on the page the button lives on.
    function initQuickView() {
        var modal = document.getElementById('quickview-modal');
        if (!modal) return;

        document.querySelectorAll('[data-quickview]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = btn.dataset;
                setText('quickview-name', d.name);
                setText('quickview-meta', d.purity + ' Gold • ' + d.weight);
                setText('quickview-price', d.price);
                setText('quickview-stock', d.stock);

                var stockEl = document.getElementById('quickview-stock');
                if (stockEl) stockEl.className = 'stock-badge stock-' + (d.inStock === '1' ? 'in_stock' : 'out_of_stock');

                var img = document.getElementById('quickview-image');
                if (img) { img.src = d.image || ''; img.alt = d.name || ''; }

                var productIdInput = document.getElementById('quickview-product-id');
                if (productIdInput) productIdInput.value = d.productId || '';

                var addBtn = document.getElementById('quickview-add-btn');
                if (addBtn) addBtn.disabled = d.inStock !== '1';

                var link = document.getElementById('quickview-link');
                if (link) link.href = d.url || '#';

                openModal(modal);
            });
        });
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value || '';
    }

    // Generic modal open/close plumbing shared by Quick View and any
    // future modal that reuses the same .modal-overlay/.modal-panel
    // markup - handles the overlay click, the close button, and ESC.
    function initModals() {
        document.querySelectorAll('.modal-overlay').forEach(function (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal(modal);
            });
            modal.querySelectorAll('[data-modal-close]').forEach(function (btn) {
                btn.addEventListener('click', function () { closeModal(modal); });
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
        });
    }

    function openModal(modal) {
        modal.classList.add('open');
        document.body.classList.add('no-scroll');
        var closeBtn = modal.querySelector('[data-modal-close]');
        if (closeBtn) closeBtn.focus();
    }

    function closeModal(modal) {
        modal.classList.remove('open');
        document.body.classList.remove('no-scroll');
    }

    // Phase 8: sections fade/slide into view once, via IntersectionObserver
    // rather than a scroll-position calculation - cheap, and does nothing
    // if the browser doesn't support it (elements are visible by default).
    function initScrollReveal() {
        var targets = document.querySelectorAll('[data-reveal]');
        if (!targets.length) return;

        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            targets.forEach(function (el) { el.classList.add('reveal', 'is-visible'); });
            return;
        }

        targets.forEach(function (el) { el.classList.add('reveal'); });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

        targets.forEach(function (el) { observer.observe(el); });

        // Safety net: content must never stay invisible indefinitely - an
        // extremely fast scroll/jump (e.g. Page Down, a deep-link with a
        // hash, or an automated tool) could in principle skip past a
        // section's viewport-crossing before the observer registers it.
        // If anything is still hidden a few seconds after load, reveal it
        // outright rather than leave it permanently blank.
        setTimeout(function () {
            document.querySelectorAll('.reveal:not(.is-visible)').forEach(function (el) {
                el.classList.add('is-visible');
            });
        }, 4000);
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
