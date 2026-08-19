# Zarghoon Jewellers — E-Commerce & Customer Management System

A production-ready website and admin management system for **Zarghoon
Jewellers**, a 24K/21K/18K gold jewellery business in Liaquat Bazar Sarafa
Market, Quetta, Pakistan.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, PostgreSQL
and Prisma 7.

---

## 1. What's included

- **Storefront** — home, about, collections, product detail, live gold-rate
  page (with history chart), gallery, contact, customer register/login,
  account dashboard, wishlist. Fully responsive, luxury maroon/gold theme.
- **Dynamic gold pricing engine** — every product price is calculated
  server-side from the current 24K/21K/18K rate at request time. Rates are
  append-only history; nothing is ever hard-coded.
- **Customer accounts** — secure registration/login (bcrypt password
  hashing, signed httpOnly session cookies), forgot/reset password,
  wishlist, order/inquiry history.
- **Admin panel** (`/admin`) — dashboard with charts, full product & image
  management, categories, gold rate management with history, customer
  management, birthday reminder system, customer groups & marketing
  campaigns (SMS/WhatsApp, provider-agnostic), orders/inquiries, gallery,
  homepage CMS (hero, collections, featured products, banners, trust
  badges, draft/publish), reports with CSV export, settings, and a full
  admin activity log.
- **SEO** — per-page metadata, Organization/JewelryStore + Product JSON-LD,
  sitemap.xml, robots.txt.
- **Security** — separate admin/customer auth systems, hashed passwords,
  signed JWT session cookies, route protection via `proxy.ts`, zod
  input validation on every API route, rate-limited auth endpoints, upload
  type/size validation.

---

## 2. Tech stack

| Layer      | Choice |
|------------|--------|
| Framework  | Next.js 16 (App Router, Turbopack) |
| Language   | TypeScript |
| Styling    | Tailwind CSS v4 |
| Database   | PostgreSQL |
| ORM        | Prisma 7 (`@prisma/adapter-pg`) |
| Auth       | Custom JWT sessions (`jose`) + `bcryptjs` password hashing |
| Charts     | Recharts |
| Validation | Zod |

---

## 3. Local setup

### Prerequisites

- Node.js 20+
- A PostgreSQL 14+ server

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL and the two session secrets
# (generate secrets with: openssl rand -base64 48)

# 3. Create the database (adjust to your Postgres setup)
createdb zarghoon_jewellers

# 4. Run migrations (creates all tables)
npx prisma migrate deploy   # or `npx prisma migrate dev` while developing

# 5. Seed sample data (admin user, categories, gold rates, demo products,
#    demo customers with varied birthdays, message templates)
npx prisma db seed

# 6. Start the dev server
npm run dev
```

Visit:
- **Storefront:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin/login

### Default seeded logins

| Role     | Identifier | Password |
|----------|------------|----------|
| Admin    | `admin@zarghoonjewellers.com` (or `SEED_ADMIN_EMAIL`) | `ChangeMe!12345` (or `SEED_ADMIN_PASSWORD`) |
| Customer | any seeded mobile, e.g. `+923001234567` | `Customer@123` |

**Change the admin password immediately in Settings → Security after first
login on any real deployment.**

---

## 4. Environment variables

See `.env.example` for the full annotated list. Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_SESSION_SECRET` / `CUSTOMER_SESSION_SECRET` | Session-signing secrets — **must** be long random strings in production, and different from each other |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used in metadata, sitemap and password-reset links |
| `UPLOADS_DIR` / `MAX_UPLOAD_MB` | Local image upload storage location/limit (see §6) |
| `MESSAGING_PROVIDER` | `none` \| `twilio` \| `whatsapp_cloud` — see §7 |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credentials created by `prisma db seed` |

No API keys or secrets are ever referenced from client-side code — every
integration (messaging providers, uploads) is called from server-only
modules (`src/lib/*.ts`, marked with `import "server-only"`) or Route
Handlers.

---

## 5. Database schema & migrations

The schema lives in `prisma/schema.prisma` and covers: `admins`,
`customers`, `products`, `product_images`, `categories`, `gold_rates`
(append-only history), `orders`/`order_items`, `wishlists`,
`message_templates`, `customer_groups`, `message_campaigns`/
`message_recipients`, `gallery_items`, `homepage_settings` (+ collections/
featured products/banners), `settings`, `admin_activity_logs`, and password
reset tables for both admin and customer.

To change the schema: edit `prisma/schema.prisma`, then run
`npx prisma migrate dev --name <description>`. This generates a new,
timestamped migration file under `prisma/migrations/` — never edit past
migrations. In production, apply pending migrations with
`npx prisma migrate deploy` as part of your deploy step, before starting
the app.

Gold rates are **never overwritten** — updating a rate always inserts a new
`gold_rates` row with its own `effectiveAt` timestamp. All product pricing
reads the latest row for the product's purity, so a new rate takes effect
everywhere immediately, while historical order records keep the exact rate
that was used at the time (via `order_items.goldRateId`).

---

## 6. Image uploads

By default, uploaded images (product photos, gallery, homepage banners,
logo) are written to `public/uploads/**` on local disk and served directly
by Next.js. This is the simplest option for a single-server / VPS
deployment.

For a horizontally-scaled or serverless deployment (e.g. Vercel, where the
filesystem is ephemeral), swap the storage backend: edit
`src/lib/storage.ts` — `saveUploadedImage()` is the single place that reads
a `File` and returns a public URL. Point it at S3, Cloudflare R2, or any
S3-compatible bucket and nothing else in the app needs to change, since
every caller only ever stores/renders the returned URL string.

---

## 7. SMS / WhatsApp messaging

The marketing system (Customers → Marketing, and campaign sending) never
fakes delivery. With `MESSAGING_PROVIDER=none` (the default), every send
attempt is recorded as `FAILED` with a clear "no provider configured"
error — visible per-recipient in Admin → Messages → Sent Messages.

To go live, set in `.env`:

```bash
# Twilio (SMS and/or WhatsApp via Twilio)
MESSAGING_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...        # for SMS
TWILIO_WHATSAPP_FROM=...      # for WhatsApp (e.g. "+14155238886")

# — or — Meta WhatsApp Cloud API
MESSAGING_PROVIDER=whatsapp_cloud
WHATSAPP_CLOUD_PHONE_NUMBER_ID=...
WHATSAPP_CLOUD_ACCESS_TOKEN=...
```

To add another provider, implement the `MessagingProvider` interface in
`src/lib/messaging.ts` and register it in `getMessagingProvider()`.

Message templates support placeholders: `{customer_name}`, `{gold_rate}`,
`{store_name}`, `{phone}`, `{date}` — rendered per-recipient at send time.

---

## 8. Deployment

### Option A — VPS / self-hosted (recommended for this app)

1. Provision PostgreSQL and a Node 20+ runtime.
2. `npm ci && npm run build`.
3. Run `npx prisma migrate deploy` against the production database.
4. Run `npx prisma db seed` **once**, only if you want the demo data —
   otherwise just create your real admin user directly via SQL or a small
   script using `src/lib/password.ts`'s `hashPassword()`.
5. Start with `npm run start` behind a process manager (pm2, systemd) and
   a reverse proxy (nginx/Caddy) terminating TLS.
6. Ensure `public/uploads/` is on persistent storage and writable by the
   Node process (or switch to S3-backed storage — see §6).

### Option B — Vercel / serverless

Works for the app code, but:
- Use a managed Postgres (Neon, Supabase, RDS, etc.) — `DATABASE_URL`
  needs to be reachable from the serverless environment.
- **Switch image storage to S3-compatible** (§6) — the local filesystem is
  not persisted between deployments/invocations.
- Run `prisma migrate deploy` as a build step or CI step before deploying.

---

## 9. Project structure

```
prisma/                   schema.prisma, migrations, seed.ts
src/
  app/
    (site)/                storefront pages (route group, shared nav/footer)
    admin/
      login/                admin login (unprotected)
      (dashboard)/          all protected admin pages (route group)
    api/                    REST route handlers
      admin/                 admin-only endpoints (guarded by requireAdmin())
      auth/, account/, ...   public/customer endpoints
    sitemap.ts, robots.ts
  components/
    site/                   storefront components
    admin/                  admin panel components
    ui/                     shared form primitives (Button, Input, Select…)
  lib/                      business logic — auth, gold pricing engine,
                             messaging, storage, validation, birthdays, etc.
  proxy.ts                  route protection for /admin and /api/admin
  generated/prisma/         Prisma client (generated, not hand-edited)
```

**Design principle:** the gold-price calculation lives in exactly one place
(`src/lib/gold.ts`). No frontend code ever computes a price — every page
and API response reads the already-calculated figure from there.

---

## 10. Security notes

- Passwords are hashed with bcrypt (12 rounds), never stored in plain text.
- Admin and customer sessions are separate signed JWTs in httpOnly, SameSite
  cookies with independent secrets — a compromised customer session cannot
  access admin routes.
- `src/proxy.ts` blocks all `/admin/*` pages and `/api/admin/*` routes at
  the edge; every admin API route additionally re-verifies the session
  itself (defense in depth).
- All mutating API routes validate input with Zod and return field-level
  errors; Prisma's parameterized queries prevent SQL injection.
- Uploads are validated by MIME type and size before being written to disk.
- Login endpoints are rate-limited per IP (in-memory; swap for a shared
  store such as Redis if you scale beyond a single instance).
- No secret or API key is ever sent to the browser — all third-party
  integrations are called from server-only modules.

---

## 11. What to do next for a real launch

- Replace all seeded demo content (products, gallery, gold rates) with
  real data through the admin panel.
- Set a real `MESSAGING_PROVIDER` and test a live send before relying on
  the marketing module.
- Change the seeded admin password (Settings → Security).
- Point `NEXT_PUBLIC_SITE_URL` at your real domain (used by metadata,
  sitemap, and password-reset links).
- Consider adding a second admin account per staff member for accurate
  activity-log attribution.
