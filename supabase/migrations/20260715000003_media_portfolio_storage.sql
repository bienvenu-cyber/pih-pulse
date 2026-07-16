-- ============================================================
-- Media + portfolio + storage buckets
-- ============================================================

-- Profiles portfolio links
alter table public.profiles
  add column if not exists portfolio jsonb default '{}'::jsonb;
-- portfolio example: {"github":"...","figma":"...","linkedin":"...","website":"..."}

-- Projects media gallery (cover reste avatar_url)
alter table public.projects
  add column if not exists media jsonb default '[]'::jsonb;
-- media: [{ "type":"image"|"video", "url":"...", "thumbUrl":"..." }]

-- Missions cover / media
alter table public.missions
  add column if not exists media jsonb default '[]'::jsonb;

-- ─── Storage buckets (public read) ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'media',
    'media',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: lecture publique
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
  on storage.objects for select
  using (bucket_id = 'media');

-- Upload : user authentifié, dossier = son user id
drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own media" on storage.objects;
create policy "Users upload own media"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own media" on storage.objects;
create policy "Users update own media"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own media" on storage.objects;
create policy "Users delete own media"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'media')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
