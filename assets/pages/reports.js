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
    var tdb = 'style="border:1px solid #ddd;padding:4px;font-weight:bold;background:#eef2f7"';
    var rnd = function (v) { return Math.round((Number(v) || 0) * 100) / 100; };
    var stat = function (s) { return TZ.ucfirst(TZ.dashToSpace(s || '')); };

    // Build one titled table. headers=[], rows=[[...]]; numbers formatted, blanks -> ''.
    function sheet(title, headers, rows, totalRow) {
      var span = Math.max(headers.length, 1);
      var h = '<table border="1"><tr><td colspan="' + span + '" ' + th + '>' + e(title) + '</td></tr>';
      if (headers.length) h += '<tr>' + headers.map(function (x) { return '<td ' + th + '>' + e(x) + '</td>'; }).join('') + '</tr>';
      if (!rows.length) h += '<tr><td colspan="' + span + '" ' + td + '>None recorded</td></tr>';
      else h += rows.map(function (row) {
        return '<tr>' + row.map(function (cell) { return '<td ' + td + '>' + (typeof cell === 'number' ? rnd(cell) : e(cell == null ? '' : cell)) + '</td>'; }).join('') + '</tr>';
      }).join('');
      if (totalRow) h += '<tr>' + totalRow.map(function (cell) { return '<td ' + tdb + '>' + (typeof cell === 'number' ? rnd(cell) : e(cell == null ? '' : cell)) + '</td>'; }).join('') + '</tr>';
      return h + '</table><br>';
    }

    var out = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>' +
      '<table><tr><td colspan="11" style="font-size:16px;font-weight:bold">Trackzo — Full Business Report</td></tr>' +
      '<tr><td colspan="11">Generated: ' + e(generated) + ' · all amounts in ' + e(cur) + '</td></tr></table><br>';

    out += sheet('FINANCIAL SUMMARY', ['Metric', 'Amount (' + cur + ')'], [
      ['Total Income', r.income], ['Total Expense', r.expense], ['Pending / Overdue', r.pending], ['Net Position', r.net],
      ['Project Material Cost', r.projMaterialTotal], ['Inventory Stock Value', r.inventoryValue],
      ['Purchase Orders Total', r.poTotal], ['Accounts Balance', r.accountsTotal],
    ]);

    out += sheet('EXPENSES BY CATEGORY', ['Category', 'Amount (' + cur + ')'],
      r.byCat.map(function (c) { return [c.category, c.total]; }));

    out += sheet('PROJECTS OVERVIEW', ['Project', 'Client', 'Type', 'Status', 'Budget', 'Spent', 'Remaining', 'Progress %', 'Area (sqft)', 'Floors', 'Manager', 'Start', 'End'],
      r.projects.map(function (p) { return [p.name, p.client, p.type, stat(p.status), p.budget, p.spent, p.remaining, p.progress, p.area, p.floors, p.manager, p.start_date, p.end_date]; }));

    out += sheet('PROJECT BUDGET UTILIZATION', ['Project', 'Budget (' + cur + ')', 'Spent (' + cur + ')', 'Remaining (' + cur + ')', 'Used %'],
      r.projUtil.map(function (p) { var pct = num(p.budget) > 0 ? Math.round(num(p.spent) / num(p.budget) * 100) : 0; return [p.name, p.budget, p.spent, num(p.budget) - num(p.spent), pct]; }));

    out += sheet('CONSTRUCTION DETAILS', ['Project', 'Construction', 'Structure', 'Foundation', 'Roofing', 'Floors', 'Units', 'Plot Area (sqft)', 'Built-up (sqft)'],
      r.construction.map(function (d) { return [d.project, d.construction_type, d.structure_type, d.foundation_type, d.roofing_type, num(d.num_floors), num(d.num_units), num(d.plot_area), num(d.builtup_sqft)]; }));

    out += sheet('PROJECT MATERIALS', ['Project', 'Material', 'Category', 'Quantity', 'Unit', 'Unit Cost (' + cur + ')', 'Amount (' + cur + ')', 'Used', 'Left', 'Supplier', 'Date & Time'],
      r.projMaterials.map(function (m) { return [m.project, m.name, m.category, m.quantity, m.unit, m.cost, m.total_cost, m.used_qty, m.left, m.supplier, m.purchase_date]; }),
      ['TOTAL', '', '', '', '', '', r.projMaterialTotal, '', '', '', '']);

    out += sheet('MATERIALS INVENTORY', ['Material', 'Category', 'Unit', 'In Stock', 'Min Stock', 'Rate (' + cur + ')', 'Stock Value (' + cur + ')', 'Supplier', 'Status'],
      r.inventory.map(function (m) { return [m.name, m.category, m.unit, m.stock, m.min_stock, m.rate, m.value, m.supplier, m.low ? 'LOW STOCK' : 'OK']; }),
      ['TOTAL', '', '', '', '', '', r.inventoryValue, '', '']);

    out += sheet('PURCHASE ORDERS', ['Order Date', 'Supplier', 'Item', 'Qty', 'Rate (' + cur + ')', 'Total (' + cur + ')', 'Status', 'Expected', 'Project'],
      r.purchaseOrders.map(function (o) { return [o.order_date, o.supplier, o.item, o.qty, o.rate, o.total, stat(o.status), o.expected_date, o.project]; }),
      ['TOTAL', '', '', '', '', r.poTotal, '', '', '']);

    out += sheet('ACCOUNTS', ['Account', 'Type', 'Balance (' + cur + ')', 'Currency'],
      r.accounts.map(function (a2) { return [a2.name, stat(a2.type), a2.balance, a2.currency]; }),
      ['TOTAL', '', r.accountsTotal, '']);

    out += sheet('CLIENTS', ['Client', 'Company', 'City', 'Status', 'Projects', 'Portfolio Value (' + cur + ')'],
      r.clients.map(function (c) { return [c.name, c.company, c.city, stat(c.status), c.projects, c.value]; }));

    out += sheet('TRANSACTIONS LEDGER', ['Date', 'Description', 'Category', 'Project', 'Type', 'Amount (' + cur + ')'],
      r.txns.map(function (t) { return [t.txn_date, t.description, t.category, t.pname || '-', TZ.ucfirst(t.type), t.amount]; }));

    out += '</body></html>';

    var blob = new Blob(['﻿' + out], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trackzo-full-report-' + TZ.todayISO() + '.xls';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function num(v) { return Number(v) || 0; }
})();
