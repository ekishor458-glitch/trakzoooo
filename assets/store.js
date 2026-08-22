/* Trackzo — client-side data store, formatting helpers, mock auth & flash.
 * Replaces config.php / helpers.php / MySQL with localStorage. */
(function () {
  var CUR = '₹';                 // Indian Rupee
  var APP_NAME = 'Trackzo';
  var ADMIN_EMAIL = 'admin@gmail.com';
  var DB_KEY = 'trackzo_db';
  var USER_KEY = 'trackzo_user';
  var FLASH_KEY = 'trackzo_flash';

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

  /* ---------------- localStorage DB ---------------- */
  var TABLES = ['users', 'clients', 'projects', 'materials', 'purchase_orders', 'transactions',
    'accounts', 'calendar_events', 'estimation_items', 'project_details', 'project_materials',
    'project_expenses', 'project_estimates', 'project_progress', 'project_documents', 'project_notes'];

  var DB = null;
  function load() {
    if (DB) return DB;
    try { DB = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { DB = null; }
    if (!DB) { DB = seed(); persist(); }
    // ensure every table exists (forward-compat)
    TABLES.forEach(function (t) { if (!DB[t]) DB[t] = []; });
    return DB;
  }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); return true; } catch (e) { return false; } }

  function nextId(t) {
    var rows = DB[t], max = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].id > max) max = rows[i].id;
    return max + 1;
  }
  var db = {
    all: function (t) { load(); return DB[t].slice(); },
    where: function (t, fn) { load(); return DB[t].filter(fn); },
    get: function (t, id) { load(); id = +id; return DB[t].filter(function (r) { return r.id === id; })[0] || null; },
    insert: function (t, obj) { load(); obj.id = nextId(t); DB[t].push(obj); persist(); return obj.id; },
    update: function (t, id, patch) { load(); var r = db.get(t, id); if (r) { Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); persist(); } return r; },
    remove: function (t, id) { load(); id = +id; DB[t] = DB[t].filter(function (r) { return r.id !== id; }); persist(); },
    removeWhere: function (t, fn) { load(); DB[t] = DB[t].filter(function (r) { return !fn(r); }); persist(); },
    // project_details keyed by project_id (one row per project)
    detail: function (pid) {
      load(); pid = +pid;
      var r = DB.project_details.filter(function (d) { return d.project_id === pid; })[0];
      if (!r) { r = { project_id: pid }; DB.project_details.push(r); persist(); }
      return r;
    },
    saveDetail: function (pid, patch) {
      var r = db.detail(pid);
      Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
      persist(); return r;
    },
    save: persist,
    reset: function () { localStorage.removeItem(DB_KEY); DB = null; load(); },
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

  /* ---------------- Auth (mock) ---------------- */
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

  /* ---------------- Seed data ---------------- */
  function seed() {
    var d = {};
    TABLES.forEach(function (t) { d[t] = []; });

    d.users = [
      { id: 1, name: 'Administrator', email: ADMIN_EMAIL, password: 'admin123', role: 'Administrator', last_login: nowStamp(), created_at: daysAgo(120) },
      { id: 2, name: 'Rajesh Kumar', email: 'rajesh@buildcorp.in', password: 'demo123', role: 'Project Manager', last_login: daysAgo(1), created_at: daysAgo(60) },
    ];

    d.clients = [
      { id: 1, name: 'Arjun Reddy', company: 'Reddy Estates', email: 'arjun@reddyestates.in', phone: '+91 98450 11223', address: '12 MG Road', city: 'Bengaluru', status: 'active', joined_date: daysAgo(300), created_at: daysAgo(300) },
      { id: 2, name: 'Priya Sharma', company: 'Sharma Developers', email: 'priya@sharmadev.in', phone: '+91 99870 44556', address: '45 Linking Road', city: 'Mumbai', status: 'active', joined_date: daysAgo(220), created_at: daysAgo(220) },
      { id: 3, name: 'Anil Mehta', company: 'Mehta Constructions', email: 'anil@mehtacon.in', phone: '+91 98110 77889', address: '88 Connaught Place', city: 'New Delhi', status: 'active', joined_date: daysAgo(180), created_at: daysAgo(180) },
      { id: 4, name: 'Deepa Nair', company: 'Coastal Realty', email: 'deepa@coastalrealty.in', phone: '+91 94470 22110', address: '7 Marine Drive', city: 'Kochi', status: 'inactive', joined_date: daysAgo(150), created_at: daysAgo(150) },
      { id: 5, name: 'Vikram Singh', company: 'Skyline Infra', email: 'vikram@skylineinfra.in', phone: '+91 90000 33445', address: '23 Sector 44', city: 'Gurugram', status: 'active', joined_date: daysAgo(90), created_at: daysAgo(90) },
    ];

    d.projects = [
      { id: 1, name: 'Green Villa Residency', client_id: 1, site_address: '14 Whitefield, Bengaluru', type: 'Residential Villa', status: 'active', budget: 48000000, spent: 31200000, progress: 65, start_date: daysAgo(200), end_date: daysAgo(-160), area: 12000, floors: 3, manager: 'Rajesh Kumar', description: 'Premium 3-floor villa community with 8 units.', created_at: daysAgo(200) },
      { id: 2, name: 'Skyline Business Tower', client_id: 5, site_address: 'Sector 44, Gurugram', type: 'Commercial High-Rise', status: 'active', budget: 130000000, spent: 58500000, progress: 45, start_date: daysAgo(150), end_date: daysAgo(-300), area: 45000, floors: 14, manager: 'Rajesh Kumar', description: 'Grade-A office tower, 14 floors with basement parking.', created_at: daysAgo(150) },
      { id: 3, name: 'Coastal Apartments Phase 1', client_id: 4, site_address: 'Marine Drive, Kochi', type: 'Residential Apartments', status: 'on-hold', budget: 32000000, spent: 9600000, progress: 20, start_date: daysAgo(120), end_date: daysAgo(-240), area: 22000, floors: 6, manager: 'Deepa Nair', description: 'Sea-facing apartment block, 24 units.', created_at: daysAgo(120) },
      { id: 4, name: 'Mehta Office Renovation', client_id: 3, site_address: 'Connaught Place, New Delhi', type: 'Interior / Renovation', status: 'completed', budget: 8500000, spent: 8320000, progress: 100, start_date: daysAgo(260), end_date: daysAgo(30), area: 4500, floors: 2, manager: 'Anil Mehta', description: 'Full interior renovation of corporate HQ.', created_at: daysAgo(260) },
      { id: 5, name: 'Sharma Retail Plaza', client_id: 2, site_address: 'Linking Road, Mumbai', type: 'Commercial Retail', status: 'planning', budget: 62000000, spent: 3100000, progress: 8, start_date: daysAgo(20), end_date: daysAgo(-400), area: 18000, floors: 4, manager: 'Priya Sharma', description: 'Mixed-use retail plaza with food court.', created_at: daysAgo(20) },
    ];

    d.materials = [
      { id: 1, name: 'Portland Cement OPC 53', category: 'Cement', unit: 'Bags (50kg)', stock: 420, min_stock: 200, rate: 410, supplier: 'Atlas Cement Co.', last_updated: daysAgo(5) },
      { id: 2, name: 'TMT Steel Bars Fe500', category: 'Steel', unit: 'Tonnes', stock: 18, min_stock: 25, rate: 62000, supplier: 'JSW Steel', last_updated: daysAgo(3) },
      { id: 3, name: 'River Sand', category: 'Sand', unit: 'Cu.ft', stock: 3200, min_stock: 1000, rate: 55, supplier: 'Ganga Aggregates', last_updated: daysAgo(8) },
      { id: 4, name: 'Red Clay Bricks', category: 'Bricks', unit: 'Nos', stock: 45000, min_stock: 20000, rate: 9, supplier: 'Kumar Brick Works', last_updated: daysAgo(10) },
      { id: 5, name: '20mm Aggregate', category: 'Aggregate', unit: 'Cu.ft', stock: 850, min_stock: 1200, rate: 48, supplier: 'Ganga Aggregates', last_updated: daysAgo(6) },
      { id: 6, name: 'Vitrified Floor Tiles', category: 'Tiles', unit: 'Sq.ft', stock: 6400, min_stock: 2000, rate: 78, supplier: 'Kajaria Ceramics', last_updated: daysAgo(2) },
      { id: 7, name: 'Emulsion Paint', category: 'Paint', unit: 'Litres', stock: 180, min_stock: 250, rate: 320, supplier: 'Asian Paints', last_updated: daysAgo(4) },
    ];

    d.purchase_orders = [
      { id: 1, supplier: 'Atlas Cement Co.', item: 'Portland Cement OPC 53', qty: 500, rate: 410, total: 205000, status: 'delivered', order_date: daysAgo(25), expected_date: daysAgo(18), project_id: 1 },
      { id: 2, supplier: 'JSW Steel', item: 'TMT Steel Bars Fe500', qty: 30, rate: 62000, total: 1860000, status: 'approved', order_date: daysAgo(12), expected_date: daysAgo(-4), project_id: 2 },
      { id: 3, supplier: 'Kajaria Ceramics', item: 'Vitrified Floor Tiles', qty: 4000, rate: 78, total: 312000, status: 'pending', order_date: daysAgo(5), expected_date: daysAgo(-10), project_id: 1 },
      { id: 4, supplier: 'Ganga Aggregates', item: '20mm Aggregate', qty: 2000, rate: 48, total: 96000, status: 'delivered', order_date: daysAgo(30), expected_date: daysAgo(26), project_id: 3 },
      { id: 5, supplier: 'Asian Paints', item: 'Emulsion Paint', qty: 300, rate: 320, total: 96000, status: 'cancelled', order_date: daysAgo(40), expected_date: daysAgo(33), project_id: 4 },
    ];

    d.transactions = [
      { id: 1, txn_date: daysAgo(160), description: 'Client Payment - Green Villa Phase 1', category: 'Client Receipt', type: 'income', amount: 12000000, status: 'paid', project_id: 1 },
      { id: 2, txn_date: daysAgo(150), description: 'Steel purchase - Skyline', category: 'Materials', type: 'expense', amount: 4200000, status: 'paid', project_id: 2 },
      { id: 3, txn_date: daysAgo(130), description: 'Labour wages - March', category: 'Labour', type: 'expense', amount: 1850000, status: 'paid', project_id: 1 },
      { id: 4, txn_date: daysAgo(120), description: 'Client Payment - Skyline advance', category: 'Client Receipt', type: 'income', amount: 25000000, status: 'paid', project_id: 2 },
      { id: 5, txn_date: daysAgo(95), description: 'Cement & aggregate', category: 'Materials', type: 'expense', amount: 980000, status: 'paid', project_id: 1 },
      { id: 6, txn_date: daysAgo(80), description: 'Equipment rental - crane', category: 'Equipment', type: 'expense', amount: 640000, status: 'paid', project_id: 2 },
      { id: 7, txn_date: daysAgo(65), description: 'Client Payment - Mehta final', category: 'Client Receipt', type: 'income', amount: 8320000, status: 'paid', project_id: 4 },
      { id: 8, txn_date: daysAgo(55), description: 'Subcontractor - plumbing', category: 'Subcontractor', type: 'expense', amount: 720000, status: 'paid', project_id: 1 },
      { id: 9, txn_date: daysAgo(40), description: 'Labour wages - June', category: 'Labour', type: 'expense', amount: 2100000, status: 'pending', project_id: 2 },
      { id: 10, txn_date: daysAgo(30), description: 'Client Payment - Coastal advance', category: 'Client Receipt', type: 'income', amount: 6000000, status: 'paid', project_id: 3 },
      { id: 11, txn_date: daysAgo(20), description: 'Transport & logistics', category: 'Transport', type: 'expense', amount: 310000, status: 'overdue', project_id: 2 },
      { id: 12, txn_date: daysAgo(10), description: 'Site permits & approvals', category: 'Permits', type: 'expense', amount: 450000, status: 'paid', project_id: 5 },
      { id: 13, txn_date: daysAgo(5), description: 'Client Payment - Sharma booking', category: 'Client Receipt', type: 'income', amount: 3100000, status: 'pending', project_id: 5 },
      { id: 14, txn_date: daysAgo(2), description: 'Tiles & finishing', category: 'Materials', type: 'expense', amount: 890000, status: 'paid', project_id: 1 },
    ];

    d.accounts = [
      { id: 1, name: 'HDFC Business Current', type: 'bank', balance: 18500000, currency: 'INR', last_transaction: daysAgo(2) },
      { id: 2, name: 'Petty Cash Box', type: 'cash', balance: 240000, currency: 'INR', last_transaction: daysAgo(1) },
      { id: 3, name: 'ICICI Corporate Card', type: 'credit', balance: -680000, currency: 'INR', last_transaction: daysAgo(4) },
    ];

    var curYm = todayISO().slice(0, 7);
    function dayThis(day) { return curYm + '-' + pad(day); }
    d.calendar_events = [
      { id: 1, title: 'Site inspection - Green Villa', event_date: dayThis(5), type: 'inspection', event_time: '10:00', project_id: 1 },
      { id: 2, title: 'Steel delivery - Skyline', event_date: dayThis(9), type: 'delivery', event_time: '08:30', project_id: 2 },
      { id: 3, title: 'Client meeting - Sharma Plaza', event_date: dayThis(14), type: 'meeting', event_time: '15:00', project_id: 5 },
      { id: 4, title: 'Phase 2 handover deadline', event_date: dayThis(20), type: 'deadline', event_time: '', project_id: 1 },
      { id: 5, title: 'Pour concrete - 4th floor', event_date: dayThis(24), type: 'task', event_time: '07:00', project_id: 2 },
      { id: 6, title: 'Safety audit', event_date: dayThis(28), type: 'inspection', event_time: '11:00', project_id: null },
    ];

    d.estimation_items = [
      { id: 1, description: 'Excavation & earthwork', unit: 'Cu.ft', qty: 3200, rate: 45, tax: 8, discount: 0 },
      { id: 2, description: 'RCC foundation', unit: 'Cu.ft', qty: 1800, rate: 320, tax: 18, discount: 5 },
      { id: 3, description: 'Brick masonry', unit: 'Sq.ft', qty: 6400, rate: 55, tax: 12, discount: 0 },
      { id: 4, description: 'Plastering (internal + external)', unit: 'Sq.ft', qty: 9200, rate: 28, tax: 12, discount: 0 },
      { id: 5, description: 'Flooring - vitrified tiles', unit: 'Sq.ft', qty: 5400, rate: 95, tax: 18, discount: 10 },
    ];

    // ---- Workspace data for project 1 (Green Villa Residency) ----
    d.project_details = [{
      project_id: 1,
      customer_name: 'Arjun Reddy', customer_company: 'Reddy Estates', customer_email: 'arjun@reddyestates.in', customer_phone: '+91 98450 11223',
      owner_name: 'Arjun Reddy', owner_email: 'arjun@reddyestates.in', owner_phone: '+91 98450 11223', owner_address: '12 MG Road, Bengaluru',
      site_address: '14 Whitefield Main Road', site_city: 'Bengaluru', site_state: 'Karnataka', site_pincode: '560066', site_maplink: 'https://maps.google.com',
      plot_length: 120, plot_width: 100, plot_area: 12000, builtup_sqft: 9600,
      construction_type: 'RCC Framed', structure_type: 'G+2', foundation_type: 'Isolated Footing', roofing_type: 'Flat RCC Slab',
      num_floors: 3, num_units: 8, construction_notes: 'Vaastu-compliant layout. Premium fittings throughout.',
    }];

    d.project_materials = [
      { id: 1, project_id: 1, name: 'Portland Cement OPC 53', category: 'Cement', quantity: 600, unit: 'Bags', cost: 410, supplier: 'Atlas Cement Co.', purchase_date: daysAgo(40), used_qty: 420, total_cost: 246000 },
      { id: 2, project_id: 1, name: 'TMT Steel Bars', category: 'Steel', quantity: 22, unit: 'MT', cost: 62000, supplier: 'JSW Steel', purchase_date: daysAgo(35), used_qty: 16, total_cost: 1364000 },
      { id: 3, project_id: 1, name: 'Red Clay Bricks', category: 'Bricks', quantity: 40000, unit: 'Nos', cost: 9, supplier: 'Kumar Brick Works', purchase_date: daysAgo(30), used_qty: 32000, total_cost: 360000 },
      { id: 4, project_id: 1, name: 'Vitrified Tiles', category: 'Tiles', quantity: 5000, unit: 'Sq.ft', cost: 78, supplier: 'Kajaria Ceramics', purchase_date: daysAgo(12), used_qty: 1200, total_cost: 390000 },
    ];

    d.project_expenses = [
      { id: 1, project_id: 1, exp_date: daysAgo(120), category: 'Labour', description: 'Mason & helper wages - Mar', amount: 850000 },
      { id: 2, project_id: 1, exp_date: daysAgo(90), category: 'Equipment', description: 'Concrete mixer rental', amount: 120000 },
      { id: 3, project_id: 1, exp_date: daysAgo(60), category: 'Labour', description: 'Wages - May', amount: 920000 },
      { id: 4, project_id: 1, exp_date: daysAgo(35), category: 'Subcontractor', description: 'Electrical wiring', amount: 480000 },
      { id: 5, project_id: 1, exp_date: daysAgo(15), category: 'Transport', description: 'Material transport', amount: 95000 },
    ];

    d.project_estimates = [
      { id: 1, project_id: 1, description: 'RCC slab casting', unit: 'Sq.ft', qty: 9600, rate: 180, amount: 1728000 },
      { id: 2, project_id: 1, description: 'Brick masonry work', unit: 'Sq.ft', qty: 6400, rate: 55, amount: 352000 },
      { id: 3, project_id: 1, description: 'Interior finishing', unit: 'Sq.ft', qty: 9600, rate: 220, amount: 2112000 },
    ];

    d.project_progress = [
      { id: 1, project_id: 1, log_date: daysAgo(150), stage: 'Foundation', percent: 20, status: 'On track', note: 'Footings completed' },
      { id: 2, project_id: 1, log_date: daysAgo(90), stage: 'Structure - G+1', percent: 45, status: 'On track', note: 'Slabs cast' },
      { id: 3, project_id: 1, log_date: daysAgo(30), stage: 'Brickwork & plastering', percent: 65, status: 'On track', note: 'Masonry 80% done' },
    ];

    d.project_notes = [
      { id: 1, project_id: 1, body: 'Client requested premium modular kitchen in units 3 & 4.', created_at: daysAgo(20) },
      { id: 2, project_id: 1, body: 'Confirm tile shade with architect before next order.', created_at: daysAgo(6) },
    ];

    d.project_documents = [
      { id: 1, project_id: 1, title: 'Approved Building Plan', category: 'Plan', doc_date: daysAgo(190), filename: null, note: 'Sanctioned by BBMP' },
      { id: 2, project_id: 1, title: 'Site Photographs - June', category: 'Photo', doc_date: daysAgo(60), filename: null, note: '' },
    ];

    return d;
  }

  /* ---------------- Public API ---------------- */
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
  };
})();
