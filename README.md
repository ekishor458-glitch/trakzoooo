# Trackzo — HTML / CSS / JS edition

A pure front-end conversion of the Trackzo construction-ERP (originally PHP + MySQL).
**No server, no build step, no database** — everything runs in the browser and data is
saved to **localStorage**. It's a faithful, fully-working port: login, dashboard, and full
create / edit / delete for Clients, Projects, Materials, Purchase Orders, Finance, Accounts,
Estimation, plus Reports (Excel/PDF export), Calendar, Settings, Admin Panel and the
per-project Workspace.

---

## Run it

Just open **`index.html`** in a browser — you'll be sent to the login screen.

> Tip: some browsers restrict a few things on `file://`. For the smoothest experience serve
> the folder over a tiny local web server, then open the printed URL:
> ```
> cd trackzo-html
> python -m http.server 8000       # then visit http://localhost:8000
> # or:  npx serve .
> ```

Styling uses **Tailwind (CDN)** + **Google Fonts**, so an internet connection is needed for
the design to render — exactly like the original app.

## Sign in

Data is seeded on first load, including two demo accounts:

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | `admin@gmail.com`   | `admin123`|
| Member| `rajesh@buildcorp.in`| `demo123`|

The sign-in form is pre-filled with the admin account. You can also create new accounts on
the **Sign Up** tab (the `admin@gmail.com` email is the only one with Admin-Panel access).

## What persists

Every change you make (add/edit/delete a client, project, transaction, workspace record,
your profile/password, etc.) is written to `localStorage` under the key `trackzo_db`, so it
survives page reloads and browser restarts on that device/browser.

**To reset everything to the seeded sample data**, open the browser console and run:
```js
TZ.db.reset(); location.reload();
```
or clear the site's storage from DevTools → Application → Local Storage.

---

## Structure

```
trackzo-html/
├─ index.html            Dashboard
├─ login.html            Sign in / Sign up
├─ clients.html  projects.html  materials.html  purchase.html
├─ finance.html  estimation.html  reports.html  calendar.html
├─ account_tracker.html  settings.html  admin.html
├─ workspace.html        Per-project workspace (13 sub-sections)
├─ report.html           Printable report (Export PDF target)
└─ assets/
   ├─ tailwind.config.js  Tailwind theme (navy/brand colors, fonts)
   ├─ styles.css          Base + sidebar styles
   ├─ icons.js            Inline lucide-style SVG icons
   ├─ store.js            localStorage DB, seed data, ₹ formatting, mock auth, flashes
   ├─ app.js              Shared shell (sidebar/topbar), login guard, form-field helpers
   └─ pages/              One script per page (dashboard.js, clients.js, … workspace.js)
```

Each `*.html` is a thin shell that loads the shared scripts plus its own `assets/pages/*.js`,
which renders the page into `#app`.

## Notes / differences from the PHP version

- **Backend removed.** MySQL → `localStorage`; PHP sessions → a mock login stored in
  `localStorage`. Passwords are **not** hashed (there's no server) — this is a demo/offline
  build, not a secure multi-user deployment.
- **Reports export** — *Export Excel* downloads a real `.xls` (opens in Excel/Sheets);
  *Export PDF* opens `report.html` and triggers the browser's print dialog (Save as PDF).
- **Workspace documents** — file uploads are stored inline (as data URLs) in `localStorage`.
  Files over ~1.5 MB are recorded without the attachment to stay within browser storage
  limits (the original saved them to an `uploads/` folder on the server).
- Currency is **Indian Rupees (₹)** with Indian grouping (`₹48,00,000`, `₹4.8Cr`, `₹3.2L`),
  matching the original.
- **Mobile responsive** and the desktop icon-rail sidebar collapse both work as before.
