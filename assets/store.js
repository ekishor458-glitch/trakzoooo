/* Trackzo — client-side data store, formatting helpers, mock auth & flash.
 *
 * Data layer: a synchronous in-memory cache (mirrored to localStorage for
 * offline use) that is BACKED BY SUPABASE. On load it pulls every table from
 * Supabase into the cache; every insert/update/delete updates the cache
 * instantly AND is pushed to Supabase through a retry queue ("outbox") so
 * nothing is lost on reload or a flaky connection. If Supabase is not
 * configured (or unreachable) it degrades gracefully to localStorage-only.
 */
(function () {
  /* ============================================================
   *  >>> SUPABASE CONFIG — paste your two project values here <<<
   *  Supabase dashboard → Project Settings → API
   *  ------------------------------------------------------------ */
  var SUPABASE_URL = 'https://vezbjypksmytgxoyoces.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_HeRomgyg0n81ASamLnCLQA_aDE-Wx3I';  // Supabase Publishable key
  /* ============================================================ */

  var CUR = '₹';                 // Indian Rupee
  var APP_NAME = 'Trackzo';
  var ADMIN_EMAIL = 'admin@gmail.com';
  var DB_KEY = 'trackzo_db';
  var USER_KEY = 'trackzo_user';
  var FLASH_KEY = 'trackzo_flash';
  var OUTBOX_KEY = 'trackzo_outbox';
  var VER_KEY = 'trackzo_db_v';
  var DB_VERSION = 2;   // bump to force a one-time wipe of stale local business data

  /* ---------------- Formatting (ports of helpers.php) ---------------- */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  // Indian digit grouping, integer, no symbol: 4800000 -> "48,00,000"
  function inrGroup(n) {
    n = Number(n) || 0;
    var s = String(Math.round(Math.abs(n)));
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    if (rest !== '') { rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ','); last3 = ',' + last3; }
    return rest + last3;
  }
  // trim trailing zeros of a 1-dp number: 4.80 -> "4.8", 5.00 -> "5"
  function numTrim(v) {
    var s = (Math.round(v * 10) / 10).toFixed(1);
    return s.replace(/\.0$/, '');
  }
  // number_format(v, dec) with US grouping, trailing zeros trimmed (for qty/tax)
  function trimNum(v, dec) {
    dec = dec == null ? 2 : dec;
    var s = (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  // Full money: ₹12,34,567 (sign before symbol)
  function money(n) {
    n = Number(n) || 0;
    return (n < 0 ? '-' : '') + CUR + inrGroup(Math.abs(n));
  }
  // Compact money: ₹4.8Cr / ₹3.2L / ₹45K
  function moneyShort(n) {
    n = Number(n) || 0;
    var neg = n < 0 ? '-' : '';
    var a = Math.abs(n);
    if (a >= 10000000) return neg + CUR + numTrim(a / 10000000) + 'Cr';
    if (a >= 100000) return neg + CUR + numTrim(a / 100000) + 'L';
    if (a >= 1000) return neg + CUR + Math.round(a / 1000) + 'K';
    return neg + CUR + Math.round(a);
  }
  function ucfirst(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function dashToSpace(s) { return String(s || '').replace(/-/g, ' '); }

  /* ---------------- Dates ---------------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { if (!s) return null; var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  // PHP date('l, F j, Y')
  function fmtLongToday() { var d = new Date(); return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function nowStamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  /* ---------------- Tables ---------------- */
  // 'users' stays local-only (browser auth). Everything else syncs to Supabase.
  var TABLES = ['users', 'clients', 'projects', 'materials', 'purchase_orders', 'transactions',
    'accounts', 'calendar_events', 'estimation_items', 'project_details', 'project_materials',
    'project_expenses', 'project_estimates', 'project_progress', 'project_documents', 'project_notes'];
  var CLOUD_TABLES = TABLES.filter(function (t) { return t !== 'users'; });
  function isCloud(t) { return CLOUD_TABLES.indexOf(t) >= 0; }
  // tables keyed by something other than "id"
  var KEY_COL = { project_details: 'project_id' };
  function keyOf(t) { return KEY_COL[t] || 'id'; }

  /* ---------------- Supabase client ---------------- */
  var SB = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function initSupabase() {
    if (SB) return Promise.resolve(SB);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return Promise.resolve(null);
    return loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')
      .then(function () { SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return SB; })
      .catch(function () { SB = null; return null; });
  }
  TZ_configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

  /* ---------------- In-memory cache (mirrored to localStorage) ---------------- */
  var DB = null;
  function loadLocal() {
    if (DB) return DB;
    try { DB = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { DB = null; }
    if (!DB) DB = {};
    TABLES.forEach(function (t) { if (!DB[t]) DB[t] = []; });
    // One-time migration: wipe stale seeded/demo business data left in the browser
    // by older versions. Skipped if there are unsynced local writes waiting.
    var storedV = 0;
    try { storedV = parseInt(localStorage.getItem(VER_KEY) || '0', 10) || 0; } catch (e) {}
    if (storedV < DB_VERSION) {
      if (!getOutbox().length) CLOUD_TABLES.forEach(function (t) { DB[t] = []; });
      try { localStorage.setItem(VER_KEY, String(DB_VERSION)); } catch (e) {}
    }
    if (!DB.users || !DB.users.length) DB.users = seedAdmin();   // ensure an admin login always exists
    persist();
    return DB;
  }
  function load() { return loadLocal(); }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); return true; } catch (e) { return false; } }

  function nextId(t) {
    var rows = DB[t], max = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].id > max) max = rows[i].id;
    return max + 1;
  }

  /* ---------------- Outbox (pending Supabase writes) ---------------- */
  function getOutbox() { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { return []; } }
  function setOutbox(a) { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(a)); } catch (e) {} }
  function sanitize(row) { var o = {}; Object.keys(row).forEach(function (k) { var v = row[k]; o[k] = (v === '' ? null : v); }); return o; }
  function enqueue(op) {
    if (!TZ_configured) return;                 // no cloud → nothing to queue
    if (op.op === 'upsert') op.row = sanitize(op.row);
    var a = getOutbox(); a.push(op); setOutbox(a);
    scheduleFlush();
  }
  // Re-apply not-yet-synced writes on top of freshly pulled server data,
  // so optimistic changes stay visible until the server confirms them.
  function applyOutbox() {
    getOutbox().forEach(function (op) {
      var rows = DB[op.table]; if (!rows) return;
      var key = op.key || 'id';
      if (op.op === 'delete') {
        DB[op.table] = rows.filter(function (r) { return String(r[key]) !== String(op.id); });
      } else if (op.op === 'upsert') {
        var i = -1;
        for (var j = 0; j < rows.length; j++) { if (String(rows[j][key]) === String(op.row[key])) { i = j; break; } }
        if (i >= 0) rows[i] = op.row; else rows.push(op.row);
      }
    });
  }
  var flushing = false;
  function flushOutbox() {
    if (!SB) return Promise.resolve();
    if (flushing) return Promise.resolve();
    var a = getOutbox();
    if (!a.length) return Promise.resolve();
    flushing = true;
    var remaining = [];
    var chain = Promise.resolve();
    a.forEach(function (op) {
      chain = chain.then(function () {
        var q;
        if (op.op === 'delete') q = SB.from(op.table).delete().eq(op.key || 'id', op.id);
        else q = SB.from(op.table).upsert(op.row, (op.key && op.key !== 'id') ? { onConflict: op.key } : undefined);
        return q.then(function (res) { if (res && res.error) { remaining.push(op); } });
      }).catch(function () { remaining.push(op); });
    });
    return chain.then(function () { setOutbox(remaining); flushing = false; })
      .catch(function () { flushing = false; });
  }
  function scheduleFlush() { if (TZ_configured) setTimeout(flushOutbox, 0); }

  /* ---------------- Pull all tables from Supabase ---------------- */
  function pullAll() {
    if (!SB) return Promise.resolve();
    return Promise.all(CLOUD_TABLES.map(function (t) {
      return SB.from(t).select('*').then(function (res) {
        if (res.error) { if (window.console) console.warn('[Trackzo] pull ' + t + ':', res.error.message); return; }
        DB[t] = res.data || [];
      }, function () { /* network error: keep local copy */ });
    })).then(function () { applyOutbox(); persist(); });
  }

  /* ---------------- Bootstrap (awaited by every page via TZ.ready) ---------------- */
  function bootstrap() {
    loadLocal();
    return initSupabase().then(function (sb) {
      if (!sb) return;
      return pullAll().then(flushOutbox);
    }).catch(function () {});
  }

  /* ---------------- db API (synchronous reads; write-through writes) ---------------- */
  var db = {
    all: function (t) { load(); return DB[t].slice(); },
    where: function (t, fn) { load(); return DB[t].filter(fn); },
    get: function (t, id) { load(); id = +id; return DB[t].filter(function (r) { return r.id === id; })[0] || null; },
    insert: function (t, obj) {
      load(); obj.id = nextId(t); DB[t].push(obj); persist();
      if (isCloud(t)) enqueue({ op: 'upsert', table: t, row: obj });
      return obj.id;
    },
    update: function (t, id, patch) {
      load(); var r = db.get(t, id);
      if (r) {
        Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); persist();
        if (isCloud(t)) enqueue({ op: 'upsert', table: t, row: r });
      }
      return r;
    },
    remove: function (t, id) {
      load(); id = +id; DB[t] = DB[t].filter(function (r) { return r.id !== id; }); persist();
      if (isCloud(t)) enqueue({ op: 'delete', table: t, id: id });
    },
    removeWhere: function (t, fn) {
      load(); var del = DB[t].filter(fn);
      DB[t] = DB[t].filter(function (r) { return !fn(r); }); persist();
      if (isCloud(t)) del.forEach(function (r) { enqueue({ op: 'delete', table: t, id: r.id }); });
    },
    // project_details keyed by project_id (one row per project)
    detail: function (pid) {
      load(); pid = +pid;
      var r = DB.project_details.filter(function (d) { return d.project_id === pid; })[0];
      if (!r) { r = { project_id: pid }; DB.project_details.push(r); persist(); enqueue({ op: 'upsert', table: 'project_details', row: r, key: 'project_id' }); }
      return r;
    },
    saveDetail: function (pid, patch) {
      var r = db.detail(pid);
      Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
      persist();
      enqueue({ op: 'upsert', table: 'project_details', row: r, key: 'project_id' });
      return r;
    },
    save: function () { persist(); scheduleFlush(); return true; },
    reset: function () { localStorage.removeItem(DB_KEY); localStorage.removeItem(OUTBOX_KEY); DB = null; load(); },
  };

  /* ---------------- Flash messages ---------------- */
  function flash(msg, type) {
    var arr = [];
    try { arr = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]'); } catch (e) {}
    arr.push({ msg: msg, type: type || 'success' });
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(arr));
  }
  function takeFlashes() {
    var arr = [];
    try { arr = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]'); } catch (e) {}
    sessionStorage.removeItem(FLASH_KEY);
    return arr;
  }

  /* ---------------- misc page helpers ---------------- */
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function formData(form) { var o = {}; new FormData(form).forEach(function (v, k) { o[k] = v; }); return o; }

  /* ---------------- Auth (browser-local; see SETUP for real auth) ---------------- */
  function currentUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function isAdmin() { var u = currentUser(); return !!(u && String(u.email).toLowerCase() === ADMIN_EMAIL); }
  function logout() { localStorage.removeItem(USER_KEY); location.href = 'login.html'; }
  function requireLogin() { if (!currentUser()) { location.replace('login.html'); return false; } return true; }

  function signin(email, password) {
    load(); email = String(email || '').trim();
    var u = DB.users.filter(function (x) { return String(x.email).toLowerCase() === email.toLowerCase(); })[0];
    if (!u || u.password !== password) return { error: 'Invalid email or password.' };
    u.last_login = nowStamp(); persist();
    setUser({ id: u.id, name: u.name, email: u.email, role: u.role });
    return { ok: true };
  }
  function signup(name, email, password, confirm) {
    load(); name = String(name || '').trim(); email = String(email || '').trim();
    if (!name || !email || !password) return { error: 'Please fill in all fields.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
    if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
    if (password !== confirm) return { error: 'Passwords do not match.' };
    if (DB.users.some(function (x) { return String(x.email).toLowerCase() === email.toLowerCase(); }))
      return { error: 'An account with that email already exists.' };
    var role = email.toLowerCase() === ADMIN_EMAIL ? 'Administrator' : 'Member';
    var id = db.insert('users', { name: name, email: email, password: password, role: role, last_login: nowStamp(), created_at: todayISO() });
    setUser({ id: id, name: name, email: email, role: role });
    return { ok: true };
  }

  /* ---------------- Report data (shared by reports.js + report.js) ---------------- */
  function reportStamp() {
    var d = new Date();
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function reportData() {
    var txns = db.all('transactions'), projects = db.all('projects'), clients = db.all('clients');
    function n(v) { return Number(v) || 0; }
    var income = txns.filter(function (t) { return t.type === 'income'; }).reduce(function (a, t) { return a + n(t.amount); }, 0);
    var expense = txns.filter(function (t) { return t.type === 'expense'; }).reduce(function (a, t) { return a + n(t.amount); }, 0);
    var pending = txns.filter(function (t) { return t.status === 'pending' || t.status === 'overdue'; }).reduce(function (a, t) { return a + n(t.amount); }, 0);

    var catMap = {};
    txns.filter(function (t) { return t.type === 'expense'; }).forEach(function (t) { var c = t.category || ''; catMap[c] = (catMap[c] || 0) + n(t.amount); });
    var byCat = Object.keys(catMap).map(function (k) { return { category: k, total: catMap[k] }; }).sort(function (a, b) { return b.total - a.total; });
    var catMax = 1; byCat.forEach(function (c) { catMax = Math.max(catMax, c.total); });

    var projUtil = projects.slice().sort(function (a, b) { return n(b.budget) - n(a.budget); })
      .map(function (p) { return { name: p.name, budget: n(p.budget), spent: n(p.spent) }; });

    var topClients = clients.map(function (c) {
      var mine = projects.filter(function (p) { return p.client_id === c.id; });
      return { name: c.name, company: c.company, val: mine.reduce(function (a, p) { return a + n(p.budget); }, 0), pc: mine.length };
    }).sort(function (a, b) { return b.val - a.val; });

    var projName = {}; projects.forEach(function (p) { projName[p.id] = p.name; });
    var ledger = txns.slice().sort(function (a, b) { var d = String(b.txn_date).localeCompare(String(a.txn_date)); return d !== 0 ? d : b.id - a.id; })
      .map(function (t) { return { txn_date: t.txn_date, description: t.description, category: t.category, type: t.type, amount: n(t.amount), status: t.status, pname: projName[t.project_id] || '' }; });

    return { income: income, expense: expense, pending: pending, net: income - expense, profit: income - expense, byCat: byCat, catMax: catMax, projUtil: projUtil, topClients: topClients, txns: ledger };
  }

  /* ---------------- Seed: admin login only (no business dummy data) ---------------- */
  function seedAdmin() {
    return [{ id: 1, name: 'Administrator', email: ADMIN_EMAIL, password: 'admin123', role: 'Administrator', last_login: nowStamp(), created_at: todayISO() }];
  }

  /* ---------------- Public API ---------------- */
  var TZ_configured;
  window.TZ = {
    CUR: CUR, APP_NAME: APP_NAME, ADMIN_EMAIL: ADMIN_EMAIL,
    esc: esc, inrGroup: inrGroup, money: money, moneyShort: moneyShort, numTrim: numTrim, trimNum: trimNum,
    ucfirst: ucfirst, dashToSpace: dashToSpace,
    todayISO: todayISO, daysAgo: daysAgo, parseISO: parseISO, fmtLongToday: fmtLongToday, nowStamp: nowStamp,
    MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT, DAYS: DAYS, pad: pad,
    db: db, flash: flash, takeFlashes: takeFlashes, qs: qs, formData: formData,
    currentUser: currentUser, isAdmin: isAdmin, logout: logout, requireLogin: requireLogin,
    setSessionUser: setUser, signin: signin, signup: signup,
    reportData: reportData, reportStamp: reportStamp,
    cloudEnabled: TZ_configured,
  };

  // Kick off data load. Pages await TZ.ready before rendering.
  window.TZ.ready = bootstrap();
})();
