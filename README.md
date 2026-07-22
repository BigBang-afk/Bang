# Zarghoon Jewellers — Website & Admin Platform

A production-ready luxury jewelry catalog website for **Zarghoon Jewellers**, Liaquat Bazar, Sarafa Market, Quetta — with live gold-rate management, automatic gross-weight pricing, a secure admin panel, WhatsApp inquiries, and custom jewelry orders.

Built with Next.js (App Router) + TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, Storage).

---

## 1. Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — luxury theme (ivory / charcoal / gold, Playfair Display + Inter)
- **Supabase** — Postgres database, Auth, Storage
- **Zod** — validation (shared client/server schemas)
- **React Hook Form** — client-side form UX
- **Recharts** — admin dashboard charts
- **Sonner** — toast notifications
- **lucide-react** — icons

---

## 2. Project Structure

```
src/
  app/
    (public)/            Public website: home, collections, products, gold-rates,
                          gold-calculator, custom-orders, about, contact, search,
                          privacy-policy, terms
    admin/
      login/              Admin login (unprotected)
      (protected)/        Everything else under /admin — guarded by requireAdmin()
    api/                  Route handlers: search, CSV exports, revalidate
    sitemap.ts, robots.ts
  components/
    layout/   home/   product/   collection/   gold-rate/   admin/   ui/
  lib/
    supabase/    client.ts (browser), server.ts (session), admin.ts (service role)
    pricing/     gold rate math + product pricing engine (THE pricing source of truth)
    data/        typed data-access functions used by both public pages and admin
    validations/ Zod schemas (shared)
    actions/     shared server actions (taxonomy CRUD)
    auth.ts, activity-log.ts, rate-limit.ts, whatsapp.ts, csv.ts, utils.ts, constants.ts
  types/
    database.ts  Hand-written types matching the SQL schema
supabase/
  migrations/    Numbered SQL migrations — run in order
  seed.sql       Optional sample/demo data (clearly marked, safe to delete)
scripts/
  create-admin.mjs   Bootstraps the first Super Admin account
```

---

## 3. Database Schema (Supabase / Postgres)

Tables (see `supabase/migrations/0001_init_schema.sql` for full DDL):

`admin_profiles, website_settings, business_hours, social_links, categories, collections, products, product_images, product_collections, gold_rates, gold_rate_history, product_price_snapshots, inquiries, custom_orders, contact_messages, testimonials, banners, pages, media_files, activity_logs`

Design notes:
- All money → `numeric(12,2)`. All weight → `numeric(10,3)`. **Never** `float`/`real` for either.
- `gold_rates` holds exactly one **current** row per purity (24K/22K/21K/18K); every insert/update is mirrored into the append-only `gold_rate_history` table via a trigger — that's your full audit trail.
- Product price is **never stored** as a static column — it's calculated live from `gross_weight_grams × active gold_rates.rate_per_gram` on every read (see §5).
- `categories.code` (e.g. `RNG`, `NCK`) drives the `ZJ-RNG-0001` style auto product code generator (`next_product_code()` SQL function).
- Roles are a single `admin_role` enum column on `admin_profiles` (`super_admin`, `admin`, `product_manager`, `content_manager`) rather than a separate roles/user_roles join table — simpler, and each admin realistically has one role.
- Row Level Security is enabled on every table. Public policies allow `SELECT` only on safe, published rows (`is_active`, `is_approved`, etc.). **No** anon/authenticated write policies exist anywhere — all mutations go through Server Actions using the Supabase **service role** client (`src/lib/supabase/admin.ts`), which never reaches the browser.

---

## 4. Local Installation

### Prerequisites
- Node.js 20.9+ and npm
- A free [Supabase](https://supabase.com) account

### Steps

```bash
git clone <this-repo>
cd <repo>
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see §6 for where to find each value), then:

```bash
npm run dev
```

Visit `http://localhost:3000`. The admin panel is at `/admin/login` — you'll need an admin account first (§7).

---

## 5. Pricing Engine (read this before touching pricing code)

**The rule, exactly as specified:**

```
Item Price = Gross Weight in Grams × Gold Rate Per Gram
```

- Gross weight only — **never** net weight.
- No making charges, stone charges, or tax are added automatically.
- Implemented in `src/lib/pricing/product-pricing.ts` (`calculateProductPrice`) — pure, framework-free functions, safe to import in both Server and Client Components (used for the live admin price preview and the public Gold Calculator).
- **Server-side is the trusted source.** Every public product page and listing computes price server-side from the currently active `gold_rates` row at render time — nothing is cached into a stale "price" column.
- Four pricing methods: `automatic` (the formula above), `fixed` (admin-entered price, immune to rate changes), `contact` ("Contact for Latest Price"), `on_request` ("Price Available on Request").
- Discounts: `none | fixed | percentage`, applied after the base price, clamped so the final price is never negative.
- If no active gold rate exists for a product's purity, automatic-priced products show **"Gold rate unavailable. Contact for latest price."** instead of a wrong number.
- Gold rate math (`src/lib/pricing/gold-rate.ts`): 1 tola = 11.6638 grams; purity rates derive as `24K rate × (purity/24)`; any purity can be individually flagged `is_manual_override` to stop it from being overwritten when the admin applies a new base 24K rate.

---

## 6. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. **Run the migrations**, in order, via the SQL Editor (or the CLI — see below):
   - `supabase/migrations/0001_init_schema.sql`
   - `supabase/migrations/0002_functions_triggers.sql`
   - `supabase/migrations/0003_rls_policies.sql`
   - `supabase/migrations/0004_default_data.sql`
   - `supabase/migrations/0005_storage_buckets.sql`
3. *(Optional)* Load demo data: `supabase/seed.sql` — sample products, testimonials, a banner, and illustrative gold rates. Everything it inserts is flagged `is_sample = true` / `[Sample product]` and safe to bulk-delete later from the admin panel.
4. Via the Supabase CLI instead of pasting SQL manually:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
5. Copy your API keys from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` — **server-only, never expose this**

---

## 7. Admin Account Setup

Create the first Super Admin from your machine (needs the service role key in your environment):

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

npm run create-admin -- --email "owner@zarghoonjewellers.com" --password "ChangeMe123!" --name "Shop Owner" --role super_admin
```

Then sign in at `/admin/login`. From **Users & Roles** in the admin panel, the Super Admin can create additional accounts (Admin, Product Manager, Content Manager) without touching the command line again.

---

## 8. Environment Variables

See `.env.example` for the full annotated list. Summary:

| Variable | Where it's used | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Both clients | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/session client | Yes (RLS-restricted) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Actions / admin data layer only | **No — never** |
| `NEXT_PUBLIC_SITE_URL` | Metadata, sitemap, WhatsApp share links | Yes |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Fallback WhatsApp number before admin sets one | Yes |
| `REVALIDATE_SECRET` | Optional webhook auth for on-demand revalidation | No |

---

## 9. Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this on the deployed branch).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Add the environment variables from §8 in **Project Settings → Environment Variables** (all of them — Production and Preview).
5. Deploy. Vercel will run `next build` automatically.
6. Once live, update `NEXT_PUBLIC_SITE_URL` to your real domain and redeploy (or set it correctly before the first deploy).

### Connecting a custom domain
1. In Vercel: **Project → Settings → Domains → Add** → enter your domain (e.g. `www.zarghoonjewellers.com`).
2. Update your DNS provider with the CNAME/A records Vercel shows you.
3. Wait for DNS propagation and SSL issuance (automatic via Vercel).
4. Update `NEXT_PUBLIC_SITE_URL` to match and redeploy.

---

## 10. Post-Launch: Google Search Console & Analytics

- **Search Console**: verify via the meta tag method — paste the verification code into **Admin → Website Settings → SEO → Search Console Verification**, or use the DNS method directly in Search Console. Submit `https://yourdomain.com/sitemap.xml`.
- **Analytics**: paste your GA4 Measurement ID into **Admin → Website Settings → SEO → Google Analytics ID** (wiring the ID into a script loader is a one-line addition in `src/app/layout.tsx` using `next/script` — left off by default so no tracking runs until you provide a real ID).

---

## 11. Testing Checklist

- [ ] Every public nav link (Home, Collections, All Products, Gold Rates, Gold Calculator, Custom Orders, About, Contact, Search)
- [ ] Mobile hamburger menu opens/closes, sticky header shrinks on scroll
- [ ] Gold Rate Bar shows all 4 purities with correct per-tola/per-gram/per-10g figures
- [ ] Admin → Gold Rates: enter a base 24K rate → confirm 22K/21K/18K auto-derive correctly; toggle manual override on one purity and confirm it's skipped on the next base-rate apply
- [ ] Product with `automatic` pricing recalculates immediately after a gold rate change (no product edit needed)
- [ ] Product with `fixed` pricing is unaffected by gold rate changes
- [ ] `contact` / `on_request` products hide the numeric price correctly
- [ ] Discount math: fixed and percentage, both clamped at zero
- [ ] Product filters (category, collection, purity, gender, bridal, new, featured) and all 9 sort options
- [ ] Product detail: gallery + fullscreen viewer, WhatsApp button generates the exact templated message, Call Now, Share, Print
- [ ] Inquiry form submission appears in Admin → Customer Inquiries with the correct price/purity/weight snapshot
- [ ] Custom Order form (with and without a reference image) appears in Admin → Custom Orders; reference image opens via signed URL
- [ ] Contact form appears in Admin → Contact Messages
- [ ] Admin auth: wrong password is rejected, 6th rapid attempt is rate-limited, deactivated account is blocked at login
- [ ] Non-super-admin cannot reach Users & Roles actions
- [ ] Image upload rejects non-image files and files over 5MB
- [ ] CSV exports (Products, Inquiries, Custom Orders, Gold Rate History) download and open cleanly
- [ ] Mobile layout: header, filters, product cards, product gallery, admin tables, admin forms

---

## 12. Production Launch Checklist

- [ ] Real gold rates entered for all 4 purities (Admin → Gold Rates) — the site ships with `0` rates until you do this
- [ ] Sample products removed or replaced (`supabase/seed.sql` data is flagged `is_sample = true`)
- [ ] Real business info saved in Admin → Website Settings (phone, WhatsApp, address, hours, maps, social links)
- [ ] Logo, favicon, and homepage hero image uploaded
- [ ] About Us / Privacy Policy / Terms content reviewed and edited in Admin → Pages (defaults contain no invented facts, but are generic — personalize them)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real production domain
- [ ] Google Search Console verified, sitemap submitted
- [ ] Test a real WhatsApp inquiry end-to-end from a phone
- [ ] Confirm RLS: try fetching a draft/inactive product's data with the anon key from outside the app — it should return nothing
- [ ] Confirm the service role key is **only** set as a server environment variable in Vercel, never committed, never in a `NEXT_PUBLIC_*` variable

---

## 13. Backup & Restore

See **Admin → Backup & Export** for one-click CSV exports and a full step-by-step checklist (database dump, storage image backup, restore procedure).

---

## 14. Known, Deliberate Simplifications

Documented here rather than hidden — these are pragmatic scope decisions, not gaps:

- **Roles** are a single enum column, not a `roles` + `user_roles` join table (see §3).
- **Audit trail** is covered by `gold_rate_history` (rate changes) + `activity_logs` (everything else) instead of a separate parallel `audit_logs` table.
- **Two-factor authentication**: the `admin_profiles.two_factor_enabled` column and role/permission structure are in place, but the TOTP enrollment/verification flow itself is not implemented — wire it in using Supabase Auth's MFA APIs when needed.
- **CAPTCHA**: public forms are protected by honeypot fields + per-IP rate limiting; a CAPTCHA provider (e.g. Turnstile/hCaptcha) can be dropped into the same form components if spam becomes an issue.
- **Rate limiting** is in-memory (`src/lib/rate-limit.ts`) — a reasonable default for a single-instance deployment; swap for Upstash Redis if you scale to multiple serverless instances and need it enforced globally.
- **"Price low→high / high→low" sort** approximates using gross weight within the result set, since automatic prices are computed live from the current gold rate rather than stored — documented in `src/lib/data/products.ts`.
- **Gold rate API integration**: the schema and admin toggle (`gold_rate_api_enabled`, `gold_rate_api_url`) are ready; no third-party gold-rate API is wired up yet (per the brief — this was intentionally left for future integration, with manual override always taking precedence).

---

## 15. Support

This codebase has no external support contract. For Next.js/Supabase issues, see:
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
