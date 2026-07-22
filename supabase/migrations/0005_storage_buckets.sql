-- Storage buckets. All uploads are performed server-side with the service
-- role client (src/lib/supabase/storage.ts), which bypasses storage RLS, so
-- these policies only govern direct browser reads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('zarghoon-media', 'zarghoon-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('custom-order-references', 'custom-order-references', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public read zarghoon-media"
  on storage.objects for select
  using (bucket_id = 'zarghoon-media');

-- No public policy on 'custom-order-references' — only the service role
-- (admin panel) can read those files, via signed URLs.
