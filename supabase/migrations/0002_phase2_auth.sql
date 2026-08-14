-- =============================================================================
-- Lumenex — Phase 2: authentication & user management
--
-- Adds:
--   - public.user_settings (notification preferences; separate from
--     profiles so account/security-adjacent settings don't crowd the
--     profile row, and so future settings can be added without touching
--     the profiles table policies).
--   - handle_new_user() extended to seed a user_settings row alongside the
--     profile + subscription it already creates.
--   - a private "avatars" Storage bucket with RLS scoping every user to
--     their own folder (avatars/<user_id>/...), read is public (avatars
--     are meant to be displayed), write/update/delete is owner-only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_settings
-- -----------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_notifications boolean not null default true,
  marketing_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "users manage their own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Extend the signup trigger to also seed a settings row. CREATE OR REPLACE
-- keeps the same trigger binding from 0001_init.sql — no need to recreate
-- the trigger itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select id into free_plan_id from public.plans where code = 'free' limit 1;

  if free_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status, current_period_end)
    values (new.id, free_plan_id, 'active', null)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Backfill settings rows for any profiles created before this migration.
insert into public.user_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- Storage: avatars bucket
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Avatars are publicly readable (they're displayed throughout the app,
-- including to other users viewing shared content).
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Uploads/updates/deletes are restricted to a path prefixed with the
-- caller's own user id: avatars/<user_id>/<filename>.
create policy "users upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
