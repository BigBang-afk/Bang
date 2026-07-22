-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- All admin reads/writes go through Next.js Server Components / Server
-- Actions using the Supabase SERVICE ROLE client, which is created only on
-- the server (see src/lib/supabase/admin.ts) and always bypasses RLS. The
-- service role key never reaches the browser.
--
-- RLS below is defense-in-depth for the anon/authenticated (browser) keys:
-- only safe, public-facing rows are readable directly, and no direct writes
-- are permitted from the browser at all — public forms (inquiries, custom
-- orders, contact messages) are submitted through server actions, not
-- direct client inserts.
-- ---------------------------------------------------------------------------

alter table admin_profiles enable row level security;
alter table website_settings enable row level security;
alter table business_hours enable row level security;
alter table social_links enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_collections enable row level security;
alter table gold_rates enable row level security;
alter table gold_rate_history enable row level security;
alter table product_price_snapshots enable row level security;
alter table inquiries enable row level security;
alter table custom_orders enable row level security;
alter table contact_messages enable row level security;
alter table testimonials enable row level security;
alter table banners enable row level security;
alter table pages enable row level security;
alter table media_files enable row level security;
alter table activity_logs enable row level security;

-- Public read policies -------------------------------------------------------

create policy "public read website_settings" on website_settings
  for select using (true);

create policy "public read business_hours" on business_hours
  for select using (true);

create policy "public read active social_links" on social_links
  for select using (is_active = true);

create policy "public read active categories" on categories
  for select using (is_active = true);

create policy "public read active collections" on collections
  for select using (is_active = true);

create policy "public read published products" on products
  for select using (is_active = true and is_draft = false and deleted_at is null);

create policy "public read images of published products" on product_images
  for select using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id
        and p.is_active = true and p.is_draft = false and p.deleted_at is null
    )
  );

create policy "public read product_collections of published products" on product_collections
  for select using (
    exists (
      select 1 from products p
      where p.id = product_collections.product_id
        and p.is_active = true and p.is_draft = false and p.deleted_at is null
    )
  );

create policy "public read active gold_rates" on gold_rates
  for select using (is_active = true);

create policy "public read approved testimonials" on testimonials
  for select using (is_approved = true);

create policy "public read active banners" on banners
  for select using (is_active = true);

create policy "public read published pages" on pages
  for select using (is_published = true);

-- Authenticated admin read policies (server also uses service role, but this
-- allows an authenticated admin session to read its own profile client-side).

create policy "admins read own profile" on admin_profiles
  for select using (auth.uid() = id);

create policy "admins update own profile" on admin_profiles
  for update using (auth.uid() = id);

-- No insert/update/delete policies are defined for anon/authenticated on any
-- table above: RLS with zero write policies denies all browser-side writes.
-- All mutations happen server-side via the service role client.
