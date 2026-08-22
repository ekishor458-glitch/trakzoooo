/* Reports (ports reports.php + export.php Excel) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money;
  var catColors = ['#1D4ED8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6'];

  TZ.mount({ page: 'reports', title: 'Reports' }, function (root) {
    var r = TZ.reportData();

    var catBars = r.byCat.map(function (c, i) {
      return '<div><div class="flex justify-between text-xs mb-1"><span class="text-slate-600 font-medium">' + e(c.category) + '</span><span class="text-slate-500">' + money(c.total) + '</span></div>' +
        '<div class="bg-slate-100 rounded-full h-2"><div class="h-2 rounded-full" style="width:' + (c.total / r.catMax * 100) + '%;background:' + catColors[i % catColors.length] + '"></div></div></div>';
    }).join('') || '<p class="text-sm text-slate-400">No expense data.</p>';

    var utilBars = r.projUtil.map(function (p) {
      var pct = num(p.budget) > 0 ? Math.min(100, num(p.spent) / num(p.budget) * 100) : 0;
      var over = pct >= 90;
      return '<div><div class="flex justify-between text-xs mb-1"><span class="text-slate-600 font-medium truncate pr-2">' + e(p.name) + '</span><span class="text-slate-500 whitespace-nowrap">' + Math.round(pct) + '%</span></div>' +
        '<div class="bg-slate-100 rounded-full h-2"><div class="h-2 rounded-full ' + (over ? 'bg-rose-500' : 'bg-blue-500') + '" style="width:' + pct + '%"></div></div></div>';
    }).join('') || '<p class="text-sm text-slate-400">No projects.</p>';

    var clientRows = r.topClients.slice(0, 5).map(function (c) {
      return '<tr class="hover:bg-slate-50/70"><td class="px-5 py-3"><p class="font-semibold text-slate-800">' + e(c.name) + '</p><p class="text-xs text-slate-400">' + e(c.company) + '</p></td>' +
        '<td class="px-5 py-3 text-center text-slate-600">' + c.pc + '</td><td class="px-5 py-3 text-right font-semibold text-slate-800">' + money(c.val) + '</td></tr>';
    }).join('');

    root.innerHTML = '<div class="p-6 space-y-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-3"><div>' +
        '<h2 class="text-base font-bold text-slate-800 font-display">Business Report</h2>' +
        '<p class="text-xs text-slate-400">Financial summary, budgets, clients &amp; ledger — all amounts in ₹</p></div>' +
        '<div class="flex items-center gap-2">' +
          '<button id="xls" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm">' + icon('bar-chart', 16) + ' Export Excel</button>' +
          '<a href="report.html?format=pdf" target="_blank" class="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl shadow-sm">' + icon('arrow-up-right', 16) + ' Export PDF</a>' +
        '</div></div>' +

      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-xs text-slate-500 mb-1">Total Income</p><p class="text-2xl font-bold text-emerald-600 font-display">' + money(r.income) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-xs text-slate-500 mb-1">Total Expense</p><p class="text-2xl font-bold text-rose-500 font-display">' + money(r.expense) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-xs text-slate-500 mb-1">Net Position</p><p class="text-2xl font-bold font-display ' + (r.profit < 0 ? 'text-rose-500' : 'text-slate-900') + '">' + money(r.profit) + '</p></div>' +
      '</div>' +

      '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 class="font-bold text-slate-900 text-sm mb-4 font-display">Expenses by Category</h3><div class="space-y-3">' + catBars + '</div></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 class="font-bold text-slate-900 text-sm mb-4 font-display">Budget Utilization</h3><div class="space-y-3">' + utilBars + '</div></div>' +
      '</div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-slate-100"><h3 class="font-bold text-slate-900 text-sm font-display">Top Clients by Portfolio Value</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Client</th><th class="px-5 py-3 font-semibold text-center">Projects</th><th class="px-5 py-3 font-semibold text-right">Portfolio Value</th></tr></thead>' +
          '<tbody class="divide-y divide-slate-100">' + clientRows + '</tbody></table></div></div>' +
      '</div>';

    document.getElementById('xls').addEventListener('click', function () { downloadExcel(r); });
  });

  function downloadExcel(r) {
    var generated = TZ.reportStamp(), cur = TZ.CUR;
    var th = 'style="background:#0F2B4C;color:#fff;font-weight:bold;border:1px solid #ccc;padding:4px"';
    var td = 'style="border:1px solid #ddd;padding:4px"';
    var rnd = function (v) { return Math.round((Number(v) || 0) * 100) / 100; };
    var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>' +
      '<table><tr><td colspan="6" style="font-size:16px;font-weight:bold">Trackzo — Business Report</td></tr>' +
      '<tr><td colspan="6">Generated: ' + e(generated) + ' (all amounts in ' + e(cur) + ')</td></tr></table><br>' +
      '<table border="1"><tr><td colspan="2" ' + th + '>FINANCIAL SUMMARY</td></tr>' +
        '<tr><td ' + td + '>Total Income (' + cur + ')</td><td ' + td + '>' + rnd(r.income) + '</td></tr>' +
        '<tr><td ' + td + '>Total Expense (' + cur + ')</td><td ' + td + '>' + rnd(r.expense) + '</td></tr>' +
        '<tr><td ' + td + '>Pending / Overdue (' + cur + ')</td><td ' + td + '>' + rnd(r.pending) + '</td></tr>' +
        '<tr><td ' + td + '><b>Net Position (' + cur + ')</b></td><td ' + td + '><b>' + rnd(r.net) + '</b></td></tr></table><br>' +
      '<table border="1"><tr><td colspan="2" ' + th + '>EXPENSES BY CATEGORY</td></tr><tr><td ' + th + '>Category</td><td ' + th + '>Amount (' + cur + ')</td></tr>' +
        r.byCat.map(function (c) { return '<tr><td ' + td + '>' + e(c.category) + '</td><td ' + td + '>' + rnd(c.total) + '</td></tr>'; }).join('') + '</table><br>' +
      '<table border="1"><tr><td colspan="4" ' + th + '>PROJECT BUDGET UTILIZATION</td></tr>' +
        '<tr><td ' + th + '>Project</td><td ' + th + '>Budget (' + cur + ')</td><td ' + th + '>Spent (' + cur + ')</td><td ' + th + '>Used %</td></tr>' +
        r.projUtil.map(function (p) { var pct = num(p.budget) > 0 ? Math.round(num(p.spent) / num(p.budget) * 100) : 0; return '<tr><td ' + td + '>' + e(p.name) + '</td><td ' + td + '>' + rnd(p.budget) + '</td><td ' + td + '>' + rnd(p.spent) + '</td><td ' + td + '>' + pct + '</td></tr>'; }).join('') + '</table><br>' +
      '<table border="1"><tr><td colspan="4" ' + th + '>TOP CLIENTS</td></tr>' +
        '<tr><td ' + th + '>Client</td><td ' + th + '>Company</td><td ' + th + '>Projects</td><td ' + th + '>Portfolio Value (' + cur + ')</td></tr>' +
        r.topClients.map(function (c) { return '<tr><td ' + td + '>' + e(c.name) + '</td><td ' + td + '>' + e(c.company) + '</td><td ' + td + '>' + c.pc + '</td><td ' + td + '>' + rnd(c.val) + '</td></tr>'; }).join('') + '</table><br>' +
      '<table border="1"><tr><td colspan="6" ' + th + '>TRANSACTIONS LEDGER</td></tr>' +
        '<tr><td ' + th + '>Date</td><td ' + th + '>Description</td><td ' + th + '>Category</td><td ' + th + '>Project</td><td ' + th + '>Type</td><td ' + th + '>Amount (' + cur + ')</td></tr>' +
        r.txns.map(function (t) { return '<tr><td ' + td + '>' + e(t.txn_date) + '</td><td ' + td + '>' + e(t.description) + '</td><td ' + td + '>' + e(t.category) + '</td><td ' + td + '>' + e(t.pname || '-') + '</td><td ' + td + '>' + TZ.ucfirst(t.type) + '</td><td ' + td + '>' + rnd(t.amount) + '</td></tr>'; }).join('') + '</table>' +
      '</body></html>';

    var blob = new Blob(['﻿' + h], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trackzo-report-' + TZ.todayISO() + '.xls';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function num(v) { return Number(v) || 0; }
})();
