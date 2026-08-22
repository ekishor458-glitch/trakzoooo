/* Materials & Inventory (ports materials.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, F = TZ.fieldInput, CUR = TZ.CUR, trimNum = TZ.trimNum;

  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('materials', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'materials', title: edit ? 'Edit Material' : 'New Material' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Material name', 'name', edit && edit.name, 'text', 'Portland Cement') +
            F('Category', 'category', edit && edit.category, 'text', 'Cement') +
            F('Unit', 'unit', edit && edit.unit, 'text', 'Bags (50kg)') +
            F('Supplier', 'supplier', edit && edit.supplier, 'text', 'Atlas Cement Co.') +
            F('Stock', 'stock', edit && edit.stock, 'number', '0', 'step="0.01"') +
            F('Min. stock', 'min_stock', edit && edit.min_stock, 'number', '0', 'step="0.01"') +
            F('Rate (' + CUR + ')', 'rate', edit && edit.rate, 'number', '0', 'step="0.01"') +
          '</div><div class="flex gap-3 pt-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Add material') + '</button>' +
            '<a href="materials.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        var rec = {
          name: (d.name || '').trim(), category: (d.category || '').trim(), unit: (d.unit || '').trim(),
          stock: Number(d.stock) || 0, min_stock: Number(d.min_stock) || 0, rate: Number(d.rate) || 0,
          supplier: (d.supplier || '').trim(), last_updated: TZ.todayISO(),
        };
        if (edit) { TZ.db.update('materials', edit.id, rec); TZ.flash('Material updated.'); }
        else { TZ.db.insert('materials', rec); TZ.flash('Material added.'); }
        location.href = 'materials.html';
      });
    });
    return;
  }

  // ---- List ----
  TZ.mount({ page: 'materials', title: 'Materials & Inventory', action: { label: 'Add Material', href: 'materials.html?action=form' } }, function (root) {
    var rows = TZ.db.all('materials').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var lowCount = rows.filter(function (r) { return Number(r.stock) < Number(r.min_stock); }).length;

    var body = rows.map(function (m) {
      var low = Number(m.stock) < Number(m.min_stock);
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3"><p class="font-semibold text-slate-800">' + e(m.name) + '</p><p class="text-xs text-slate-400">' + e(m.unit) + '</p></td>' +
        '<td class="px-5 py-3 hidden md:table-cell"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">' + e(m.category) + '</span></td>' +
        '<td class="px-5 py-3 hidden lg:table-cell text-slate-500">' + e(m.supplier) + '</td>' +
        '<td class="px-5 py-3 text-right"><span class="font-semibold ' + (low ? 'text-rose-600' : 'text-slate-800') + '">' + trimNum(m.stock, 2) + '</span>' +
          (low ? '<span class="block text-[10px] text-rose-500">Low (min ' + trimNum(m.min_stock, 2) + ')</span>' : '') + '</td>' +
        '<td class="px-5 py-3 text-right text-slate-600">' + money(m.rate) + '</td>' +
        '<td class="px-5 py-3 text-right font-semibold text-slate-800">' + money(Number(m.stock) * Number(m.rate)) + '</td>' +
        '<td class="px-5 py-3"><div class="flex items-center justify-end gap-1.5">' +
          '<a href="materials.html?action=form&id=' + m.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center">' + icon('edit', 15) + '</a>' +
          '<button data-del="' + m.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
        '</div></td></tr>';
    }).join('');
    if (!rows.length) body = '<tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">No materials yet.</td></tr>';

    root.innerHTML = '<div class="p-6 space-y-4">' +
      (lowCount ? '<div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm font-medium flex items-center gap-2">' + icon('alert-circle', 16) + lowCount + ' item(s) are below minimum stock level.</div>' : '') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto">' +
        '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Material</th><th class="px-5 py-3 font-semibold hidden md:table-cell">Category</th>' +
          '<th class="px-5 py-3 font-semibold hidden lg:table-cell">Supplier</th><th class="px-5 py-3 font-semibold text-right">Stock</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Rate</th><th class="px-5 py-3 font-semibold text-right">Value</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Actions</th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this material?')) return;
      TZ.db.remove('materials', b.getAttribute('data-del')); TZ.flash('Material deleted.', 'info'); location.reload();
    });
  });
})();
