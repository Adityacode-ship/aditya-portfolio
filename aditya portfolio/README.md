# Aditya Gaidhane Portfolio

This is a static HTML/CSS/JavaScript portfolio with Supabase Authentication, Postgres, Row Level Security, and Storage-backed project management.

## Files

- `index.html`: public portfolio and category filters
- `admin.html`: authenticated project dashboard
- `style.css`: existing responsive dark navy/blue design plus login states
- `site.js`: public published-project loading
- `admin.js`: session verification, CRUD, JSON backup/import, and image uploads
- `projects.js`: shared categories and safe rendering helpers
- `supabase-setup.sql`: database, RLS, and Storage setup
- `supabase-config.js`: local/deployment runtime configuration; contains no secret
- `supabase-config.example.js`: configuration template
- `.env.example`: environment variable names for hosts/build systems that inject configuration

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com/).
2. Open **SQL Editor**, paste the complete contents of `supabase-setup.sql`, and run it. The script creates:
   - `public.projects` with the required project fields and timestamps.
   - `public.admin_users`, a database-side allowlist of authorized user IDs.
   - RLS policies that allow public reads only for `published = true`.
   - Insert, update, and delete policies that call `public.is_admin()`; no browser-supplied user ID is trusted.
   - A public `project-images` bucket with admin-only upload, update, and delete policies.
   - The two existing starter projects using conflict-safe inserts.
3. In **Authentication > Users**, choose **Add user**, enter your email and a strong unique password. This portfolio intentionally has sign-in only—there is no public sign-up form. If you do not want anyone to create their own account, disable public sign-ups in Supabase Authentication settings. You can create the first admin directly in the Supabase dashboard.
4. Copy the new user’s UUID from the Users table. In SQL Editor run:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE_THE_AUTH_USER_UUID_HERE');
   ```

   Only add your own account. Never place this UUID or the password in frontend code. The UUID is used only by the database-side allowlist. The admin page verifies this allowlist with `is_admin()` after sign-in; Postgres RLS and Storage policies enforce the same permission server-side.

## Configure the static frontend

1. Copy `supabase-config.example.js` to `supabase-config.js` (or edit the included placeholder file).
2. Set `url` to the project URL from **Project Settings > API**.
3. Set `publishableKey` to the publishable key (older projects call this the `anon` key).
4. Never use the `service_role` key in this project or any browser-delivered file. The publishable/anon key is intentionally public; RLS and Storage policies are the security boundary.

Static hosting cannot read `.env` files at runtime. If a build/deployment system injects variables, use the names in `.env.example` to generate `supabase-config.js` during deployment. Do not commit real credentials or private environment files.

## Existing data and images

The SQL seed preserves the two existing starter cards without duplicates. Additional projects can be migrated by using **Export JSON** from the old local admin, then **Import JSON** in the new dashboard. Legacy Base64 image values are intentionally rejected: upload each image through the dashboard so it is stored in `project-images`, and the database stores only its Storage path. JSON import upserts by project ID, so it does not create duplicate IDs.

The four supported categories remain:

- Python
- Machine Learning & Deep Learning
- Excel
- Power BI

## Local testing

Serve the folder through a local HTTP server rather than opening files directly, for example:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/index.html`, then `admin.html`.

Verify:

1. Logged out: the public page can read published projects; `admin.html` shows the sign-in screen and no dashboard. Direct attempts to insert/update/delete with the publishable key fail because no authenticated role is present.
2. Authorized admin: sign in with the Supabase user added to `admin_users`; the dashboard loads, CRUD works, deletes require confirmation, and image uploads are limited to PNG/JPG/WebP files of 5 MB or less.
3. Normal authenticated user: create a second user in Supabase Authentication but do not add it to `admin_users`. Sign in as that user. The dashboard rejects the session, and direct REST/API attempts to insert, update, or delete rows fail with an RLS error. Published `select` requests remain intentionally readable.
4. Database verification: in the Supabase SQL Editor, inspect **Authentication > Policies** and run:

   ```sql
   select id, title, published from public.projects;
   ```

   Test mutations only from an authorized client and an unauthorized client; do not disable RLS to make a test pass.
5. Storage verification: a public project image URL can be viewed without signing in, while upload/delete requests from logged-out and normal authenticated users fail.

## Deployment

Deploy the static files to GitHub Pages, Netlify, Vercel static hosting, or another static host. Ensure the generated `supabase-config.js` is deployed, add the production site URL in **Authentication > URL Configuration** (including allowed redirect URLs if used), and test both the public page and admin login on the deployed origin.

## Security notes

- Passwords are handled only by Supabase Auth and are never stored in localStorage or source code.
- Project writes no longer use localStorage. Browser storage is used only by the browser itself for Supabase’s session handling.
- The client checks the session on page load and re-checks authorization with the database `is_admin()` function.
- Frontend checks improve user feedback, but authorization is enforced again by Postgres RLS and Storage policies for direct API calls.


## Certificates section setup
1. In Supabase Dashboard → SQL Editor, run `supabase-certificates-migration.sql` once. This creates the `certificates` table, public file bucket, and admin-only write policies.
2. Push the updated portfolio files to the root of your existing GitHub repository.
3. Open `admin.html`, sign in, scroll to **Manage certificates**, and upload PNG/JPG/WebP or PDF (max 10 MB).
4. Certificates appear automatically in the public portfolio. Uploading/deleting certificates does not require another GitHub push.

Only the existing Supabase publishable key belongs in the frontend. Never add a service-role/secret key to these files.
