/* Dashboard (ports index.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, moneyShort = TZ.moneyShort;

  TZ.mount({ page: 'dashboard', title: 'Dashboard' }, function (root) {
    var projects = TZ.db.all('projects');
    var txns = TZ.db.all('transactions');

    var projCount = projects.length;
    var activeCount = projects.filter(function (p) { return p.status === 'active'; }).length;
    var totBudget = sum(projects, 'budget');
    var totSpent = sum(projects, 'spent');
    var income = txns.filter(function (t) { return t.type === 'income' && t.status === 'paid'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var expense = txns.filter(function (t) { return t.type === 'expense'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var pending = txns.filter(function (t) { return t.status === 'pending' || t.status === 'overdue'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var overdueCnt = txns.filter(function (t) { return t.status === 'overdue'; }).length;
    var overallProgress = totBudget > 0 ? Math.round(totSpent / totBudget * 100) : 0;

    // status donut
    var statusMap = { active: 0, completed: 0, planning: 0, 'on-hold': 0 };
    projects.forEach(function (p) { if (statusMap[p.status] != null) statusMap[p.status]++; });
    var statusColors = { active: '#1D4ED8', completed: '#10B981', planning: '#F59E0B', 'on-hold': '#EF4444' };
    var statusLabels = { active: 'Active', completed: 'Completed', planning: 'Planning', 'on-hold': 'On Hold' };
    var statusReal = Object.keys(statusMap).reduce(function (a, k) { return a + statusMap[k]; }, 0);
    var statusTotal = Math.max(1, statusReal);
    var acc = 0, segs = [];
    ['active', 'completed', 'planning', 'on-hold'].forEach(function (k) {
      var start = acc / statusTotal * 360; acc += statusMap[k]; var end = acc / statusTotal * 360;
      segs.push(statusColors[k] + ' ' + start + 'deg ' + end + 'deg');
    });
    var conic = statusReal > 0 ? 'conic-gradient(' + segs.join(',') + ')' : '#E2E8F0';

    // monthly income vs expense (last 6)
    var byMonth = {};
    txns.forEach(function (t) {
      var dt = TZ.parseISO(t.txn_date); if (!dt) return;
      var k = dt.getFullYear() + '-' + TZ.pad(dt.getMonth() + 1);
      if (!byMonth[k]) byMonth[k] = { label: TZ.MONTHS_SHORT[dt.getMonth()], income: 0, expense: 0 };
      byMonth[k][t.type] += num(t.amount);
    });
    var keys = Object.keys(byMonth).sort().slice(-6);
    var maxVal = 1;
    keys.forEach(function (k) { maxVal = Math.max(maxVal, byMonth[k].income, byMonth[k].expense); });

    var recentProjects = projects.slice().sort(byIdDesc).slice(0, 4);
    var recentTxns = txns.slice().sort(function (a, b) {
      var d = String(b.txn_date).localeCompare(String(a.txn_date)); return d !== 0 ? d : b.id - a.id;
    }).slice(0, 5);

    var statusBadge = { active: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', 'on-hold': 'bg-amber-100 text-amber-700', planning: 'bg-slate-100 text-slate-600' };

    var stats = [
      ['Total Projects', projCount, activeCount + ' active', 'folder', 'bg-blue-50', 'text-blue-600'],
      ['Total Budget', moneyShort(totBudget), 'Across all projects', 'dollar', 'bg-emerald-50', 'text-emerald-600'],
      ['Total Spent', moneyShort(totSpent), overallProgress + '% of budget', 'trending-down', 'bg-rose-50', 'text-rose-600'],
      ['Income (paid)', moneyShort(income), 'Received to date', 'trending-up', 'bg-teal-50', 'text-teal-600'],
      ['Expenses', moneyShort(expense), 'All transactions', 'package', 'bg-violet-50', 'text-violet-600'],
      ['Pending Payments', moneyShort(pending), overdueCnt + ' overdue', 'alert-circle', 'bg-orange-50', 'text-orange-600'],
    ];

    var h = '<div class="p-6 space-y-6">';

    // Stats
    h += '<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">';
    stats.forEach(function (s) {
      h += '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">' +
        '<div class="w-9 h-9 rounded-xl ' + s[4] + ' ' + s[5] + ' flex items-center justify-center mb-3">' + icon(s[3], 18) + '</div>' +
        '<p class="text-2xl font-bold text-slate-900 mb-0.5 font-display">' + e(s[1]) + '</p>' +
        '<p class="text-xs text-slate-500 mb-1">' + e(s[0]) + '</p>' +
        '<p class="text-[11px] text-slate-400">' + e(s[2]) + '</p></div>';
    });
    h += '</div>';

    // Charts row
    h += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';
    h += '<div class="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">' +
      '<div class="flex items-center justify-between mb-4"><div>' +
        '<h3 class="font-bold text-slate-900 text-sm font-display">Cash Flow</h3>' +
        '<p class="text-xs text-slate-400 mt-0.5">Monthly income vs. expenses</p></div>' +
        '<span class="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-lg">' + new Date().getFullYear() + '</span></div>' +
      '<div class="flex items-end gap-4 h-52 pt-4">';
    keys.forEach(function (k) {
      var mm = byMonth[k];
      h += '<div class="flex-1 flex flex-col items-center justify-end h-full gap-1">' +
        '<div class="flex items-end gap-1 w-full justify-center h-full">' +
          '<div class="w-1/2 max-w-[22px] rounded-t-md bg-blue-500" style="height:' + Math.max(2, mm.income / maxVal * 100) + '%" title="Income ' + money(mm.income) + '"></div>' +
          '<div class="w-1/2 max-w-[22px] rounded-t-md bg-rose-400" style="height:' + Math.max(2, mm.expense / maxVal * 100) + '%" title="Expense ' + money(mm.expense) + '"></div>' +
        '</div><span class="text-[11px] text-slate-400">' + e(mm.label) + '</span></div>';
    });
    if (!keys.length) h += '<p class="text-sm text-slate-400 self-center">No transaction data.</p>';
    h += '</div>' +
      '<div class="flex items-center gap-4 mt-3 text-xs text-slate-500">' +
        '<span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Income</span>' +
        '<span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span>Expense</span></div></div>';

    // Donut
    h += '<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">' +
      '<h3 class="font-bold text-slate-900 text-sm mb-1 font-display">Project Status</h3>' +
      '<p class="text-xs text-slate-400 mb-4">All ' + projCount + ' projects</p>' +
      '<div class="flex justify-center my-2"><div class="rounded-full" style="width:150px;height:150px;background:' + conic + '">' +
        '<div class="w-full h-full flex items-center justify-center"><div class="bg-white rounded-full flex items-center justify-center" style="width:84px;height:84px">' +
          '<span class="text-lg font-bold text-slate-800 font-display">' + projCount + '</span></div></div></div></div>' +
      '<div class="grid grid-cols-2 gap-1.5 mt-3">';
    ['active', 'completed', 'planning', 'on-hold'].forEach(function (k) {
      h += '<div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + statusColors[k] + '"></span>' +
        '<span class="text-xs text-slate-500">' + statusLabels[k] + ': <strong class="text-slate-700">' + statusMap[k] + '</strong></span></div>';
    });
    h += '</div></div></div>';

    // Bottom row
    h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
    h += '<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">' +
      '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-slate-900 text-sm font-display">Recent Projects</h3>' +
      '<a href="projects.html" class="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">View all ' + icon('arrow-up-right', 12) + '</a></div><div class="space-y-3">';
    recentProjects.forEach(function (p) {
      h += '<div class="flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 flex-shrink-0">' + icon('folder', 16) + '</div>' +
        '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-slate-800 truncate">' + e(p.name) + '</p>' +
          '<div class="flex items-center gap-2 mt-0.5"><div class="flex-1 bg-slate-100 rounded-full h-1.5"><div class="h-1.5 rounded-full bg-blue-500" style="width:' + (p.progress | 0) + '%"></div></div>' +
          '<span class="text-[11px] text-slate-500 whitespace-nowrap">' + (p.progress | 0) + '%</span></div></div>' +
        '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ' + (statusBadge[p.status] || 'bg-slate-100 text-slate-600') + '">' + e(TZ.ucfirst(p.status)) + '</span></div>';
    });
    if (!recentProjects.length) h += '<p class="text-sm text-slate-400">No projects yet.</p>';
    h += '</div></div>';

    h += '<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">' +
      '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-slate-900 text-sm font-display">Recent Transactions</h3>' +
      '<a href="finance.html" class="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">View all ' + icon('arrow-up-right', 12) + '</a></div><div class="space-y-3">';
    recentTxns.forEach(function (t) {
      var inc = t.type === 'income';
      h += '<div class="flex items-center gap-3">' +
        '<div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ' + (inc ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500') + '">' + icon(inc ? 'trending-up' : 'trending-down', 15) + '</div>' +
        '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">' + e(t.description) + '</p>' +
          '<p class="text-[11px] text-slate-400">' + e(t.txn_date) + ' · ' + e(t.category) + '</p></div>' +
        '<span class="text-sm font-bold whitespace-nowrap ' + (inc ? 'text-emerald-600' : 'text-rose-500') + '">' + (inc ? '+' : '-') + moneyShort(t.amount) + '</span></div>';
    });
    if (!recentTxns.length) h += '<p class="text-sm text-slate-400">No transactions yet.</p>';
    h += '</div></div></div>';

    // Overall progress
    h += '<div class="rounded-2xl p-5 text-white flex items-center gap-6" style="background:linear-gradient(135deg,#0F2B4C 0%,#1D4ED8 100%)">' +
      '<div class="flex-1"><p class="text-sm font-semibold text-blue-200 mb-1">Overall Portfolio Progress</p>' +
      '<p class="text-3xl font-bold mb-3 font-display">' + overallProgress + '%</p>' +
      '<div class="bg-white/20 rounded-full h-2"><div class="h-2 rounded-full bg-white" style="width:' + overallProgress + '%"></div></div>' +
      '<p class="text-xs text-blue-200 mt-2">' + moneyShort(totSpent) + ' spent of ' + moneyShort(totBudget) + ' total budget</p></div>' +
      '<div class="hidden sm:grid grid-cols-2 gap-4 text-center">' +
        '<div><p class="text-2xl font-bold">' + moneyShort(totBudget - totSpent) + '</p><p class="text-xs text-blue-200">Remaining</p></div>' +
        '<div><p class="text-2xl font-bold">' + projCount + '</p><p class="text-xs text-blue-200">Projects</p></div></div></div>';

    h += '</div>';
    root.innerHTML = h;
  });

  function num(v) { return Number(v) || 0; }
  function sum(arr, k) { return arr.reduce(function (a, r) { return a + num(r[k]); }, 0); }
  function byIdDesc(a, b) { return b.id - a.id; }
})();
