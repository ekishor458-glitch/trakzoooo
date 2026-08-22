/* Printable report (ports export.php PDF branch). Opens, renders, auto-prints. */
(function () {
  if (!TZ.currentUser()) { location.replace('login.html'); return; }
  var e = TZ.esc;
  var r = TZ.reportData();
  var cur = TZ.CUR;
  function mny(v) { v = Number(v) || 0; return cur + (v < 0 ? '-' : '') + TZ.inrGroup(Math.abs(v)); }
  var generated = TZ.reportStamp();

  var css =
    '*{box-sizing:border-box;margin:0;padding:0}' +
    "body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:32px;font-size:12px}" +
    '.bar{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1D4ED8;padding-bottom:14px;margin-bottom:20px}' +
    '.brand{display:flex;align-items:center;gap:10px}' +
    '.logo{width:38px;height:38px;border-radius:9px;background:#1D4ED8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}' +
    'h1{font-size:20px;color:#0F2B4C}.sub{color:#64748b;font-size:11px}' +
    'h2{font-size:13px;color:#0F2B4C;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:.04em}' +
    'table{width:100%;border-collapse:collapse;margin-top:6px}' +
    'th{background:#0F2B4C;color:#fff;text-align:left;padding:7px 9px;font-size:11px}' +
    'td{padding:6px 9px;border-bottom:1px solid #eef2f7}tr:nth-child(even) td{background:#f8fafc}' +
    '.r{text-align:right}.c{text-align:center}' +
    '.cards{display:flex;gap:12px;margin-bottom:6px}.card{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:12px}' +
    '.card .k{font-size:10px;color:#64748b;text-transform:uppercase}.card .v{font-size:18px;font-weight:800;color:#0F2B4C;margin-top:3px}' +
    '.pos{color:#059669}.neg{color:#e11d48}' +
    '.toolbar{position:fixed;top:14px;right:14px;display:flex;gap:8px}' +
    '.btn{background:#1D4ED8;color:#fff;border:0;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}' +
    '.btn.grey{background:#e2e8f0;color:#334155}' +
    '@media print{.toolbar{display:none}body{padding:0}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var h =
    '<div class="toolbar"><button class="btn" onclick="window.print()">🖨 Save as PDF</button><a class="btn grey" href="reports.html">Back</a></div>' +
    '<div class="bar"><div class="brand"><div class="logo">T</div><div><h1>Trackzo — Business Report</h1><div class="sub">Construction ERP · all amounts in Indian Rupees (' + cur + ')</div></div></div>' +
      '<div class="sub" style="text-align:right">Generated<br><strong>' + e(generated) + '</strong></div></div>' +

    '<div class="cards">' +
      '<div class="card"><div class="k">Total Income</div><div class="v pos">' + mny(r.income) + '</div></div>' +
      '<div class="card"><div class="k">Total Expense</div><div class="v neg">' + mny(r.expense) + '</div></div>' +
      '<div class="card"><div class="k">Pending / Overdue</div><div class="v">' + mny(r.pending) + '</div></div>' +
      '<div class="card"><div class="k">Net Position</div><div class="v ' + (r.net < 0 ? 'neg' : 'pos') + '">' + mny(r.net) + '</div></div>' +
    '</div>' +

    '<h2>Expenses by Category</h2><table><thead><tr><th>Category</th><th class="r">Amount</th></tr></thead><tbody>' +
      r.byCat.map(function (c) { return '<tr><td>' + e(c.category) + '</td><td class="r">' + mny(c.total) + '</td></tr>'; }).join('') + '</tbody></table>' +

    '<h2>Project Budget Utilization</h2><table><thead><tr><th>Project</th><th class="r">Budget</th><th class="r">Spent</th><th class="r">Remaining</th><th class="c">Used %</th></tr></thead><tbody>' +
      r.projUtil.map(function (p) { var pct = p.budget > 0 ? Math.round(p.spent / p.budget * 100) : 0; return '<tr><td>' + e(p.name) + '</td><td class="r">' + mny(p.budget) + '</td><td class="r">' + mny(p.spent) + '</td><td class="r">' + mny(p.budget - p.spent) + '</td><td class="c">' + pct + '%</td></tr>'; }).join('') + '</tbody></table>' +

    '<h2>Top Clients by Portfolio Value</h2><table><thead><tr><th>Client</th><th>Company</th><th class="c">Projects</th><th class="r">Portfolio Value</th></tr></thead><tbody>' +
      r.topClients.map(function (c) { return '<tr><td>' + e(c.name) + '</td><td>' + e(c.company) + '</td><td class="c">' + c.pc + '</td><td class="r">' + mny(c.val) + '</td></tr>'; }).join('') + '</tbody></table>' +

    '<h2>Transactions Ledger</h2><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>' +
      r.txns.map(function (t) { return '<tr><td>' + e(t.txn_date) + '</td><td>' + e(t.description) + '</td><td>' + e(t.category) + '</td><td>' + TZ.ucfirst(t.type) + '</td><td class="r ' + (t.type === 'income' ? 'pos' : 'neg') + '">' + (t.type === 'income' ? '+' : '-') + mny(t.amount) + '</td></tr>'; }).join('') + '</tbody></table>';

  document.getElementById('app').innerHTML = h;
  document.title = 'Trackzo Report — ' + TZ.todayISO();
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });
})();
