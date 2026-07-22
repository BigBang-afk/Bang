-- Zarghoon Jewellers — Core schema
-- All monetary values use numeric(12,2). All weights use numeric(10,3).
-- Never use float/double/real for money or weight.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type gold_purity as enum ('24K', '22K', '21K', '18K');
create type pricing_method as enum ('automatic', 'fixed', 'contact', 'on_request');
create type discount_type as enum ('none', 'fixed', 'percentage');
create type availability_status as enum ('in_stock', 'made_to_order', 'out_of_stock', 'reserved', 'sold');
create type inquiry_status as enum ('new', 'contacted', 'interested', 'follow_up', 'completed', 'cancelled', 'spam');
create type custom_order_status as enum (
  'new', 'reviewed', 'customer_contacted', 'quotation_sent', 'approved', 'in_progress', 'completed', 'cancelled'
);
create type contact_method as enum ('whatsapp', 'phone_call', 'email', 'showroom_visit');
create type admin_role as enum ('super_admin', 'admin', 'product_manager', 'content_manager');
create type gender_target as enum ('women', 'men', 'kids', 'unisex');

-- ---------------------------------------------------------------------------
-- Admin users (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role admin_role not null default 'admin',
  is_active boolean not null default true,
  phone text,
  avatar_url text,
  two_factor_enabled boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Website settings (single row of editable business content)
-- ---------------------------------------------------------------------------
create table website_settings (
  id boolean primary key default true constraint single_row check (id),
  business_name text not null default 'Zarghoon Jewellers',
  tagline text not null default 'Timeless Beauty. Crafted in Gold.',
  phone_number text not null default '+92 300 0000000',
  whatsapp_number text not null default '+923000000000',
  email text not null default 'info@zarghoonjewellers.com',
  address_line1 text not null default 'Liaquat Bazar, Sarafa Market',
  address_line2 text not null default 'Quetta, Pakistan',
  google_maps_embed_url text,
  google_maps_link text,
  logo_url text,
  favicon_url text,
  hero_heading text not null default 'Timeless Beauty. Crafted in Gold.',
  hero_subheading text not null default 'Zarghoon Jewellers',
  hero_description text not null default 'Discover elegant gold jewelry, bridal collections, traditional designs, and custom creations at Zarghoon Jewellers in Liaquat Bazar, Sarafa Market, Quetta.',
  hero_image_url text,
  hero_cta_1_text text not null default 'Explore Collections',
  hero_cta_1_url text not null default '/collections',
  hero_cta_2_text text not null default 'View Gold Rates',
  hero_cta_2_url text not null default '/gold-rates',
  hero_cta_3_text text not null default 'Visit Our Showroom',
  hero_cta_3_url text not null default '/contact',
  gold_rate_disclaimer text not null default 'Gold rates may change during the day. Please contact Zarghoon Jewellers for the latest confirmed rate.',
  product_price_disclaimer text not null default 'Product prices are calculated using the current gold rate and gross weight. The final showroom price may change according to the latest gold rate, exact weight, and product details.',
  custom_order_info text not null default 'Bring your vision to life. Share your design idea and our craftsmen at Zarghoon Jewellers will create a custom piece for you.',
  about_content text,
  privacy_policy text,
  terms_conditions text,
  footer_about text not null default 'Zarghoon Jewellers is a trusted gold and jewelry shop located in Liaquat Bazar, Sarafa Market, Quetta, offering traditional and modern gold jewelry.',
  seo_default_title text not null default 'Zarghoon Jewellers Quetta | Gold Jewelry in Sarafa Market',
  seo_default_description text not null default 'Explore premium gold rings, necklaces, bangles, bridal sets and custom jewelry at Zarghoon Jewellers, Liaquat Bazar, Sarafa Market, Quetta.',
  og_image_url text,
  google_analytics_id text,
  google_search_console_verification text,
  gold_rate_api_enabled boolean not null default false,
  gold_rate_api_url text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  note text,
  unique (day_of_week)
);

create table social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog: categories, collections, products
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_categories_active_order on categories (is_active, display_order);

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_collections_active_order on collections (is_active, display_order);

create table products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references categories (id) on delete set null,
  purity gold_purity not null,
  gross_weight_grams numeric(10, 3) not null check (gross_weight_grams >= 0),
  pricing_method pricing_method not null default 'automatic',
  fixed_price numeric(12, 2) check (fixed_price is null or fixed_price >= 0),
  discount_type discount_type not null default 'none',
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  availability_status availability_status not null default 'in_stock',
  gender gender_target not null default 'women',
  is_bridal boolean not null default false,
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  is_active boolean not null default true,
  is_draft boolean not null default false,
  is_sample boolean not null default false,
  cover_image_url text,
  seo_title text,
  seo_description text,
  view_count integer not null default 0,
  inquiry_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_gross_weight_required_for_automatic
    check (pricing_method <> 'automatic' or gross_weight_grams > 0),
  constraint chk_fixed_price_required_for_fixed
    check (pricing_method <> 'fixed' or fixed_price is not null),
  constraint chk_discount_percentage_range
    check (discount_type <> 'percentage' or discount_value <= 100)
);
create index idx_products_active on products (is_active, is_draft, deleted_at);
create index idx_products_category on products (category_id);
create index idx_products_purity on products (purity);
create index idx_products_featured on products (is_featured) where is_featured = true;
create index idx_products_new_arrival on products (is_new_arrival) where is_new_arrival = true;
create index idx_products_slug on products (slug);
create index idx_products_code on products (product_code);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_product_images_product on product_images (product_id, display_order);

create table product_collections (
  product_id uuid not null references products (id) on delete cascade,
  collection_id uuid not null references collections (id) on delete cascade,
  primary key (product_id, collection_id)
);
create index idx_product_collections_collection on product_collections (collection_id);

-- ---------------------------------------------------------------------------
-- Gold rates: current active set (one row per purity) + append-only history
-- ---------------------------------------------------------------------------
create table gold_rates (
  id uuid primary key default gen_random_uuid(),
  purity gold_purity not null unique,
  rate_per_tola numeric(12, 2) not null check (rate_per_tola >= 0),
  rate_per_10_grams numeric(12, 2) not null check (rate_per_10_grams >= 0),
  rate_per_gram numeric(12, 2) not null check (rate_per_gram >= 0),
  previous_rate_per_tola numeric(12, 2),
  rate_change numeric(12, 2) not null default 0,
  percentage_change numeric(6, 2) not null default 0,
  rate_source text not null default 'Manual',
  is_manual boolean not null default true,
  is_manual_override boolean not null default false,
  is_active boolean not null default true,
  notes text,
  effective_date date not null default current_date,
  effective_time time not null default current_time,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gold_rate_history (
  id uuid primary key default gen_random_uuid(),
  purity gold_purity not null,
  rate_per_tola numeric(12, 2) not null,
  rate_per_10_grams numeric(12, 2) not null,
  rate_per_gram numeric(12, 2) not null,
  previous_rate_per_tola numeric(12, 2),
  rate_change numeric(12, 2) not null default 0,
  percentage_change numeric(6, 2) not null default 0,
  rate_source text not null default 'Manual',
  is_manual boolean not null default true,
  is_manual_override boolean not null default false,
  notes text,
  effective_date date not null default current_date,
  effective_time time not null default current_time,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_gold_rate_history_purity_date on gold_rate_history (purity, effective_date desc, effective_time desc);

-- Optional audit trail of the price actually shown when a customer inquired.
create table product_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  purity gold_purity not null,
  gross_weight_grams numeric(10, 3) not null,
  rate_per_gram numeric(12, 2) not null,
  calculated_price numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  final_price numeric(12, 2) not null,
  reason text not null default 'inquiry',
  created_at timestamptz not null default now()
);
create index idx_price_snapshots_product on product_price_snapshots (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Inquiries, custom orders, contact messages
-- ---------------------------------------------------------------------------
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text not null unique,
  customer_name text not null,
  mobile_number text not null,
  whatsapp_number text,
  email text,
  product_id uuid references products (id) on delete set null,
  product_code_snapshot text,
  purity_snapshot gold_purity,
  gross_weight_snapshot numeric(10, 3),
  display_price_snapshot numeric(12, 2),
  message text,
  source text not null default 'website',
  status inquiry_status not null default 'new',
  admin_notes text,
  assigned_admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_inquiries_status on inquiries (status, created_at desc);
create index idx_inquiries_product on inquiries (product_id);

create table custom_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  mobile_number text not null,
  whatsapp_number text,
  email text,
  jewelry_type text not null,
  gold_purity gold_purity,
  approx_weight_grams numeric(10, 3),
  budget numeric(12, 2),
  required_date date,
  design_description text,
  reference_image_url text,
  preferred_contact_method contact_method not null default 'whatsapp',
  additional_notes text,
  status custom_order_status not null default 'new',
  admin_notes text,
  assigned_admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_custom_orders_status on custom_orders (status, created_at desc);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile_number text,
  whatsapp_number text,
  email text,
  subject text,
  message text not null,
  preferred_contact_method contact_method not null default 'whatsapp',
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index idx_contact_messages_status on contact_messages (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Testimonials, banners, pages, media
-- ---------------------------------------------------------------------------
create table testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review text not null,
  customer_image_url text,
  testimonial_date date not null default current_date,
  is_approved boolean not null default false,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_testimonials_approved on testimonials (is_approved, display_order);

create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  mobile_image_url text,
  button_text text,
  button_url text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_banners_active on banners (is_active, display_order);

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text,
  seo_title text,
  seo_description text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table media_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_path text not null,
  url text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  alt_text text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_media_files_created on media_files (created_at desc);

-- ---------------------------------------------------------------------------
-- Activity / audit logging
-- ---------------------------------------------------------------------------
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  description text,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_activity_logs_created on activity_logs (created_at desc);
create index idx_activity_logs_entity on activity_logs (entity_type, entity_id);
