/* Admin Panel (ports admin.php) — restricted to ADMIN_EMAIL. */
(function () {
  if (!TZ.requireLogin()) return;
  if (!TZ.isAdmin()) { TZ.flash('That area is for administrators only.', 'error'); location.replace('index.html'); return; }

  var e = TZ.esc, icon = window.icon, money = TZ.money, moneyShort = TZ.moneyShort;
  var ADMIN = TZ.ADMIN_EMAIL;
  var badge = { active: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', 'on-hold': 'bg-amber-100 text-amber-700', planning: 'bg-slate-100 text-slate-600' };

  TZ.mount({ page: 'admin', title: 'Admin Panel' }, function (root) {
    var users = TZ.db.all('users');
    var projects = TZ.db.all('projects');
    var clients = TZ.db.all('clients');
    var txns = TZ.db.all('transactions');
    var today = TZ.todayISO();

    var totalUsers = users.length;
    var customers = users.filter(function (u) { return String(u.email).toLowerCase() !== ADMIN; }).length;
    var activeToday = users.filter(function (u) { return u.last_login && String(u.last_login).slice(0, 10) >= today; }).length;
    var totalProjects = projects.length;
    var activeProj = projects.filter(function (p) { return p.status === 'active'; }).length;
    var totalClients = clients.length;
    var portBudget = projects.reduce(function (a, p) { return a + (Number(p.budget) || 0); }, 0);
    var income = txns.filter(function (t) { return t.type === 'income'; }).reduce(function (a, t) { return a + (Number(t.amount) || 0); }, 0);
    var expense = txns.filter(function (t) { return t.type === 'expense'; }).reduce(function (a, t) { return a + (Number(t.amount) || 0); }, 0);

    var stats = [
      ['Total Users', totalUsers, 'users', 'bg-blue-50 text-blue-600', customers + ' customer' + (customers === 1 ? '' : 's') + ' + 1 admin'],
      ['Active Today', activeToday, 'activity', 'bg-emerald-50 text-emerald-600', 'logged in today'],
      ['Total Projects', totalProjects, 'building', 'bg-violet-50 text-violet-600', activeProj + ' active'],
      ['Total Clients', totalClients, 'user', 'bg-amber-50 text-amber-600', 'in directory'],
      ['Portfolio Budget', moneyShort(portBudget), 'dollar', 'bg-teal-50 text-teal-600', 'all projects'],
      ['Net (Inc − Exp)', moneyShort(income - expense), 'wallet', (income - expense < 0 ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'), 'company-wide'],
    ];

    // sort users: admin first, then created_at desc, id desc
    users.sort(function (a, b) {
      var aa = String(a.email).toLowerCase() === ADMIN ? 1 : 0, bb = String(b.email).toLowerCase() === ADMIN ? 1 : 0;
      if (aa !== bb) return bb - aa;
      var d = String(b.created_at || '').localeCompare(String(a.created_at || '')); return d !== 0 ? d : b.id - a.id;
    });
    projects.sort(function (a, b) { return b.id - a.id; });
    var cmap = {}; clients.forEach(function (c) { cmap[c.id] = c; });

    var statTiles = stats.map(function (s) {
      return '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">' +
        '<div class="w-9 h-9 rounded-xl ' + s[3] + ' flex items-center justify-center mb-2">' + icon(s[2], 17) + '</div>' +
        '<p class="text-2xl font-bold text-slate-900 font-display">' + e(s[1]) + '</p>' +
        '<p class="text-xs text-slate-500">' + e(s[0]) + '</p>' +
        '<p class="text-[11px] text-slate-400 mt-0.5">' + e(s[4]) + '</p></div>';
    }).join('');

    var userRows = users.map(function (u) {
      var ini = initials(u.name);
      var isAdmin = String(u.email).toLowerCase() === ADMIN;
      return '<tr class="hover:bg-slate-50/70 ' + (isAdmin ? 'bg-blue-50/40' : '') + '">' +
        '<td class="px-5 py-3"><div class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-full ' + (isAdmin ? 'bg-gradient-to-br from-blue-500 to-navy-800' : 'bg-gradient-to-br from-blue-400 to-blue-600') + ' flex items-center justify-center text-white text-xs font-bold flex-shrink-0">' + e(ini) + '</div>' +
          '<div class="min-w-0"><p class="font-semibold text-slate-800 truncate">' + e(u.name) + '</p><p class="text-xs text-slate-400 truncate">' + e(u.email) + '</p></div></div></td>' +
        '<td class="px-5 py-3 hidden md:table-cell text-slate-500">' + e(String(u.created_at || '').slice(0, 10)) + '</td>' +
        '<td class="px-5 py-3 text-slate-500">' + (u.last_login ? e(String(u.last_login).slice(0, 16)) : '<span class="text-slate-300">Never</span>') + '</td>' +
        '<td class="px-5 py-3 text-center">' + (isAdmin
          ? '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 inline-flex items-center gap-1">' + icon('shield', 11) + ' Admin</span>'
          : '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">Customer</span>') + '</td>' +
        '<td class="px-5 py-3"><div class="flex items-center justify-end gap-1.5">' +
          (isAdmin ? '<span class="text-[11px] text-slate-400">Protected</span>'
            : '<button data-del="' + u.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center" title="Delete user">' + icon('trash', 15) + '</button>') +
        '</div></td></tr>';
    }).join('');

    var projRows = projects.map(function (p) {
      var c = cmap[p.client_id];
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3 font-semibold text-slate-800">' + e(p.name) + '</td>' +
        '<td class="px-5 py-3 hidden lg:table-cell text-slate-500">' + e((c && c.name) || '—') + '</td>' +
        '<td class="px-5 py-3 text-right text-slate-700">' + money(p.budget) + '</td>' +
        '<td class="px-5 py-3 text-right text-rose-500">' + money(p.spent) + '</td>' +
        '<td class="px-5 py-3"><div class="flex items-center gap-2 justify-center"><div class="w-20 bg-slate-100 rounded-full h-1.5"><div class="h-1.5 rounded-full bg-blue-500" style="width:' + (p.progress | 0) + '%"></div></div><span class="text-[11px] text-slate-500">' + (p.progress | 0) + '%</span></div></td>' +
        '<td class="px-5 py-3 text-center"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (badge[p.status] || 'bg-slate-100 text-slate-600') + '">' + e(TZ.ucfirst(TZ.dashToSpace(p.status))) + '</span></td>' +
        '<td class="px-5 py-3 text-right"><a href="workspace.html?project=' + p.id + '" class="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5">Open ' + icon('arrow-up-right', 12) + '</a></td></tr>';
    }).join('');
    if (!projects.length) projRows = '<tr><td colspan="7" class="px-5 py-8 text-center text-slate-400">No projects yet.</td></tr>';

    root.innerHTML = '<div class="p-4 sm:p-6 space-y-4">' +
      '<div class="rounded-2xl p-5 text-white flex items-center gap-4" style="background:linear-gradient(135deg,#0F2B4C 0%,#1D4ED8 100%)">' +
        '<div class="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">' + icon('shield', 24) + '</div>' +
        '<div><p class="text-lg font-bold font-display">Administrator Console</p>' +
        '<p class="text-blue-200 text-sm">Admin access is restricted to <strong>' + e(ADMIN) + '</strong>. You can see every account and all company work here.</p></div></div>' +

      '<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">' + statTiles + '</div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h3 class="font-bold text-slate-900 text-sm font-display">User Accounts &amp; Logins</h3>' +
          '<p class="text-xs text-slate-400">Everyone who has signed up to the system</p></div>' +
          '<span class="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-lg">' + totalUsers + ' total</span></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">User</th><th class="px-5 py-3 font-semibold hidden md:table-cell">Joined</th>' +
          '<th class="px-5 py-3 font-semibold">Last login</th><th class="px-5 py-3 font-semibold text-center">Access</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Actions</th></tr></thead>' +
          '<tbody class="divide-y divide-slate-100">' + userRows + '</tbody></table></div></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h3 class="font-bold text-slate-900 text-sm font-display">All Projects (Company Work)</h3>' +
          '<p class="text-xs text-slate-400">Every project across the organisation</p></div>' +
          '<span class="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-lg">' + totalProjects + ' projects</span></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Project</th><th class="px-5 py-3 font-semibold hidden lg:table-cell">Client</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Budget</th><th class="px-5 py-3 font-semibold text-right">Spent</th>' +
          '<th class="px-5 py-3 font-semibold text-center">Progress</th><th class="px-5 py-3 font-semibold text-center">Status</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Open</th></tr></thead>' +
          '<tbody class="divide-y divide-slate-100">' + projRows + '</tbody></table></div></div>' +
      '</div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this user account?')) return;
      TZ.db.remove('users', b.getAttribute('data-del')); TZ.flash('User account deleted.', 'info'); location.reload();
    });
  });

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/);
    return (p[0].charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase();
  }
})();
