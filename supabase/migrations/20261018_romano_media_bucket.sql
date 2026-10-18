-- ROMANO uses a public-read, server-write-only bucket for published restaurant images.
-- No browser upload/delete policies are created; the Admin Edge Function validates ownership.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('romano-media','romano-media',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Only images from this dedicated public bucket can be read with anon credentials.
create policy "romano_media_public_read"
on storage.objects for select to anon,authenticated
using (bucket_id = 'romano-media');
