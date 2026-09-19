# Zarghoon Jewellers — Final QA Report

**Phase 11: Final Master QA, Testing, Bug-Fix, Security, UX, Performance, and
Production-Readiness Pass**

This report documents an audit of the entire existing codebase (Phases
1–10), the real issues found, the fixes actually made, and — per this
phase's own explicit instruction — a clear line between what was
**verified** (run against a real local MySQL + PHP server) and what
**requires a manual test** on a real browser/device/hosting account,
which this environment cannot perform. Nothing below claims a test that
wasn't actually run.

---

## 1. Project Overview

Zarghoon Jewellers is a PHP 8 + MySQL gold jewellery e-commerce site
(Liaquat Bazar, Sarafa Market, Quetta, Pakistan), built across 10 prior
phases: schema/config, admin auth, catalog management, customer auth,
shop/cart/wishlist, checkout/orders, homepage CMS, luxury UI polish, SEO/
security hardening, and production deployment prep. This phase re-audits
that entire body of work rather than adding new features.

---

## 2. Tests Performed

**Static audit** (read/grep-based, covering every `.php` file in the
project): PHP syntax validity, debug/dev artifacts, SQL query
construction, CSRF/auth coverage, open-redirect safety, XSS escaping,
file-upload endpoint consistency, schema-vs-code column/table name
matching, dead code, and duplicated logic.

**Dynamic testing** (against a real, disposable local MariaDB 10.11 +
PHP 8.4 built-in server, seeded fresh from `database.sql` + all six
migrations, then torn down): the customer registration/login/checkout/
wishlist/order-history flow, the admin login/product/gold-rate/order-
status-change flow, the newly fixed WhatsApp links, the newly fixed cart
out-of-stock warning, SEO meta tags (`robots`, canonical, Open Graph,
Twitter Card) across both public and private pages, and the HSTS header's
conditional logic.

---

## 3. Security Checks

| Area | Result |
|---|---|
| CSRF on every state-changing POST | **PASS** — verified via script: every `admin/*.php` and root `*.php` file with a `REQUEST_METHOD === 'POST'` branch calls `requireCsrf()`. |
| SQL injection | **PASS** — every query reviewed uses PDO placeholders; every dynamic `ORDER BY`/`IN (...)` is built from a hardcoded whitelist or an `array_fill()`-generated placeholder list, never raw user input. |
| Admin authorization | **PASS** — every `admin/*.php` file (except `login.php`/`logout.php`) calls `requireAdmin()`. |
| IDOR protection | **PASS** (re-confirmed from Phase 9's design, not re-derived) — `getViewableOrder()`/`getCustomerOrder()` scope the query itself (`WHERE id = ? AND user_id = ?`), so a non-owned order is indistinguishable from a non-existent one. |
| Open redirects | **PASS** — every dynamic `redirect()` target (`add-to-cart.php`, `wishlist-toggle.php`, `newsletter-subscribe.php`, login) passes through `safeInternalPath()` first. |
| File upload security | **PASS** — `move_uploaded_file()` is called in exactly one place (`secureImageUpload()`), and every one of the 12 upload call sites across the admin panel routes through it; nothing bypasses it. |
| XSS escaping | **PASS**, with 2 low-severity consistency fixes applied (see Bugs Fixed) — every place that echoes database or user-supplied text uses `e()`; JSON-LD blocks are correctly JSON-encoded rather than HTML-escaped (a different, also-correct escaping context). |
| Security headers | **PASS** — CSP (nonce-based `script-src`), `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` were already in place from Phase 9; **HSTS added this phase**, sent only on an actual HTTPS request. |
| Default admin credentials | **PASS** (fixed in Phase 10, re-verified this phase) — a fresh `database.sql` import creates zero admin accounts. |

---

## 4. Authentication Checks

Verified by reading `includes/auth.php` and `includes/csrf.php` (unchanged
this phase, no bugs found): `password_hash()`/`password_verify()`,
`session_regenerate_id(true)` on both customer and admin login (prevents
session fixation), `HttpOnly` always, `Secure` auto-detected from the
request, `SameSite=Lax`, session-scoped brute-force lockout (5 attempts /
60 seconds) tracked under separate session keys for customers vs. admins,
single-use SHA-256-hashed password reset tokens with an expiry.

**Verified live this phase:** registration with a duplicate username/
mobile is rejected with a clear message (code-reviewed — `dbFetchColumn`
uniqueness checks in `register.php`); a fresh registration → login →
account page round-trip completed successfully end-to-end.

**MANUAL TEST REQUIRED:** the full negative-path matrix (weak password,
password mismatch, expired reset token, already-used reset token,
inactive account login) was code-reviewed for correct logic but not every
single branch was individually exercised with a live request in this
session — the underlying functions are unchanged from Phase 4/9 and were
exercised there.

---

## 5. Product Management Checks

Verified live: creating a product through the real admin form (all
fields, including `category_id`/`collection_id` submitted exactly as the
HTML form sends them) succeeds with **zero PHP warnings** after this
phase's fix (see Bugs Fixed #1). Verified statically: SKU uniqueness
check, slug uniqueness (`generateSlug()`'s `-2`/`-3` suffixing), price
fields validated via `FILTER_VALIDATE_FLOAT` and rejected if negative,
`net_weight > gross_weight` rejected, image upload MIME-sniffed via
`finfo`, oversized images rejected by both byte size and pixel dimension,
random filenames only.

---

## 6. Gold Rate + Price Engine Checks

Confirmed via schema review: **every monetary column uses `DECIMAL`, zero
`FLOAT`/`DOUBLE` columns anywhere in the schema** (checked with a
project-wide grep). `calculateProductPrice()` implements exactly:

```
Gold Value  = Net Weight × Gold Rate
Final Price = Gold Value + Making + Stone + Other − Discount
```

`gold_rates` is insert-only (never `UPDATE`), so rate history is
preserved and "current" is always "most recent `effective_date`".
`order_items` stores its own `unit_price`/`total_price`/`net_weight`/
`purity` snapshot independent of the live `products` row (`product_id` is
nullable with `ON DELETE SET NULL`), so a later gold-rate change or even
a product deletion can never alter a historical order's recorded price —
confirmed by schema inspection, and this exact behavior was the whole
point of Phase 6's design.

**MANUAL TEST REQUIRED:** literally changing a gold rate after placing a
test order and re-viewing that order to visually confirm the price didn't
move — the schema/code guarantees this, but a live before/after
screenshot comparison wasn't captured in this session.

---

## 7. Shop Checks

Verified statically: search matches name/SKU/category name/collection
name via parameterized `LIKE`, filters (category/collection/purity/price
range/weight range/stock status) are all either whitelist-checked or
type-coerced before use, sort is a hardcoded `[key => SQL fragment]`
lookup table (6 options), pagination defaults to `ITEMS_PER_PAGE = 20`.
No string concatenation of request input into SQL found anywhere in
`getProducts()`/`buildShopFilters()`.

**Verified live:** shop listing, a category page, and a product detail
page all load without errors against real seeded data.

---

## 8. Cart Checks

**Bug found and fixed** (see Bugs Fixed #3): a product that went
out-of-stock *after* being added to a cart previously showed no warning
until the very end of the checkout form. Cart totals are always
recomputed from the database (`getCartDetails()`), quantity is always
clamped `1..CART_MAX_QUANTITY_PER_ITEM`, and a deactivated product is
silently dropped from the cart automatically. Confirmed live: adding an
out-of-stock product via `add-to-cart.php` is rejected outright; a
product that *becomes* out-of-stock while already in the cart now shows
an "Out of Stock" badge and a disabled checkout button.

---

## 9. Checkout Checks

`checkout.php`'s order creation already ran inside `dbTransaction()`,
re-fetching every product `FOR UPDATE` and recalculating its price
server-side, before this phase — confirmed unchanged and correct. Placing
a full test order live produced a real order, real order_items rows, a
status-history row, and cleared the cart, all in one pass. Deliberately
resubmitting an out-of-stock cart to `checkout.php` directly (bypassing
the new cart-page warning) was rejected server-side with **zero** new
order rows created — confirmed by row count before/after.

---

## 10. Order Management Checks

**Bug found and fixed** (see Bugs Fixed #2): the admin's "Confirm via
WhatsApp" button opened a chat to the **shop's own** WhatsApp number
instead of the customer's. Verified live, before and after: the
customer-facing WhatsApp buttons (`order.php`, `order-success.php`,
`contact.php`) correctly still target the shop's number; the admin's
button now correctly targets the customer's own mobile number, converted
from the stored `03XXXXXXXXX` format to the `92XXXXXXXXXX` format
`wa.me` requires.

Order status options exactly match the schema's `ENUM` (`pending`,
`confirmed`, `processing`, `ready`, `completed`, `cancelled`) — both
`getOrderStatusOptions()` and `database.sql`'s column definition were
diffed and match exactly.

---

## 11. CMS Checks

Unchanged this phase; re-confirmed by reading `isHomepageSectionActive()`
and each admin CMS page's status filter that a disabled section/hero
slide/feature/gallery tile is excluded from the public query itself
(`WHERE status = "active"`), not just hidden by CSS — so a disabled item
can never leak onto the live homepage.

---

## 12. Responsive Checks

**MANUAL TEST REQUIRED.** This environment has no real browser to render
and screenshot the site at the requested breakpoints (360/390/414/480/
768/1024/1280/1440/1920px). The CSS itself was reviewed for the relevant
media queries (Phase 8's responsive.css breakpoints exist at the expected
widths), but visually confirming no horizontal scroll, working hamburger
menu, and touch-friendly buttons at each width requires a real device or
browser DevTools session — not claimed as tested here.

---

## 13. SEO Checks

**Bug found and fixed** (see Bugs Fixed #4): private/account pages
(`login.php`, `register.php`, `cart.php`, `checkout.php`, `account.php`,
`account-edit.php`, `account-password.php`, `orders.php`, `order.php`,
`order-success.php`, `wishlist.php`, `forgot-password.php`,
`reset-password.php`) had no `<meta name="robots">` tag at all. They were
already excluded via `robots.txt`, but a meta tag is a second,
independent layer that still applies even to a crawler that doesn't
respect `robots.txt`. Verified live: all 13 pages now render
`noindex, nofollow`; every normal public page (home, shop, about, ...)
correctly renders `index, follow`.

Also added this phase: Twitter Card meta tags (previously only Open
Graph existed) and an explicit `og:url`. Canonical URLs, Product JSON-LD,
BreadcrumbList JSON-LD, Organization JSON-LD, `sitemap.xml`, and
`robots.txt` were all already correct from Phase 9 and re-verified live.

---

## 14. Performance Checks

**Bug found and fixed** (see Bugs Fixed #5): the homepage, the wishlist
page, and each product page's related/recently-viewed sections each ran
one extra database query *per product card* to fetch its image (an N+1
pattern), because only the shop/category/collection listing page
(`includes/shop-listing.php`) had a bulk-fetch already. A homepage with 3
sections of 8 products each was running up to 24 extra queries on every
load. Extracted the existing bulk-fetch logic into a shared
`bulkFetchProductImages()` helper and applied it to `index.php`,
`wishlist.php`, and `product.php` — each now issues exactly one extra
query regardless of how many product cards it renders. Verified live: all
three pages still render correctly (product names/images/prices all
present) with zero PHP errors after the change.

**MANUAL TEST REQUIRED:** an actual Lighthouse/PageSpeed run, real image
compression audit, and font-loading waterfall — this environment can
verify query counts and correctness, not measured page-load timing.

---

## 15. Accessibility Checks

Verified statically: every `<img>` tag in the codebase has an `alt`
attribute (checked via a project-wide grep, zero missing), every form
input has an associated `<label for="...">`, `:focus-visible` styles and
a skip-link exist in `assets/css/style.css`, `prefers-reduced-motion` is
respected both in CSS (collapses transition durations) and in JS
(`initScrollReveal()` skips the observer and reveals content immediately).

**MANUAL TEST REQUIRED:** an actual screen-reader pass and a keyboard-only
click-through of the mobile menu/modals — not performable without a
real browser/assistive-technology session.

---

## 16. Bugs Discovered

1. **[Correctness]** `admin/product-add.php` and `admin/product-edit.php`
   read `$_POST['category_id']`/`$_POST['collection_id']` without a
   null-coalesce, producing a PHP 8 "Undefined array key" warning (which
   also leaks the server's absolute file path in the warning text when
   `APP_DEBUG` is on) on any POST missing that key.
2. **[Functional bug, customer-facing]** The admin's "Confirm via
   WhatsApp" button on `admin/order-view.php` opened a chat to the shop's
   own configured WhatsApp number instead of the customer's — the
   opposite of its intended purpose, because it reused the same function
   the *customer*-facing "Contact Us on WhatsApp" buttons use, which
   correctly targets the shop.
3. **[UX/functional]** A product that went out-of-stock after being added
   to a cart gave no warning until the customer had filled in their
   entire checkout form and clicked "Place Order" — an all-or-nothing
   failure with no earlier warning.
4. **[SEO]** 13 private/account pages had no `noindex` meta tag (relied
   solely on `robots.txt`).
5. **[Performance]** N+1 product-image queries on the homepage, wishlist
   page, and product detail page's related/recently-viewed sections.
6. **[Consistency, not exploitable]** Two `<option>` labels
   (`admin/_product-form.php`, `admin/products.php`) were echoed without
   `e()`. Not actually exploitable — both values come from a hardcoded
   PHP array, never user input — but inconsistent with the rest of the
   codebase's output-encoding discipline.
7. **[Missing header]** No `Strict-Transport-Security` header anywhere.
8. **[Dead schema, harmless]** The `banners` table (from the original
   Phase 1 schema) is never referenced by any PHP file — Phase 7's
   `homepage_hero_slides` superseded it, but the old table was never
   removed from `database.sql`. Not fixed (see Bugs NOT Fixed below).

## 17. Bugs Fixed

| # | Problem | Root Cause | Fix | Files Changed |
|---|---|---|---|---|
| 1 | PHP warning on product save | Missing `?? ''` before comparing `$_POST['category_id']`/`['collection_id']` to `''` | Added the null-coalesce | `admin/product-add.php`, `admin/product-edit.php` |
| 2 | Admin WhatsApp button messaged the wrong party | One shared function used for two opposite-direction use cases (customer→shop and admin→customer) | Split into `buildOrderWhatsAppLink()` (shop-directed, customer pages) and a new `buildAdminOrderWhatsAppLink()` (customer-directed, admin page), converting the stored local mobile format to international | `includes/whatsapp.php`, `admin/order-view.php` |
| 3 | Out-of-stock cart items surfaced no warning until checkout | `getCartDetails()` only filtered deactivated products, not out-of-stock ones | Added a stock-status badge per cart row and disabled the "Proceed to Checkout" button (styled span, not a real link) whenever any item is unavailable; checkout.php's existing server-side rejection remains the authoritative safety net | `cart.php` |
| 4 | Private pages indexable | No `<meta name="robots">` on 13 pages | Added a `$pageRobots` override (defaults to `index, follow`) rendered by `includes/header.php`; set to `noindex, nofollow` on all 13 | `includes/header.php` + 13 page files |
| 5 | N+1 image queries | Only the shop listing page bulk-fetched product images; homepage/wishlist/product-detail each fell back to one query per card | Extracted a shared `bulkFetchProductImages()` helper, used it in all four listing contexts | `includes/functions.php`, `includes/shop-listing.php`, `index.php`, `wishlist.php`, `product.php` |
| 6 | Inconsistent output encoding | Two `<option>` labels not wrapped in `e()` | Wrapped both in `e()` | `admin/_product-form.php`, `admin/products.php` |
| 7 | No HSTS | Never added | Added, sent only when the current request is actually HTTPS (recomputed independently of the session bootstrap's HTTPS check) | `config/config.php` |

## 18. Bugs Found But NOT Fixed (and why)

- **The orphaned `banners` table** — dropping it would be an unnecessary,
  slightly risky schema change for zero functional benefit (nothing reads
  or writes it; its presence causes no bug). Left in place; documented
  here so it isn't mistaken for something still in use.
- **`cart_items`/`order_notes` naming** — this Phase 11 QA brief's
  expected-table list names `cart_items` and `order_notes`; the actual
  implementation uses a session-based cart (no `cart_items` table, chosen
  specifically to support guest checkout without a persistent row) and a
  table named `order_admin_notes`. Both are intentional Phase 1/6
  architectural choices, not bugs — renamed nothing, since doing so would
  be "silently changing the schema" for a naming preference, not a fix.

---

## 19. Remaining Manual Checks

The following require a real browser, a real device, or a real hosting
account, and were **not** performed in this sandboxed environment:

- [ ] Full responsive check at 360/390/414/480/768/1024/1280/1440/1920px
- [ ] Full keyboard-only and screen-reader accessibility pass
- [ ] Real Lighthouse/PageSpeed performance measurement
- [ ] Cross-browser check (Safari, Firefox, mobile Chrome/Safari)
- [ ] Real SMTP send against a live mailbox with STARTTLS + AUTH LOGIN
      (the plain-SMTP path was tested live in Phase 10; the encrypted/
      authenticated path was written to spec but not run against a real
      mail server)
- [ ] A live HTTPS certificate and the HSTS header served over real TLS
- [ ] Visual regression check of the luxury design system (colors,
      typography, spacing) — this phase changed no CSS or visual markup

---

## 20. Production Deployment Checklist

See **`docs/PRODUCTION-CHECKLIST.md`** for the full launch checklist, and
**`DEPLOYMENT.md`** for the complete cPanel deployment walkthrough
(already written in Phase 10, unchanged by this phase's fixes except
where noted).
