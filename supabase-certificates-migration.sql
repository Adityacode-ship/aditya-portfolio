-- Run this migration in Supabase SQL Editor AFTER your existing portfolio setup.
-- Safe to run more than once.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null default '',
  issued_on text not null default '',
  description text not null default '',
  file_path text not null,
  file_type text not null check (file_type in ('image/png','image/jpeg','image/webp','application/pdf')),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.certificates to anon, authenticated;
grant insert, update, delete on public.certificates to authenticated;
alter table public.certificates enable row level security;

drop policy if exists "Anyone can read published certificates" on public.certificates;
create policy "Anyone can read published certificates" on public.certificates
  for select to anon, authenticated using (published = true or public.is_admin());
drop policy if exists "Admins can insert certificates" on public.certificates;
create policy "Admins can insert certificates" on public.certificates
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update certificates" on public.certificates;
create policy "Admins can update certificates" on public.certificates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete certificates" on public.certificates;
create policy "Admins can delete certificates" on public.certificates
  for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf'];

drop policy if exists "Anyone can view certificate files" on storage.objects;
create policy "Anyone can view certificate files" on storage.objects
  for select to anon, authenticated using (bucket_id = 'certificates');
drop policy if exists "Admins can upload certificate files" on storage.objects;
create policy "Admins can upload certificate files" on storage.objects
  for insert to authenticated with check (bucket_id = 'certificates' and public.is_admin());
drop policy if exists "Admins can update certificate files" on storage.objects;
create policy "Admins can update certificate files" on storage.objects
  for update to authenticated using (bucket_id = 'certificates' and public.is_admin())
  with check (bucket_id = 'certificates' and public.is_admin());
drop policy if exists "Admins can delete certificate files" on storage.objects;
create policy "Admins can delete certificate files" on storage.objects
  for delete to authenticated using (bucket_id = 'certificates' and public.is_admin());
