# Zarghoon Jewellers

A full-featured gold jewellery e-commerce website for a real business
(Liaquat Bazar, Sarafa Market, Quetta, Pakistan), built as a series of
scoped phases on plain PHP 8 + MySQL — no framework, no build step, no
Composer dependencies.

For taking this to a live production server, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.
This file covers the project itself: what it is, how it's put together,
and how to run it locally.

---

## Technology

- **PHP 8** (procedural, no framework) — see DEPLOYMENT.md for the exact
  minimum version and required extensions.
- **MySQL / MariaDB** via PDO, prepared statements only, `utf8mb4`
  throughout.
- **Vanilla HTML/CSS/JS** for the storefront — no build tooling, no
  bundler, no npm dependency to install to run the site.
- **Apache** with `mod_rewrite`/`mod_headers` (`.htaccess`-driven clean
  URLs, security headers, and access control).

Nothing here needs `npm install`, `composer install`, or a build step —
clone it, point PHP + MySQL at it, and it runs.

---

## Folder Structure

```
├── index.php, shop.php, product.php, category.php, collections.php, ...   (public pages)
├── login.php, register.php, account.php, ...                              (customer account)
├── cart.php, checkout.php, orders.php, order.php, ...                     (cart/orders)
├── 404.php, 403.php, 500.php, maintenance.php
├── robots.php, sitemap.php                  (served as /robots.txt, /sitemap.xml)
├── setup-admin.php                          (one-time - delete after use, see DEPLOYMENT.md)
├── admin/                                   (admin panel, every page behind requireAdmin())
├── assets/css, assets/js                    (storefront + admin styling/behavior)
├── config/                                  (config.php, database.php, env.example.php)
├── cron/                                    (optional maintenance script, CLI only)
├── database/migrations/                     (phase4.sql ... phase10.sql, run in order)
├── database.sql                             (base schema + starter categories)
├── includes/                                (shared PHP: auth, CSRF, functions, layout)
└── uploads/                                 (product/category/collection/banner/logo images)
```

---

## Local Development Setup

1. Install PHP 8.1+ and MySQL/MariaDB locally.
2. Create a local database and import the schema in order:
   ```
   mysql -u root -e "CREATE DATABASE zarghoon_jewellers"
   mysql -u root zarghoon_jewellers < database.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase4.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase6.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase6b.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase7.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase9.sql
   mysql -u root zarghoon_jewellers < database/migrations/phase10.sql
   ```
3. No `config/env.php` is needed for local development — `config/config.php`
   and `config/database.php` already default to `localhost` / database
   `zarghoon_jewellers` / user `root` / no password, and `SITE_URL`
   defaults to `http://localhost:8000`. Override any of these with real
   environment variables (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`,
   `SITE_URL`) if your local setup differs, or create `config/env.php`
   (see `config/env.example.php`) the same way you would in production.
4. Start PHP's built-in server from the project root:
   ```
   php -S localhost:8000
   ```
5. Visit `http://localhost:8000/` — the homepage should load.
6. Visit `http://localhost:8000/setup-admin.php` to create your first
   admin account (there is no seeded default admin — see the Admin
   System section below).

---

## Admin System

- `admin/login.php` — session-based login with a 5-attempt / 60-second
  session-scoped lockout against brute-forcing (`includes/auth.php`).
- **No default admin account ships with the database.** Run
  `setup-admin.php` once (and delete it afterward — see DEPLOYMENT.md
  Section 5) to create the first `super_admin` account.
- Every `admin/*.php` page calls `requireAdmin()` and is wrapped by
  `includes/admin-header.php`, which enforces a 30-minute inactivity
  session timeout.
- **Admin > Activity Logs** — an audit trail of admin actions (product/
  category/collection/gold-rate/order-status/settings changes, admin
  login/logout), never storing a password or CSRF token.
- **Admin > System Health** — a live production-readiness dashboard
  (PHP version, extensions, database, upload permissions, HTTPS,
  configuration, shop settings completeness, gold rates, email, and
  maintenance-mode status), each check run for real, not assumed.

---

## Customer System

Registration/login by username or Pakistani mobile number (normalized to
one consistent `03XXXXXXXXX` format regardless of how it was typed —
`normalizeMobile()` in `includes/auth.php`), password reset via a
single-use, hashed, time-limited token (`password_resets` table — never
stored or emailed as plaintext), wishlist, order history, and guest
checkout (an order with no account is only ever viewable again by the
exact browser session that placed it, re-verified against the database on
every read — see `getViewableOrder()`/`canGuestAccessOrder()`).

---

## Product & Pricing System

Every product's price is computed by one single formula
(`calculateProductPrice()` in `includes/functions.php`):

```
Gold Value    = Net Weight × Gold Rate (for the product's purity)
Final Price   = Gold Value + Making Charges + Stone Charges + Other Charges − Discount
```

This runs fresh from the database on every page view and again, inside a
locked database transaction, at the moment of checkout — a price or
quantity submitted from the browser is never trusted or used directly.
A product can also be set to a flat manual price (`pricing_type =
'manual'`) instead of the auto gold-rate formula, per product.

## Gold Rates

Admin > Gold Rates always **inserts a new row** rather than updating an
existing one, so the full rate history is preserved — the site-wide
"current" rate for a purity is simply whichever row has the most recent
`effective_date`. There is no automatic market-rate fetching; the
business's own admin-entered rate is the sole source of truth (see
DEPLOYMENT.md Section 16 — never launch with the demo rates
`database.sql` seeds for local testing).

## Orders

Cart → Checkout → Order, with guest and registered checkout both
supported, POST-only mutations, CSRF on every step, a one-time
`checkout_token` preventing a resubmitted form from creating a duplicate
order, and a full status history (`order_status_history`) plus
admin-only internal notes on every order. If SMTP is configured (Admin >
Settings > Email), the customer and shop both receive an email when an
order is placed, and the customer receives one again when its status
changes — see DEPLOYMENT.md Section 10.

## CMS (Homepage Content)

Admin > Homepage controls which homepage sections are shown and in what
order (`homepage_sections` table); hero slides, "Why Zarghoon" features,
and the Instagram-style gallery are each their own admin-managed,
reorderable list. CMS text fields are always rendered as escaped plain
text, never raw HTML — there is no way to inject markup or scripts
through a CMS field.

---

## Security

- CSRF token required and verified on every state-changing POST
  (`includes/csrf.php`).
- Every database query uses PDO prepared statements
  (`PDO::ATTR_EMULATE_PREPARES => false`) — no raw SQL string
  interpolation of user input anywhere.
- Passwords hashed with `password_hash()`/`PASSWORD_DEFAULT`, never
  stored or logged in plaintext.
- IDOR-safe lookups throughout: a resource is fetched already scoped to
  its owner in one query (e.g. `WHERE id = ? AND user_id = ?`), so a
  non-owned or non-existent resource is indistinguishable and both
  return a plain 404.
- File uploads are content-sniffed (real MIME type via `finfo`, not the
  filename or browser-supplied header), dimension-capped, and always
  saved under a random filename with an extension taken only from the
  detected MIME type — never the original filename or extension.
- Session cookies: `HttpOnly` always, `Secure` automatically once HTTPS
  is detected, `SameSite=Lax`.
- `Content-Security-Policy` (nonce-based `script-src`) and
  `Permissions-Policy` headers on every PHP response
  (`config/config.php`); `X-Content-Type-Options`/`X-Frame-Options`/
  `Referrer-Policy` on every response including static assets
  (`.htaccess`).
- Session-scoped brute-force lockout on both customer and admin login.
- `config/`, `includes/`, `database/`, and `cron/` are blocked from
  direct HTTP access; `.git` and other dotfiles are blocked outright.

See `DEPLOYMENT.md` for what to verify on your specific hosting account
before launch, and the Phase 9 security audit (project history) for the
full findings/fixes record.

---

## Backups

Not automatic — see **DEPLOYMENT.md Section 13** for the manual
phpMyAdmin export / File Manager backup procedure, and Section 11 for
the one optional cron-based cleanup task (expired password-reset
tokens only — nothing else in the project depends on a cron job).

---

## Deployment

Full cPanel-oriented deployment instructions — database setup, the
`config/env.php` production configuration file, admin account creation,
file permissions, HTTPS, email, backups, cron, and a complete pre-launch
testing checklist — live in **[DEPLOYMENT.md](DEPLOYMENT.md)**. Nothing
in this repository has been deployed anywhere by writing this
documentation; it becomes live only once you carry those steps out on
your own hosting account.

## Troubleshooting

See **DEPLOYMENT.md Section 20** for common problems (database
connection errors, 500 errors, upload issues, clean URLs, HTTPS
redirect loops, missing PHP extensions, permission errors, email not
sending, admin login issues, gold rate display issues) and their fixes.
