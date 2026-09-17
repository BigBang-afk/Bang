/* Zarghoon Jewellers - storefront interactions */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initStickyHeader();
        initMobileNav();
        initSearchPanel();
        initRevealAnimations();
        initWishlistButtons();
        initQuantityInputs();
        initAddToCart();
        initFlashAutoHide();
    });

    function initStickyHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var onScroll = function () {
            if (window.scrollY > 12) {
                header.classList.add('is-stuck');
            } else {
                header.classList.remove('is-stuck');
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    function initMobileNav() {
        var toggle = document.querySelector('.hamburger');
        var nav = document.querySelector('.mobile-nav');
        var close = document.querySelector('.mobile-nav-close');
        if (!toggle || !nav) return;
        toggle.addEventListener('click', function () { nav.classList.add('open'); });
        if (close) close.addEventListener('click', function () { nav.classList.remove('open'); });
    }

    function initSearchPanel() {
        var toggle = document.querySelector('.search-toggle');
        var panel = document.querySelector('.search-panel');
        if (!toggle || !panel) return;
        toggle.addEventListener('click', function () {
            panel.classList.toggle('open');
            if (panel.classList.contains('open')) {
                var input = panel.querySelector('input');
                if (input) input.focus();
            }
        });
    }

    function initRevealAnimations() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('in-view'); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        items.forEach(function (el) { observer.observe(el); });
    }

    function csrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function initWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var productId = btn.getAttribute('data-product-id');
                if (!productId) return;

                fetch((window.BASE_URL || '') + '/ajax/toggle_wishlist.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'product_id=' + encodeURIComponent(productId) + '&csrf_token=' + encodeURIComponent(csrfToken())
                })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data.status === 'auth_required') {
                            window.location.href = (window.BASE_URL || '') + '/login.php';
                            return;
                        }
                        if (data.status === 'ok') {
                            btn.classList.toggle('active', data.action === 'added');
                            var badge = document.querySelector('.wishlist-count-badge');
                            if (badge) badge.textContent = data.count;
                        }
                    })
                    .catch(function () {});
            });
        });
    }

    function initQuantityInputs() {
        document.querySelectorAll('.qty-stepper').forEach(function (stepper) {
            var input = stepper.querySelector('input');
            stepper.querySelectorAll('button').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var step = parseInt(btn.getAttribute('data-step'), 10);
                    var current = parseInt(input.value, 10) || 1;
                    var next = Math.max(1, current + step);
                    input.value = next;
                    input.dispatchEvent(new Event('change'));
                });
            });
        });
    }

    function initAddToCart() {
        document.querySelectorAll('.add-to-cart-form').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                var isAjax = form.getAttribute('data-ajax') === '1';
                if (!isAjax) return;
                e.preventDefault();
                var formData = new FormData(form);
                fetch((window.BASE_URL || '') + '/ajax/add_to_cart.php', {
                    method: 'POST',
                    body: formData
                })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data.status === 'ok') {
                            var badge = document.querySelector('.cart-count-badge');
                            if (badge) badge.textContent = data.count;
                            showToast('Added to cart');
                        } else if (data.message) {
                            showToast(data.message);
                        }
                    })
                    .catch(function () {});
            });
        });
    }

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'zj-toast';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:12px 22px;border-radius:4px;z-index:2000;font-size:.85rem;letter-spacing:.03em;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transition:opacity .3s ease;';
        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.style.opacity = '1'; });
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { toast.remove(); }, 300);
        }, 2200);
    }

    function initFlashAutoHide() {
        document.querySelectorAll('.alert[data-autohide]').forEach(function (el) {
            setTimeout(function () {
                el.style.transition = 'opacity .4s ease';
                el.style.opacity = '0';
                setTimeout(function () { el.remove(); }, 400);
            }, 4500);
        });
    }
})();
