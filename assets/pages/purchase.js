/* Purchase Orders (ports purchase.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, F = TZ.fieldInput, S = TZ.fieldSelect, CUR = TZ.CUR, trimNum = TZ.trimNum;
  var badge = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-rose-100 text-rose-600' };

  var projects = TZ.db.all('projects').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var projOpts = { '': '— none —' }; projects.forEach(function (p) { projOpts[p.id] = p.name; });

  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('purchase_orders', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'purchase', title: edit ? 'Edit Purchase Order' : 'New Purchase Order' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Supplier', 'supplier', edit && edit.supplier, 'text', 'Atlas Cement Co.') +
            F('Item', 'item', edit && edit.item, 'text', 'Portland Cement OPC 53') +
            F('Quantity', 'qty', edit && edit.qty, 'number', '0', 'step="0.01"') +
            F('Rate (' + CUR + ')', 'rate', edit && edit.rate, 'number', '0', 'step="0.01"') +
            S('Status', 'status', { pending: 'Pending', approved: 'Approved', delivered: 'Delivered', cancelled: 'Cancelled' }, (edit && edit.status) || 'pending') +
            S('Project', 'project_id', projOpts, (edit && edit.project_id) || '') +
            F('Order date', 'order_date', (edit && edit.order_date) || TZ.todayISO(), 'date') +
            F('Expected date', 'expected_date', edit && edit.expected_date, 'date') +
          '</div><div class="flex gap-3 pt-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Create order') + '</button>' +
            '<a href="purchase.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        var qty = Number(d.qty) || 0, rate = Number(d.rate) || 0;
        var allowed = ['pending', 'approved', 'delivered', 'cancelled'];
        var rec = {
          supplier: (d.supplier || '').trim(), item: (d.item || '').trim(), qty: qty, rate: rate, total: qty * rate,
          status: allowed.indexOf(d.status) >= 0 ? d.status : 'pending',
          order_date: d.order_date || null, expected_date: d.expected_date || null,
          project_id: parseInt(d.project_id, 10) || null,
        };
        if (edit) { TZ.db.update('purchase_orders', edit.id, rec); TZ.flash('Purchase order updated.'); }
        else { TZ.db.insert('purchase_orders', rec); TZ.flash('Purchase order created.'); }
        location.href = 'purchase.html';
      });
    });
    return;
  }

  // ---- List ----
  TZ.mount({ page: 'purchase', title: 'Purchase Orders', action: { label: 'New Order', href: 'purchase.html?action=form' } }, function (root) {
    var pmap = {}; projects.forEach(function (p) { pmap[p.id] = p; });
    var rows = TZ.db.all('purchase_orders').sort(function (a, b) {
      var d = String(b.order_date).localeCompare(String(a.order_date)); return d !== 0 ? d : b.id - a.id;
    });

    var body = rows.map(function (o) {
      var pn = pmap[o.project_id] ? pmap[o.project_id].name : '';
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3"><p class="font-semibold text-slate-800">' + e(o.supplier) + '</p><p class="text-xs text-slate-400">' + e(o.item) + '</p></td>' +
        '<td class="px-5 py-3 hidden lg:table-cell text-slate-500">' + e(pn || '—') + '</td>' +
        '<td class="px-5 py-3 text-right text-slate-600">' + trimNum(o.qty, 2) + ' × ' + money(o.rate) + '</td>' +
        '<td class="px-5 py-3 text-right font-semibold text-slate-800">' + money(o.total) + '</td>' +
        '<td class="px-5 py-3 hidden md:table-cell text-slate-500">' + e(o.expected_date || '—') + '</td>' +
        '<td class="px-5 py-3 text-center"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (badge[o.status] || 'bg-slate-100 text-slate-600') + '">' + e(TZ.ucfirst(o.status)) + '</span></td>' +
        '<td class="px-5 py-3"><div class="flex items-center justify-end gap-1.5">' +
          '<a href="purchase.html?action=form&id=' + o.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center">' + icon('edit', 15) + '</a>' +
          '<button data-del="' + o.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
        '</div></td></tr>';
    }).join('');
    if (!rows.length) body = '<tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">No purchase orders yet.</td></tr>';

    root.innerHTML = '<div class="p-6"><div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto">' +
      '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
        '<th class="px-5 py-3 font-semibold">Supplier / Item</th><th class="px-5 py-3 font-semibold hidden lg:table-cell">Project</th>' +
        '<th class="px-5 py-3 font-semibold text-right">Qty × Rate</th><th class="px-5 py-3 font-semibold text-right">Total</th>' +
        '<th class="px-5 py-3 font-semibold hidden md:table-cell">Expected</th><th class="px-5 py-3 font-semibold text-center">Status</th>' +
        '<th class="px-5 py-3 font-semibold text-right">Actions</th></tr></thead>' +
      '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this order?')) return;
      TZ.db.remove('purchase_orders', b.getAttribute('data-del')); TZ.flash('Purchase order deleted.', 'info'); location.reload();
    });
  });
})();
