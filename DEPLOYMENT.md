# Zarghoon Jewellers — Deployment Guide

This guide covers taking the application from this repository to a live,
production website on typical shared/cPanel hosting. It assumes no
particular hosting company — replace `YOUR-DOMAIN.com`, cPanel usernames,
and file paths with your host's actual values throughout.

**Nothing in this guide has been run against a real hosting account by
Claude.** Everything here was written from, and verified against, a local
MySQL + PHP test environment during development (see "What Was Actually
Tested" in each section). The site is only actually deployed once you
carry these steps out on your own hosting account.

---

## 1. Requirements

**PHP:** 8.1 or newer (8.2+ preferred). The codebase uses only PHP
8.1-compatible syntax — no PHP 8.2+-only features are used, so 8.1 is a
safe minimum.

**Required PHP extensions** (only extensions the application actually
uses — verified by searching the codebase, not assumed):

| Extension | Used for |
|---|---|
| `pdo` + `pdo_mysql` | All database access (`config/database.php`) |
| `mbstring` | `mb_strlen()`/`mb_substr()` on names, descriptions, messages |
| `fileinfo` | Real MIME-type sniffing on every image upload (`secureImageUpload()`) |
| `json` | Settings, JSON-LD structured data, activity log filters |
| `openssl` | HTTPS support and SMTP STARTTLS/SSL in `includes/mailer.php` |
| `session` | Customer and admin login sessions |

`gd` is **not** required — the application never resizes or re-encodes
images (uploads are validated and stored as-is), so it isn't listed even
though many PHP app checklists default to including it.

Check what your host has with `admin/system-health.php` after upload (see
Section 4), or ask your host's support / cPanel's "MultiPHP Manager".

**MySQL / MariaDB:** 5.7+ / MariaDB 10.2+ (anything supporting
`utf8mb4` and standard `InnoDB` foreign keys — practically any current
cPanel host). The schema already uses `utf8mb4` with `utf8mb4_unicode_ci`-
compatible default collation throughout `database.sql`.

**Apache with `mod_rewrite` and `mod_headers`.** The project relies on
`.htaccess` for clean product/category/collection URLs, blocking direct
access to `config/`/`includes/`/`database/`/`cron/`, dynamic
`robots.txt`/`sitemap.xml`, and error pages. Nginx is not covered by this
guide — the `.htaccess` rules would need to be translated to Nginx
`location` blocks, which is out of scope here since cPanel/shared hosting
is overwhelmingly Apache.

---

## 2. Final Project Structure

```
zarghoon-jewellers/
├── index.php, shop.php, product.php, category.php, collections.php,
│   about.php, contact.php, faq.php, privacy-policy.php,
│   shipping-returns.php, terms.php
├── login.php, register.php, logout.php, forgot-password.php,
│   reset-password.php, account.php, account-edit.php, account-password.php
├── wishlist.php, wishlist-toggle.php, cart.php, add-to-cart.php,
│   checkout.php, orders.php, order.php, order-success.php, order-print.php
├── 404.php, 403.php, 500.php, maintenance.php
├── robots.php, sitemap.php (served as /robots.txt and /sitemap.xml via .htaccess)
├── setup-admin.php   <-- DELETE after first use, see Section 5
├── .htaccess, database.sql
├── admin/            (admin panel - protected by requireAdmin() on every page)
├── assets/           (css/js, publicly served)
├── config/           (config.php, database.php, env.example.php - env.php is NOT committed)
├── cron/             (cleanup-expired-tokens.php - CLI only, blocked from HTTP)
├── database/migrations/  (phase4.sql ... phase10.sql, run in order after database.sql)
├── includes/         (shared PHP - never directly URL-accessible)
└── uploads/          (products/, categories/, collections/, banners/, logo/, favicon/, gallery/)
```

Note on the legal-page filenames: the Phase 9/10 specs used
`privacy.php`/`shipping.php`/`returns.php`; this project already built
and linked `privacy-policy.php`/`shipping-returns.php` from Phase 8
onward, and those are the real, live files — no duplicate pages were
created under the alternate names.

**Never upload:** anything under a `.git/` folder (already blocked by
`.htaccess` even if it is uploaded), `config/env.php` (never commit it —
recreate it directly on the server), `.dev_env.sh`, or any `*.sql`/`*.bak`
export sitting loose in your local project folder.

---

## 3. Database Installation (cPanel)

cPanel almost always prefixes both your database name and username with
your cPanel account name — if your account is `zarghoon`, a database you
name `jewellers` becomes `zarghoon_jewellers` automatically, and a user
`zjadmin` becomes `zarghoon_zjadmin`. **Copy the exact names cPanel shows
you** into `config/env.php` — do not assume the database is literally
called `zarghoon_jewellers`.

1. Log in to cPanel.
2. Open **MySQL® Databases**.
3. Under "Create New Database", enter a name (e.g. `jewellers`) and
   create it. Note the full prefixed name cPanel shows you.
4. Under "MySQL Users → Add New User", create a user with a strong,
   randomly generated password (don't reuse a password from anywhere
   else). Note the full prefixed username.
5. Under "Add User To Database", select the user and database you just
   created, click Add, and on the privileges screen check **All
   Privileges**, then Make Changes.
6. Open **phpMyAdmin** (also in cPanel).
7. Select your new database from the left sidebar.
8. Click **Import**, choose `database.sql` from this project, and run
   the import.
9. Still in Import, run each file in `database/migrations/` **in order**:
   `phase4.sql`, `phase6.sql`, `phase6b.sql`, `phase7.sql`, `phase9.sql`,
   `phase10.sql`. Each is written to be safe to run once, in order, on
   top of the base schema (they use `CREATE TABLE IF NOT EXISTS`,
   `INSERT IGNORE`, or additive `ALTER`/`MODIFY` statements — never a
   destructive `DROP`).
10. Put the real host/name/user/password into `config/env.php` — see
    Section 4.

**What was actually tested:** this exact sequence (`database.sql` then
all five migration files, in order) was run against a real local
MariaDB 10.11 instance during this phase and confirmed to complete
without errors, with the expected tables and zero seeded admin rows
(see Section 5). It has not been run against cPanel's specific
phpMyAdmin/MySQL version — the sequence is standard SQL and should not
behave differently there, but that combination itself wasn't tested here.

---

## 4. Production Configuration

Real per-environment values (`APP_ENV`, `SITE_URL`, database credentials)
belong in **`config/env.php`** — a file that is:

- **Never committed to git** (already in `.gitignore`).
- **Blocked from direct HTTP access** by the root `.htaccess`'s
  `config|includes|database|cron` rewrite rule, so even a browser request
  for `https://yourdomain.com/config/env.php` gets refused by Apache.

**Setup:**

1. In cPanel File Manager (or via SFTP), copy `config/env.example.php` to
   `config/env.php`.
2. Edit `config/env.php` and fill in your real values:

```php
define('APP_ENV', 'production');
define('SITE_URL', 'https://YOUR-DOMAIN.com'); // no trailing slash
define('DB_HOST', 'localhost');
define('DB_NAME', 'cpaneluser_jewellers');     // your REAL prefixed name
define('DB_USER', 'cpaneluser_zjadmin');       // your REAL prefixed name
define('DB_PASS', 'the-strong-password-you-generated');
```

`APP_DEBUG` does not need to be set — it's derived automatically from
`APP_ENV` (`production` → off, anything else → on), so production is
debug-off by default the moment `APP_ENV` is set, with no separate flag
to remember.

Local development needs **no `config/env.php` at all** — without one,
`config/config.php` and `config/database.php` fall back to the same
local defaults they always have, so cloning this repo fresh keeps working
exactly as before.

### Configuration checklist

Verify each of these before launch (Admin > Settings unless noted):

- [ ] Database host / name / user / password (`config/env.php`)
- [ ] `SITE_URL` (`config/env.php`) — your real domain, `https://`, no trailing slash
- [ ] Shop Name
- [ ] Currency / Currency Symbol
- [ ] WhatsApp Number
- [ ] Phone
- [ ] Email
- [ ] Address
- [ ] Timezone — already hardcoded to `Asia/Karachi` in `config/config.php`
      (`date_default_timezone_set('Asia/Karachi')`), used consistently for
      every timestamp: orders, gold rate `effective_date`, admin activity
      logs, `created_at`/`updated_at` columns. Do not rely on the server's
      own default timezone — this call overrides it regardless of hosting.

`admin/system-health.php` checks most of this automatically once you're
logged in — see Section 12.

---

## 5. Admin Account Setup

**Earlier phases shipped a seeded admin account with a fixed password
documented directly in `database.sql`.** That has been removed — as of
this phase, importing `database.sql` creates **zero** admin accounts.
This is a deliberate security fix: a committed, publicly-documented
default password is a real risk on any store that goes live without
changing it, and simply picking a new fixed password would only recreate
the same problem later.

**To create your first administrator:**

1. After importing the database (Section 3), visit
   `https://YOUR-DOMAIN.com/setup-admin.php` in a browser.
2. Fill in your name, a real username, a real email, and a strong
   password (minimum 8 characters, enforced server-side).
3. Submit. You'll see a confirmation and a link to Admin Login.
4. **Immediately delete `setup-admin.php` from your server** (cPanel File
   Manager → select the file → Delete). The script already refuses to run
   again once one admin account exists, but leaving it on the server is
   an unnecessary standing risk, not a convenience.

There is currently no in-app UI to create a *second* admin account later
— only the single first-run script above. If your store needs multiple
admin logins, that's a small follow-up feature to request separately
(deliberately out of scope here — this phase is deployment prep, not new
development), and in the meantime a direct database insert (with a
`password_hash()`-generated hash, never a plaintext column value) is the
only way.

**What was actually tested:** the full flow above — empty `admins` table
→ `setup-admin.php` creates one real account → the script immediately
refuses a second submission — was run end-to-end against a local test
database and confirmed working.

---

## 6. Upload Directories & Permissions

The application writes to:

```
uploads/products/
uploads/categories/
uploads/collections/
uploads/banners/
uploads/logo/
uploads/favicon/
uploads/gallery/
```

`secureImageUpload()` (in `includes/functions.php`) automatically creates
any of these that don't exist yet (`mkdir(..., 0755, true)`) the first
time something is uploaded to it, and sets `chmod 0644` on every uploaded
file. You do not need to pre-create them.

**Do not `chmod 777` anything.** On typical cPanel/shared hosting where
PHP runs as your own account (via `suPHP`/`suexec`/`php-fpm` under your
user, which is the cPanel default), `755` on the `uploads/` directories
is sufficient for PHP to write into them, because PHP is running *as
your own user*, not a separate `www-data` account. Only if your specific
host runs PHP as a genuinely different system user (rare on cPanel, more
common on some VPS/Nginx setups) would `775` with the correct group
ownership be needed instead — check with your host rather than reaching
for `777`, which makes every uploaded file directory world-writable,
including by any other account on a shared server.

`admin/system-health.php` reports the real, current `is_writable()`
status of every one of these directories — check it after upload rather
than guessing.

---

## 7. Upload Directory Security

`uploads/.htaccess` (already in the repo, verify it made it into your
upload) disables PHP execution inside `uploads/` entirely:

```apache
<IfModule mod_php7.c>
    php_flag engine off
</IfModule>
<IfModule mod_php8.c>
    php_flag engine off
</IfModule>
<FilesMatch "\.(php|php\d?|phtml|pl|py|cgi|asp|aspx|sh|exe)$">
    Require all denied
</FilesMatch>
Options -ExecCGI
AddHandler cgi-script .php .php3 .php4 .php5 .php7 .phtml .pl .py .cgi .asp .aspx .sh .exe
Options -Indexes
```

Combined with `secureImageUpload()` never trusting the original filename
or its extension (it always generates a random name with an extension
taken only from the real, sniffed MIME type — see `includes/functions.php`),
a malicious upload can never execute as PHP even if someone found a way
to upload a `.php` file with an image's `Content-Type` header. `.jpg`,
`.jpeg`, `.png`, and `.webp` are never blocked — only executable file
types are.

---

## 8. Root `.htaccess`

Already configured in this repository. It:

- Disables directory listing (`Options -Indexes`).
- Sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
  headers (CSP and Permissions-Policy are set from PHP instead — see
  `config/config.php` — so they can include a per-request nonce).
- Blocks `.sql`/`.log`/`.env`/`.md`/`.bak`/`.backup`/`.old`/`.orig`/
  `.zip`/`.tar`/`.gz` files and any dotfile (`.git`, `.env`, etc.).
- Blocks direct HTTP access to `config/`, `includes/`, `database/`, and
  `cron/` — PHP's own `require`/`require_once` calls are unaffected
  (Apache never sees those; only literal URL requests are blocked).
- Serves `/robots.txt` and `/sitemap.xml` from `robots.php`/`sitemap.php`.
- Rewrites `/product/some-slug`, `/category/some-slug`,
  `/collections/some-slug` to their real `?slug=` query-string form.
- Has a **commented-out** HTTPS redirect block — see Section 9.

**Test after upload** (all of these should load normally):

- Homepage (`/`)
- Shop (`/shop.php`)
- A category (`/category.php?slug=rings` or `/category/rings`)
- A product (`/product.php?slug=...` or `/product/...`)
- Admin login (`/admin/login.php`)
- A CSS/JS asset (`/assets/css/style.css`)
- An uploaded image (`/uploads/products/<filename>`)
- `/config/config.php` directly in a browser — this **should** now fail
  (403, or connection refused depending on host) once `.htaccess` is
  active; if it loads normally as blank output instead, `mod_rewrite`
  isn't enabled on your host and you should ask support to enable it.

**What was actually tested:** every rule's *syntax* was hand-reviewed,
and the equivalent PHP-level behavior (blocked direct requests aren't
possible to fully simulate) was tested via PHP's built-in dev server,
which does not process `.htaccess` at all — so the `mod_rewrite`/
`mod_headers` directives themselves have **not** been run against a real
Apache instance in this environment (none is available here). Everything
else in this document that doesn't depend on Apache specifically (PHP
logic, database changes, email, activity logging, maintenance mode,
system health checks) **was** run end-to-end against a real MySQL + PHP
server.

---

## 9. HTTPS

1. In cPanel, open **SSL/TLS Status** (or "Let's Encrypt™ SSL" if your
   host offers free auto-issued certificates) and enable SSL for your
   domain. Most cPanel hosts auto-provision and auto-renew a free
   certificate with one click.
2. Confirm the certificate is active by visiting
   `https://YOUR-DOMAIN.com/` directly and checking the browser shows a
   valid padlock, not a warning.
3. Decide on **one** canonical form of your domain — either
   `https://zarghoonjewellers.com` or
   `https://www.zarghoonjewellers.com`, not both — and set `SITE_URL` in
   `config/env.php` to exactly that. Every link the application generates
   uses `SITE_URL`, so this one setting controls the canonical form
   site-wide (including canonical `<link>` tags and `sitemap.xml`).
4. Only after confirming step 2 works, uncomment the HTTPS redirect block
   in `.htaccess` (see Section 8). It checks both `%{HTTPS}` and the
   `X-Forwarded-Proto` header before redirecting specifically so it
   doesn't create a redirect loop on hosts that terminate SSL at a proxy/
   load balancer in front of Apache (a real risk with a naive `%{HTTPS}`-
   only check — many hosting setups would loop forever without also
   checking the forwarded header).
5. If you use cPanel's own "Force HTTPS Redirect" toggle (Domains →
   your domain → Force HTTPS Redirect) instead, do **not** also enable
   the `.htaccess` block — pick one, not both, or you risk a double
   redirect.

Once HTTPS is confirmed active, cookies automatically become `Secure` —
`config/config.php`'s session bootstrap already detects HTTPS
(`$_SERVER['HTTPS']` or `X-Forwarded-Proto`) on every request and sets
`Secure` accordingly with no configuration needed; `HttpOnly` and
`SameSite=Lax` are always on regardless of HTTPS. Log in as both a
customer and an admin after enabling HTTPS to confirm sessions still
work — a login that silently fails to persist is the usual symptom of a
`Secure` cookie being set while the browser is still on `http://`.

---

## 10. Email (SMTP)

Email is entirely optional — the site works completely normally with it
left unconfigured; it simply won't send notification emails, and no
customer-facing action is blocked or fails because of it.

**Setup:** Admin > Settings > Email (SMTP) section:

| Field | Example |
|---|---|
| SMTP Host | `mail.yourdomain.com` (cPanel's own mail server) or your provider's SMTP host |
| SMTP Port | `587` (TLS) or `465` (SSL) |
| Encryption | TLS (recommended) |
| SMTP Username | your mailbox's full address, e.g. `orders@yourdomain.com` |
| SMTP Password | that mailbox's password |
| From Email | usually the same as the username |
| From Name | `Zarghoon Jewellers` |

The password field is never shown back to you after saving (it displays
a masked placeholder) and leaving it blank on a later save keeps
whatever is already stored — it can only ever be *replaced*, never
accidentally blanked out by editing something else on the same page.

**What sends an email once SMTP is configured:**

- Customer order confirmation + shop's new-order notification, right
  after checkout completes.
- Shop notification on new customer registration.
- Shop notification on a new contact-form message.
- Customer notification when an admin changes their order's status.

None of these include a password, a full card/payment detail (this
project never collects one — `payment_method` is only ever a label like
"Cash on Delivery"), or a CSRF token.

**If sending fails** (wrong credentials, host firewall blocking outbound
SMTP, etc.), the triggering action — the order, the registration, the
message — is **never** rolled back or blocked. The failure is only
logged via PHP's `error_log()` (check cPanel's Errors page or your PHP
error log), and the customer never sees an email-related error.

**What was actually tested:** `includes/mailer.php`'s plain-SMTP path
(no encryption, no auth) was run end-to-end against a real local test
SMTP server and confirmed to deliver a correctly formatted message,
including all four notification types above. The `STARTTLS`/`AUTH LOGIN`
code paths (used when a real host requires encryption and/or
credentials, which essentially every real mailbox does) were written
following the standard SMTP/RFC 3207 sequence and reviewed carefully, but
**could not be run against a real TLS-authenticated SMTP server in this
environment** — test the first real send after configuring your actual
SMTP credentials, and check your PHP error log if it doesn't arrive.

---

## 11. Cron Jobs

**No cron job is required for the site to function.** Nothing above
depends on one running.

The only optional maintenance task is `cron/cleanup-expired-tokens.php`,
which deletes expired password-reset tokens from the `password_resets`
table — purely disk-space housekeeping, since `findValidPasswordResetToken()`
already ignores expired rows regardless of whether they've been cleaned
up. If you'd like it:

1. cPanel → **Cron Jobs** → Add New Cron Job.
2. Common Settings: "Once Per Day" (or your preference — this task has
   no urgency).
3. Command:
   ```
   php /home/YOURCPANELUSER/public_html/cron/cleanup-expired-tokens.php
   ```
   (adjust the path to wherever you actually uploaded the project).

The script refuses to run under any SAPI other than `cli` (so it can
never be triggered by a browser even if `.htaccess`'s block on `cron/`
were somehow bypassed) and is also blocked from direct HTTP access by
`.htaccess` itself, same as `config/`/`includes/`/`database/`.

Do not consider this "configured" until you've actually added it in
cPanel — it does not run on its own.

---

## 12. System Health Check

Visit **Admin > System Health** (`admin/system-health.php`) after
deploying. It runs real, live checks — not assumptions — and reports
**PASS** / **WARNING** / **FAIL** for:

- PHP version and every required extension
- A live database connection + query
- Whether at least one admin account exists
- Each upload directory's actual `is_writable()` state
- Whether the current request is HTTPS
- `APP_ENV` / `APP_DEBUG` / `SITE_URL`
- Shop Name / WhatsApp / Email / Phone / Address / Logo completeness
- Whether 24K/21K/18K gold rates are set
- Whether SMTP is configured
- Whether maintenance mode is currently on

It never displays a database password, SMTP password, or any other
secret — only whether each is configured.

---

## 13. Backups

**Before launch, and regularly afterward:**

1. **Database:** phpMyAdmin → select your database → Export → Quick →
   SQL → Go. Save the downloaded `.sql` file somewhere **outside** your
   web root (your own computer, cloud storage) — never back up into
   `public_html/` itself, where it would be a live, downloadable file
   the moment `.htaccess`'s `.sql` block was ever misconfigured or
   removed.
2. **Uploads:** cPanel File Manager → select the `uploads/` folder →
   Compress → download the resulting archive, or use cPanel's own
   **Backup** / **Backup Wizard** tool if your host provides one (most
   do) to download a full home-directory backup.
3. **Configuration:** save a copy of your `config/env.php` somewhere
   safe and private (a password manager, not another web-accessible
   location) — it's the one file that can't be recreated from git, since
   it's deliberately never committed.

Recommend: a daily database export while the store is actively taking
orders, and a weekly uploads backup (product photos change far less
often than orders do). Most cPanel hosts also offer automatic scheduled
backups under **Backup Wizard** — check whether yours does before relying
solely on manual exports.

**This document does not claim any backup has been performed for you.**
Nothing above runs automatically until you set it up.

---

## 14. Maintenance Mode

Admin > Settings > Maintenance → check "Put the public website into
maintenance mode" → Save Settings.

While on, every public page shows:

> ZARGHOON JEWELLERS
> We're Preparing Something Beautiful.

Logged-in admins are never affected — the check
(`includes/header.php`) only applies to `!isAdminLoggedIn()`, so you can
keep browsing the full public site and the entire admin panel normally
while visitors see the maintenance page. Turn it back off the same way.

---

## 15. Removing Demo/Placeholder Data Before Launch

`database.sql` seeds:

- **Settings** with `CHANGE_ME` placeholders for `whatsapp_number`,
  `phone`, and `email` — replace all three in Admin > Settings before
  launch (the site works with them left as-is, but customers would see
  literal "CHANGE_ME" text or broken WhatsApp/contact links).
- **Ten starter categories** (Rings, Necklaces, Earrings, ...) — a
  reasonable real starting taxonomy, not demo/fake data. Keep, rename, or
  delete them like any other category via Admin > Categories.
- **Three DEMO gold rates**, clearly commented `-- DEMO RATE, NOT REAL` in
  `database.sql` — go to Admin > Gold Rates and enter your real,
  business-approved 24K/21K/18K rates before launch. Never publish demo
  rates as if they were real prices.
- **Zero products, zero customers, zero orders** — nothing to remove
  here; anything you see beyond the above was added during your own
  testing.

**If you added test products/customers/orders while trying out the
admin panel before launch**, remove them individually from their
respective admin list pages (Admin > Products, Admin > Customers,
Admin > Orders each have their own delete/deactivate actions with the
same confirmation and safety checks as any other admin action). There is
intentionally **no bulk "wipe all demo data" button** anywhere in the
admin panel — a single destructive action that clears multiple tables at
once is a real risk of an admin accidentally deleting real customer data
later, so this project does not provide one. If you need to bulk-clear a
test dataset before going live, do it directly in phpMyAdmin with
`DELETE FROM orders; DELETE FROM order_items; DELETE FROM users WHERE ...`
etc., reviewing each `WHERE` clause yourself — deliberately not a one-
click feature.

---

## 16. Final Data Check (before launch)

- [ ] Every category you intend to launch with exists and is Active
- [ ] Every product exists, with at least one real photo (no broken
      images — check each product page)
- [ ] Prices, purity, and weights are correct on every product (the
      price is always recalculated from weight × gold rate + charges —
      double-check the *inputs*, not a displayed price you could edit
      directly for `pricing_type = auto` products)
- [ ] Stock status is correct (In Stock / Out of Stock / Coming Soon)
- [ ] Featured / Best Sellers / New Arrivals selections reflect what you
      actually want on the homepage
- [ ] No demo product or demo image is visible on the live homepage/shop

---

## 17. Final Launch Procedure

1. Purchase/configure your domain with a registrar.
2. Point the domain's DNS (A record, or nameservers) at your hosting
   account, per your host's instructions.
3. Add the domain in cPanel (if not already the primary domain on the
   account).
4. Install SSL (Section 9).
5. Upload the project files (Section 18) to the correct document root.
6. Create the database and import the schema (Section 3).
7. Create `config/env.php` with real credentials (Section 4).
8. Set `SITE_URL` to your real domain (Section 4).
9. Run `setup-admin.php`, then delete it (Section 5).
10. Configure Shop Settings (name, currency, address, etc.).
11. Configure WhatsApp number.
12. Enter real, business-approved gold rates (Section 16).
13. Add your real categories and products.
14. Walk the full customer flow yourself (Section 19).
15. Walk the full admin flow yourself (Section 19).
16. Submit `sitemap.xml` to Google Search Console (see below).
17. Confirm `admin/system-health.php` shows no unresolved FAIL rows.
18. Turn maintenance mode off if it was ever turned on during setup.
19. Do a final look over the live homepage on both desktop and a real
    phone.
20. Launch — announce/share the real domain.

### Google Search Console (instructions only — nothing here does this for you)

1. Go to Google Search Console and add your property (the `https://`
   domain you settled on in Section 9).
2. Verify ownership — the simplest method on most hosts is the HTML tag
   method (Search Console gives you a `<meta>` tag; there's no
   `<head>` slot in this codebase built specifically for a verification
   snippet, so add it via `Admin > Settings`'s "Site Title"/meta-
   description fields won't fit it — instead paste it directly into
   `includes/header.php`'s `<head>` block, right after the other `<meta>`
   tags, as a one-line manual edit) or the DNS TXT record method if your
   registrar supports it.
3. Once verified, go to **Sitemaps** and submit `sitemap.xml`
   (`https://YOUR-DOMAIN.com/sitemap.xml`).
4. Check back after a few days for indexing status and any crawl errors.

---

## 18. cPanel File Upload

**Typical document root:** `public_html/` for your account's primary
domain, or `public_html/subdomain/` / a custom path for an addon domain
or subdomain — check **Domains** in cPanel to see exactly which folder
your chosen domain serves from. Do not assume it's `public_html/` without
checking if you're using an addon domain.

**Upload:**

1. cPanel → **File Manager** → navigate to your document root.
2. Upload a zip of this project (excluding `.git/`, `config/env.php` if
   you created it locally, and any local test artifacts like
   `.dev_env.sh`) and use File Manager's **Extract** feature, or
   upload files individually / via SFTP.
3. Confirm `index.php` ends up directly inside the document root (not
   nested one folder deeper because the zip contained a top-level
   folder) — the homepage should load at `https://YOUR-DOMAIN.com/`
   with no path suffix.

**If your site must live in a subdirectory** (e.g.
`https://yourdomain.com/shop/` rather than at the domain root), set
`SITE_URL` in `config/env.php` to include that path:
`define('SITE_URL', 'https://yourdomain.com/shop');` (no trailing
slash) — every link in the application is built from `SITE_URL`, so this
one change is sufficient; nothing else needs editing.

---

## 19. Full Testing Checklist

Perform each of these yourself on the live site before announcing launch
— this document cannot mark any of them done for you.

**Customer flow:**
Homepage → Shop → Search → Filter → Product → Register → Login →
Wishlist → Cart → Checkout → Place Order → Order Success → My Account →
Order History → Logout

**Admin flow:**
Admin Login → Dashboard → Add Category → Add Collection → Add Product →
Upload Images → Set Gold Rate → Edit Product → Homepage CMS → View
Customer → View Order → Change Order Status → Add Internal Note → View
Activity Log → Settings → System Health → Logout

**Mobile (at minimum these widths):** 360px, 390px, 414px, 768px, 1024px,
1280px — check for horizontal scrolling, broken menus, overlapping text,
or unreachable buttons at each.

**Security (re-verify on the live domain, not just locally):**
HTTPS active · secure cookies (check DevTools → Application → Cookies
shows `Secure` once HTTPS is on) · CSRF tokens present on every form ·
admin pages redirect to login when logged out · a customer cannot open
another customer's order by guessing its ID · directory listing is off
(`https://YOUR-DOMAIN.com/uploads/products/` should not show a file
list) · `config/env.php` is not reachable by URL.

**SEO:** `sitemap.xml` and `robots.txt` load and list your real
products/categories · every page has a distinct `<title>` and canonical
`<link>` · viewing page source on a product page shows valid JSON-LD
(paste it into Google's Rich Results Test if you want to confirm).

---

## 20. Troubleshooting

**Database connection failed** — Check `config/env.php`'s `DB_HOST`/
`DB_NAME`/`DB_USER`/`DB_PASS` against exactly what cPanel → MySQL
Databases shows (remember the account-name prefix). If `APP_DEBUG` is on,
the exact PDO error message is shown, which usually names the specific
problem (unknown host, access denied, unknown database).

**500 Internal Server Error** — Almost always either (a) `.htaccess`
using a directive your host's Apache doesn't have a module for (rare on
cPanel, since `mod_rewrite`/`mod_headers` are standard), or (b) a PHP
fatal error with `display_errors` off (production default). Check cPanel
→ **Errors** (or Metrics → Errors) for the real PHP error log entry.

**Images not uploading** — Check `admin/system-health.php`'s Upload
Directories section first; if a directory shows FAIL ("not writable"),
fix its permissions per Section 6 (755, not 777). If the error mentions
file size, check `MAX_UPLOAD_SIZE` in `config/config.php` against your
host's own `upload_max_filesize`/`post_max_size` PHP settings (cPanel →
MultiPHP INI Editor) — whichever is smaller wins.

**Images not displaying** — Usually a broken `UPLOAD_URL` (derived from
`SITE_URL` — confirm `SITE_URL` in `config/env.php` matches your real,
working domain exactly, including `https://`), or the site is in a
subdirectory and `SITE_URL` doesn't include that path (Section 18).

**Clean URLs (`/product/slug-name`) not working, only `?slug=` works** —
`mod_rewrite` isn't enabled, or `.htaccess` isn't being read at all
(check `AllowOverride All` is set for your document root — on shared
cPanel hosting this is almost always already the case; ask support if
not).

**HTTPS redirect loop** — Your host terminates SSL at a proxy/load
balancer in front of Apache, and something is redirecting based on
`%{HTTPS}` alone, which never becomes "on" in that setup. Use the
`.htaccess` block from Section 9 (it already checks
`X-Forwarded-Proto`) instead of a naive redirect, and make sure you
haven't also turned on cPanel's own "Force HTTPS Redirect" at the same
time (pick one).

**PHP extension missing** — cPanel → **MultiPHP Manager** shows which
PHP version is active for your domain; **Select PHP Version** (the
"Extensions" tab, sometimes a separate icon) lets you enable missing
extensions per-domain without contacting support, on most cPanel hosts.

**Permission denied** (writing to `uploads/`) — See Section 6; try 755
before 775 before ever considering 777.

**Email not sending** — Check `admin/system-health.php` shows SMTP as
configured; check your PHP error log for a `sendEmail failed:` line,
which includes the SMTP server's own rejection reason (wrong password,
wrong port, host blocking outbound port 587/465, etc.) — never a
password or other secret, just the SMTP protocol response text.

**Admin login not working** — Confirm you're using the account you
created via `setup-admin.php`, not the old removed demo credentials
(they no longer exist in a fresh database at all). If you're locked out
after 5 failed attempts, wait 60 seconds (`ADMIN_LOGIN_LOCKOUT_SECONDS`)
— this is a deliberate brute-force throttle, not a bug.

**Gold rate not displaying** — Go to Admin > Gold Rates and confirm a
rate exists for the purity in question; `admin/system-health.php`'s Gold
Rates section will show which of 24K/21K/18K is missing.

---

## What Was Actually Verified vs. What Wasn't

To be precise about what this phase confirmed, rather than assumed:

**Verified end-to-end against a real local MySQL + PHP server:**
`database.sql` + all five migrations importing cleanly with zero seeded
admin rows; `setup-admin.php` creating exactly one admin and refusing a
second run; customer registration, contact form, and full checkout all
correctly triggering their email notifications (plain-SMTP path);
order-status-change customer emails; maintenance mode blocking public
visitors while leaving the admin panel and a logged-in admin's browsing
of the public site unaffected, both via direct DB toggle and via the real
Admin > Settings form; `admin/system-health.php`'s every check reflecting
real, live state; a full regression pass across every public and admin
page with no PHP warnings/errors introduced.

**Not verified (no Apache or real internet SMTP server available in this
environment):** the `.htaccess` rewrite/header/block rules against a real
Apache server (syntax hand-reviewed only); the SMTP `STARTTLS`/`AUTH
LOGIN` code paths against a real authenticating mail server (the RFC-
standard sequence was implemented and reviewed, but not run against a
live mailbox); anything to do with a real domain, DNS, or SSL
certificate, since none of those exist for this project outside of your
own hosting account.
