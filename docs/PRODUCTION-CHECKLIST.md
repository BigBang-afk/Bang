# Zarghoon Jewellers — Production Checklist

Nothing on this list is checked off by writing this document. Every box
here is for **you** to check once you've actually done it on your real
hosting account — see `DEPLOYMENT.md` for the detailed how-to behind each
item.

## Database

- [ ] Database created in cPanel (real prefixed name noted, not assumed)
- [ ] Database user created and assigned with all privileges
- [ ] `database.sql` imported
- [ ] `database/migrations/phase4.sql` imported
- [ ] `database/migrations/phase6.sql` imported
- [ ] `database/migrations/phase6b.sql` imported
- [ ] `database/migrations/phase7.sql` imported
- [ ] `database/migrations/phase9.sql` imported
- [ ] `database/migrations/phase10.sql` imported

## Configuration

- [ ] `config/env.php` created from `config/env.example.php` (never
      committed to git)
- [ ] Real `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASS` set in `config/env.php`
- [ ] `APP_ENV` set to `production` in `config/env.php`
- [ ] Debug disabled — confirmed automatically once `APP_ENV=production`
      (no separate flag to remember); double-check on
      `admin/system-health.php`
- [ ] `SITE_URL` set to your real domain (`https://...`, no trailing
      slash) in `config/env.php`
- [ ] Timezone confirmed as `Asia/Karachi` (hardcoded — nothing to change)

## Admin Account

- [ ] `setup-admin.php` run once to create the first real administrator
- [ ] **`setup-admin.php` deleted from the server immediately after**
- [ ] Confirmed old/default credentials no longer exist (`database.sql`
      no longer seeds any admin account — nothing to remove)
- [ ] Logged in with the real admin account at least once

## File Permissions

- [ ] `uploads/products/`, `uploads/categories/`, `uploads/collections/`,
      `uploads/banners/`, `uploads/logo/`, `uploads/favicon/`,
      `uploads/gallery/` all writable (755, **not 777**) — check
      `admin/system-health.php`
- [ ] `uploads/.htaccess` present and blocking PHP execution
- [ ] No directory anywhere set to 777

## HTTPS

- [ ] SSL certificate installed and active (cPanel SSL/TLS or Let's
      Encrypt)
- [ ] `https://YOUR-DOMAIN.com/` loads with a valid padlock, no warning
- [ ] `SITE_URL` matches the canonical `https://` form you chose
- [ ] HTTP → HTTPS redirect enabled (`.htaccess` block uncommented, or
      cPanel's own Force HTTPS — not both)
- [ ] No redirect loop (test in an incognito/private window)
- [ ] Logged in as both a customer and an admin after enabling HTTPS to
      confirm sessions still work

## Email (optional)

- [ ] SMTP configured in Admin > Settings > Email, **or** deliberately
      left blank (site works either way)
- [ ] A real test order placed to confirm the confirmation email actually
      arrives (if SMTP is configured)
- [ ] Checked the PHP error log for a `sendEmail failed:` line if it
      didn't arrive

## WhatsApp

- [ ] Real WhatsApp number entered in Admin > Settings (digits only, with
      country code, no `+` or spaces)
- [ ] Clicked a product's "Enquire on WhatsApp" button and confirmed it
      opens a chat to the shop's real number
- [ ] Confirmed via a real test order that the admin's "Confirm via
      WhatsApp" button opens a chat to the *customer's* number (this was
      a bug fixed in this phase — worth double-checking on the real site)

## Shop Content

- [ ] Logo uploaded (optional — site shows a clean text logo otherwise)
- [ ] Favicon uploaded
- [ ] Real, business-approved 24K/21K/18K gold rates entered — **never**
      the demo rates `database.sql` ships for local testing
- [ ] Categories created/reviewed (ten starter categories exist by
      default — rename, keep, or replace as needed)
- [ ] Products created with real photos, prices, purity, and weights
- [ ] Featured / Best Sellers / New Arrivals selections reviewed
- [ ] Shop Name, Address, Phone, Email set (no `CHANGE_ME` left anywhere
      — check Admin > System Health)
- [ ] Social links (Instagram/Facebook/YouTube/TikTok) set or left blank

## Testing

- [ ] Full customer journey walked on the live site: homepage → shop →
      search → filter → product → register → login → wishlist → cart →
      checkout → order confirmation → account → order history → logout
- [ ] Full admin journey walked on the live site: login → dashboard →
      add category → add collection → add product → upload images → set
      gold rate → edit product → homepage CMS → view customer → view
      order → change order status → add internal note → view activity
      log → settings → system health → logout
- [ ] Test order completed and verified in Admin > Orders
- [ ] Admin order status change tested and confirmed the customer's order
      page reflects the new status
- [ ] Password reset tested end-to-end with a real account
- [ ] Mobile tested on at least one real phone (not just narrowing a
      desktop browser window)

## SEO

- [ ] `https://YOUR-DOMAIN.com/sitemap.xml` loads and lists your real
      products/categories
- [ ] `https://YOUR-DOMAIN.com/robots.txt` loads and disallows admin/
      account/cart/checkout paths
- [ ] Google Search Console property added and verified
- [ ] Sitemap submitted in Search Console
- [ ] Spot-checked a product page's `<head>` for a unique title, meta
      description, and canonical URL

## Security

- [ ] `https://YOUR-DOMAIN.com/config/env.php` returns a blocked/denied
      response, not the file's contents
- [ ] `https://YOUR-DOMAIN.com/uploads/products/` does not show a
      directory listing
- [ ] 404/403/500 pages checked by visiting a broken link, a blocked
      path, and (if you can safely trigger one) a real server error
- [ ] Security headers checked (any online header-checker tool, or
      DevTools → Network → response headers) — CSP, Permissions-Policy,
      X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and (once
      HTTPS is live) Strict-Transport-Security should all be present

## Backups

- [ ] First full database export taken (phpMyAdmin → Export) and saved
      outside the web root
- [ ] First uploads folder backup taken
- [ ] `config/env.php` saved somewhere safe and private (it cannot be
      recreated from git)

## Final Steps

- [ ] `admin/system-health.php` shows no unresolved FAIL rows
- [ ] Maintenance mode confirmed OFF
- [ ] `setup-admin.php` confirmed deleted (check again — easy to forget)
- [ ] Announce / share the live domain

---

**Reminder:** do not check a box above until you have actually done it.
This checklist and `DEPLOYMENT.md` describe the correct procedure; they
do not perform it for you, and this project has not been deployed to any
real hosting account by writing these documents.
