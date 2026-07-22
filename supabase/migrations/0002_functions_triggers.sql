-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger, applied to every table with an updated_at col
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'admin_profiles', 'website_settings', 'categories', 'collections', 'products',
      'gold_rates', 'inquiries', 'custom_orders', 'testimonials', 'banners', 'pages'
    ])
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Log every gold_rates change into gold_rate_history (append-only audit trail)
-- ---------------------------------------------------------------------------
create or replace function log_gold_rate_history()
returns trigger
language plpgsql
as $$
begin
  insert into gold_rate_history (
    purity, rate_per_tola, rate_per_10_grams, rate_per_gram, previous_rate_per_tola,
    rate_change, percentage_change, rate_source, is_manual, is_manual_override,
    notes, effective_date, effective_time, changed_by
  ) values (
    new.purity, new.rate_per_tola, new.rate_per_10_grams, new.rate_per_gram, new.previous_rate_per_tola,
    new.rate_change, new.percentage_change, new.rate_source, new.is_manual, new.is_manual_override,
    new.notes, new.effective_date, new.effective_time, coalesce(new.updated_by, new.created_by)
  );
  return new;
end;
$$;

create trigger trg_log_gold_rate_history
after insert or update on gold_rates
for each row execute function log_gold_rate_history();

-- ---------------------------------------------------------------------------
-- Sequence-backed generators for human-friendly numbers/codes
-- ---------------------------------------------------------------------------
create sequence if not exists inquiry_number_seq start 1;
create sequence if not exists custom_order_number_seq start 1;
create sequence if not exists product_code_seq_default start 1;

create or replace function next_inquiry_number()
returns text
language sql
as $$
  select 'ZJ-INQ-' || lpad(nextval('inquiry_number_seq')::text, 5, '0');
$$;

create or replace function next_custom_order_number()
returns text
language sql
as $$
  select 'ZJ-CO-' || lpad(nextval('custom_order_number_seq')::text, 5, '0');
$$;

-- Per-category-prefix product code generator, e.g. ZJ-RNG-0001
create or replace function next_product_code(category_prefix text)
returns text
language plpgsql
as $$
declare
  seq_name text := 'product_code_seq_' || lower(category_prefix);
  next_val bigint;
begin
  if not exists (select 1 from pg_sequences where sequencename = seq_name) then
    execute format('create sequence %I start 1', seq_name);
  end if;
  execute format('select nextval(%L)', seq_name) into next_val;
  return 'ZJ-' || upper(category_prefix) || '-' || lpad(next_val::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep only one is_cover=true image per product
-- ---------------------------------------------------------------------------
create or replace function enforce_single_cover_image()
returns trigger
language plpgsql
as $$
begin
  if new.is_cover then
    update product_images set is_cover = false
    where product_id = new.product_id and id <> new.id and is_cover = true;
  end if;
  return new;
end;
$$;

create trigger trg_single_cover_image
before insert or update on product_images
for each row execute function enforce_single_cover_image();

-- ---------------------------------------------------------------------------
-- Atomic counter increment (view_count / inquiry_count) — avoids read-modify
-- -write races under concurrent traffic.
-- ---------------------------------------------------------------------------
create or replace function increment_product_counter(p_id uuid, p_column text)
returns void
language plpgsql
as $$
begin
  if p_column not in ('view_count', 'inquiry_count') then
    raise exception 'Invalid counter column: %', p_column;
  end if;
  execute format('update products set %I = %I + 1 where id = $1', p_column, p_column) using p_id;
end;
$$;
