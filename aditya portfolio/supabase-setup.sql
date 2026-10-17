-- Run this whole file in the Supabase SQL Editor.
-- After creating the first user in Authentication > Users, replace the
-- example UUID below with that user's UUID and run the INSERT statement.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  category text not null check (category in ('Python', 'Machine Learning & Deep Learning', 'Excel', 'Power BI')),
  description text not null,
  technologies text[] not null default '{}',
  github_url text not null default '',
  live_demo_url text not null default '',
  image_path text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Explicit table privileges complement RLS; they do not bypass its policies.
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
revoke all on public.admin_users from anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Anyone can read published projects" on public.projects;
create policy "Anyone can read published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert projects" on public.projects;
create policy "Admins can insert projects"
  on public.projects for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update projects" on public.projects;
create policy "Admins can update projects"
  on public.projects for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view project images" on storage.objects;
create policy "Anyone can view project images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "Admins can upload project images" on storage.objects;
create policy "Admins can upload project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "Admins can update project images" on storage.objects;
create policy "Admins can update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "Admins can delete project images" on storage.objects;
create policy "Admins can delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

-- Create the first admin user in Authentication > Users, then run:
-- insert into public.admin_users (user_id)
-- values ('00000000-0000-0000-0000-000000000000');

insert into public.projects
  (id, title, category, description, technologies, github_url, live_demo_url)
values
  ('ecommerce', 'E-Commerce Analytics & Google Maps Lead Scraper', 'Python',
   'A Streamlit application that cleans uploaded sales data, calculates revenue and order KPIs, visualizes trends, and scrapes business listings from Google Maps.',
   array['Python', 'Pandas', 'Streamlit', 'Plotly', 'Selenium'],
   'https://github.com/Adityacode-ship/Ecommerce-Analytics-Solution-and-Data-Scraping', ''),
  ('currency', 'Fake Currency Detection using CNN', 'Machine Learning & Deep Learning',
   'A computer-vision project that classifies currency note images using a CNN model, with image preprocessing and a web interface for predictions.',
   array['Python', 'TensorFlow', 'Keras', 'CNN', 'OpenCV', 'Flask'],
   'https://github.com/Adityacode-ship/Fake-Currency-Detection-using-cnn',
   'https://fake-currency-detection-using-cnn-4.onrender.com/')
on conflict (id) do nothing;
