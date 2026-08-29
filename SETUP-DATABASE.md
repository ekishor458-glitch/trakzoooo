# Connecting Trackzo to a real database (Supabase)

Trackzo now stores all business data in **Supabase** (a hosted Postgres database)
instead of only the browser. Follow these 3 steps once. Until you do, the app
still runs — it just keeps data in the local browser only.

---

## Step 1 — Create a free Supabase project
1. Go to **https://supabase.com** → **Start your project** → sign in (GitHub or email).
2. Click **New project**. Give it a name (e.g. `trackzo`), set a database password
   (save it somewhere), pick the region closest to your users, click **Create**.
3. Wait ~1 minute for it to finish provisioning.

## Step 2 — Create the tables
1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file [`supabase-schema.sql`](supabase-schema.sql) from this project,
   copy **everything**, paste it into the editor, and click **Run**.
3. You should see “Success”. Under **Table Editor** you’ll now see all 15 tables
   (clients, projects, materials, …) — all empty.

## Step 3 — Paste your two keys into the app
1. In Supabase go to **Project Settings → API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long `eyJ...` string (safe to use in the browser)
3. Open [`assets/store.js`](assets/store.js) and fill in the two lines near the top:
   ```js
   var SUPABASE_URL = 'https://abcdefgh.supabase.co';
   var SUPABASE_ANON_KEY = 'eyJhbGciOi...your-anon-key...';
   ```
4. Save, then **re-deploy / re-upload** the site to app.konvix.shop.

That’s it. Data now saves to Supabase and is shared across every device and user.

---

## Logging in
Dummy business data has been removed. A single admin account is created automatically
so you can get in:

- **Email:** `admin@gmail.com`
- **Password:** `admin123`

**Change this password** in Settings after your first login.

---

## How it works (for reference)
- Pages read data instantly from an in-memory cache; that cache is filled from
  Supabase on load and mirrored to the browser for offline use.
- Every add/edit/delete updates the screen immediately **and** is pushed to Supabase
  through a retry queue, so nothing is lost on a reload or a dropped connection.
- If Supabase is ever unreachable, the app keeps working locally and syncs the
  queued changes when it reconnects.

## Security — recommended next step
The current setup uses the public **anon** key with open table access, which is the
normal way to get a prototype live quickly. It means anyone with the site can read/write
the data. When you’re ready to lock it down properly, the upgrade is:
**Supabase Auth for real per-user login + Row-Level Security policies** scoping each
row to its owner/organisation. Ask and I’ll wire that in.
