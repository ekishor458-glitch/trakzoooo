/* Printable report (ports export.php PDF branch). Opens, renders, auto-prints. */
(function () {
  if (!TZ.currentUser()) { location.replace('login.html'); return; }
  var e = TZ.esc;
  var cur = TZ.CUR;
  function mny(v) { v = Number(v) || 0; return cur + (v < 0 ? '-' : '') + TZ.inrGroup(Math.abs(v)); }

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

  function num(v) { return Number(v) || 0; }
  function stat(s) { return TZ.ucfirst(TZ.dashToSpace(s || '')); }
  function M(v) { return { __html: mny(v) }; }          // money cell
  function N(v) { return { __html: TZ.trimNum(v, 2) }; } // plain number cell
  // Build a titled table. cols=[{t,a}], rows=[[cell,...]], optional bold total row.
  function T(title, cols, rows, totalRow) {
    function cell(c, i, style) {
      var a = cols[i] && cols[i].a ? ' class="' + cols[i].a + '"' : '';
      var v = (c && c.__html != null) ? c.__html : e(c == null ? '' : c);
      return '<td' + a + (style ? ' style="' + style + '"' : '') + '>' + v + '</td>';
    }
    var head = cols.map(function (c) { return '<th' + (c.a ? ' class="' + c.a + '"' : '') + '>' + e(c.t) + '</th>'; }).join('');
    var body = rows.length ? rows.map(function (cells) { return '<tr>' + cells.map(function (c, i) { return cell(c, i); }).join('') + '</tr>'; }).join('')
      : '<tr><td colspan="' + cols.length + '" style="color:#94a3b8">None recorded</td></tr>';
    var tot = totalRow ? '<tr>' + totalRow.map(function (c, i) { return cell(c, i, 'font-weight:700;background:#f1f5f9'); }).join('') + '</tr>' : '';
    return '<h2>' + e(title) + '</h2><table><thead><tr>' + head + '</tr></thead><tbody>' + body + tot + '</tbody></table>';
  }

  (TZ.ready || Promise.resolve()).then(function () {
  var r = TZ.reportData();
  var generated = TZ.reportStamp();
  var h =
    '<div class="toolbar"><button class="btn" onclick="window.print()">🖨 Save as PDF</button><a class="btn grey" href="reports.html">Back</a></div>' +
    '<div class="bar"><div class="brand"><div class="logo">T</div><div><h1>Trackzo — Full Business Report</h1><div class="sub">Construction ERP · all amounts in Indian Rupees (' + cur + ')</div></div></div>' +
      '<div class="sub" style="text-align:right">Generated<br><strong>' + e(generated) + '</strong></div></div>' +

    '<div class="cards">' +
      '<div class="card"><div class="k">Total Income</div><div class="v pos">' + mny(r.income) + '</div></div>' +
      '<div class="card"><div class="k">Total Expense</div><div class="v neg">' + mny(r.expense) + '</div></div>' +
      '<div class="card"><div class="k">Pending / Overdue</div><div class="v">' + mny(r.pending) + '</div></div>' +
      '<div class="card"><div class="k">Net Position</div><div class="v ' + (r.net < 0 ? 'neg' : 'pos') + '">' + mny(r.net) + '</div></div>' +
    '</div>' +

    T('Expenses by Category', [{ t: 'Category' }, { t: 'Amount', a: 'r' }],
      r.byCat.map(function (c) { return [c.category, M(c.total)]; })) +

    T('Projects Overview', [{ t: 'Project' }, { t: 'Client' }, { t: 'Type' }, { t: 'Status', a: 'c' }, { t: 'Budget', a: 'r' }, { t: 'Spent', a: 'r' }, { t: 'Remaining', a: 'r' }, { t: 'Progress', a: 'c' }],
      r.projects.map(function (p) { return [p.name, p.client, p.type, stat(p.status), M(p.budget), M(p.spent), M(p.remaining), { __html: p.progress + '%' }]; })) +

    T('Project Budget Utilization', [{ t: 'Project' }, { t: 'Budget', a: 'r' }, { t: 'Spent', a: 'r' }, { t: 'Remaining', a: 'r' }, { t: 'Used %', a: 'c' }],
      r.projUtil.map(function (p) { var pct = p.budget > 0 ? Math.round(p.spent / p.budget * 100) : 0; return [p.name, M(p.budget), M(p.spent), M(p.budget - p.spent), { __html: pct + '%' }]; })) +

    T('Construction Details', [{ t: 'Project' }, { t: 'Construction' }, { t: 'Structure' }, { t: 'Foundation' }, { t: 'Roofing' }, { t: 'Floors', a: 'c' }, { t: 'Units', a: 'c' }, { t: 'Plot (sqft)', a: 'r' }, { t: 'Built-up (sqft)', a: 'r' }],
      r.construction.map(function (d) { return [d.project, d.construction_type, d.structure_type, d.foundation_type, d.roofing_type, { __html: String(num(d.num_floors)) }, { __html: String(num(d.num_units)) }, N(d.plot_area), N(d.builtup_sqft)]; })) +

    T('Project Materials', [{ t: 'Project' }, { t: 'Material' }, { t: 'Category' }, { t: 'Qty', a: 'r' }, { t: 'Unit' }, { t: 'Unit Cost', a: 'r' }, { t: 'Amount', a: 'r' }, { t: 'Used', a: 'r' }, { t: 'Left', a: 'r' }, { t: 'Supplier' }, { t: 'Date & Time' }],
      r.projMaterials.map(function (m) { return [m.project, m.name, m.category, N(m.quantity), m.unit, M(m.cost), M(m.total_cost), N(m.used_qty), N(m.left), m.supplier, m.purchase_date]; }),
      ['Total', '', '', '', '', '', M(r.projMaterialTotal), '', '', '', '']) +

    T('Materials Inventory', [{ t: 'Material' }, { t: 'Category' }, { t: 'Unit' }, { t: 'In Stock', a: 'r' }, { t: 'Min', a: 'r' }, { t: 'Rate', a: 'r' }, { t: 'Stock Value', a: 'r' }, { t: 'Supplier' }, { t: 'Status', a: 'c' }],
      r.inventory.map(function (m) { return [m.name, m.category, m.unit, N(m.stock), N(m.min_stock), M(m.rate), M(m.value), m.supplier, { __html: m.low ? '<span class="neg">LOW</span>' : 'OK' }]; }),
      ['Total', '', '', '', '', '', M(r.inventoryValue), '', '']) +

    T('Purchase Orders', [{ t: 'Order Date' }, { t: 'Supplier' }, { t: 'Item' }, { t: 'Qty', a: 'r' }, { t: 'Rate', a: 'r' }, { t: 'Total', a: 'r' }, { t: 'Status', a: 'c' }, { t: 'Project' }],
      r.purchaseOrders.map(function (o) { return [o.order_date, o.supplier, o.item, N(o.qty), M(o.rate), M(o.total), stat(o.status), o.project]; }),
      ['Total', '', '', '', '', M(r.poTotal), '', '']) +

    T('Accounts', [{ t: 'Account' }, { t: 'Type' }, { t: 'Balance', a: 'r' }, { t: 'Currency', a: 'c' }],
      r.accounts.map(function (a2) { return [a2.name, stat(a2.type), M(a2.balance), a2.currency]; }),
      ['Total', '', M(r.accountsTotal), '']) +

    T('Clients', [{ t: 'Client' }, { t: 'Company' }, { t: 'City' }, { t: 'Status', a: 'c' }, { t: 'Projects', a: 'c' }, { t: 'Portfolio Value', a: 'r' }],
      r.clients.map(function (c) { return [c.name, c.company, c.city, stat(c.status), { __html: String(c.projects) }, M(c.value)]; })) +

    T('Transactions Ledger', [{ t: 'Date' }, { t: 'Description' }, { t: 'Category' }, { t: 'Type' }, { t: 'Amount', a: 'r' }],
      r.txns.map(function (t) { return [t.txn_date, t.description, t.category, TZ.ucfirst(t.type), { __html: '<span class="' + (t.type === 'income' ? 'pos' : 'neg') + '">' + (t.type === 'income' ? '+' : '-') + mny(t.amount) + '</span>' }]; }));

  document.getElementById('app').innerHTML = h;
  document.title = 'Trackzo Report — ' + TZ.todayISO();
  setTimeout(function () { window.print(); }, 400);
  });
})();
