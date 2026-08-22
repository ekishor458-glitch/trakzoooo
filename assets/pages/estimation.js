/* Estimation (ports estimation.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, trimNum = TZ.trimNum;

  TZ.mount({ page: 'estimation', title: 'Estimation' }, function (root) {
    render(root);
  });

  function render(root) {
    var rows = TZ.db.all('estimation_items').sort(function (a, b) { return a.id - b.id; });
    var subTotal = 0, taxTotal = 0, discTotal = 0, grand = 0;
    rows.forEach(function (r) {
      var base = num(r.qty) * num(r.rate);
      var disc = base * num(r.discount) / 100;
      var taxable = base - disc;
      var tax = taxable * num(r.tax) / 100;
      r._line = taxable + tax;
      subTotal += base; discTotal += disc; taxTotal += tax; grand += r._line;
    });

    var body = rows.map(function (r) {
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3 font-medium text-slate-800">' + e(r.description) + '</td>' +
        '<td class="px-5 py-3 hidden md:table-cell text-slate-500">' + e(r.unit) + '</td>' +
        '<td class="px-5 py-3 text-right text-slate-600">' + trimNum(r.qty, 2) + '</td>' +
        '<td class="px-5 py-3 text-right text-slate-600">' + money(r.rate) + '</td>' +
        '<td class="px-5 py-3 text-right hidden sm:table-cell text-slate-500">' + trimNum(r.tax, 2) + '</td>' +
        '<td class="px-5 py-3 text-right hidden sm:table-cell text-slate-500">' + trimNum(r.discount, 2) + '</td>' +
        '<td class="px-5 py-3 text-right font-semibold text-slate-800">' + money(r._line) + '</td>' +
        '<td class="px-5 py-3 text-right"><button data-del="' + r.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button></td></tr>';
    }).join('');
    if (!rows.length) body = '<tr><td colspan="8" class="px-5 py-8 text-center text-slate-400">No line items yet. Add your first below.</td></tr>';

    root.innerHTML = '<div class="p-6 space-y-4">' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto">' +
        '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Description</th><th class="px-5 py-3 font-semibold hidden md:table-cell">Unit</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Qty</th><th class="px-5 py-3 font-semibold text-right">Rate</th>' +
          '<th class="px-5 py-3 font-semibold text-right hidden sm:table-cell">Tax %</th><th class="px-5 py-3 font-semibold text-right hidden sm:table-cell">Disc %</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Line Total</th><th class="px-5 py-3"></th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
        '<p class="text-sm font-bold text-slate-800 font-display mb-3">Add line item</p>' +
        '<form id="add" class="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">' +
          '<div class="col-span-2 md:col-span-2"><label class="block text-xs font-semibold text-slate-600 mb-1.5">Description</label><input name="description" required placeholder="Excavation work" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"></div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Unit</label><input name="unit" placeholder="Cu.Yd" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"></div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Qty</label><input name="qty" type="number" step="0.01" value="1" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-right"></div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Rate</label><input name="rate" type="number" step="0.01" value="0" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-right"></div>' +
          '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Tax %</label><input name="tax" type="number" step="0.01" value="8" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-right"></div>' +
          '<div class="flex gap-2"><div class="flex-1"><label class="block text-xs font-semibold text-slate-600 mb-1.5">Disc %</label><input name="discount" type="number" step="0.01" value="0" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-right"></div></div>' +
          '<div class="col-span-2 md:col-span-7"><button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Add item</button></div>' +
        '</form></div>' +

      '<div class="flex justify-end"><div class="w-full sm:w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2 text-sm">' +
        '<div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="font-medium text-slate-700">' + money(subTotal) + '</span></div>' +
        '<div class="flex justify-between text-slate-500"><span>Discount</span><span class="font-medium text-rose-500">- ' + money(discTotal) + '</span></div>' +
        '<div class="flex justify-between text-slate-500"><span>Tax</span><span class="font-medium text-slate-700">+ ' + money(taxTotal) + '</span></div>' +
        '<div class="flex justify-between pt-2 border-t border-slate-100 text-base"><span class="font-bold text-slate-800">Grand Total</span><span class="font-bold text-brand font-display">' + money(grand) + '</span></div>' +
      '</div></div></div>';

    document.getElementById('add').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      TZ.db.insert('estimation_items', {
        description: (d.description || 'New item').trim(), unit: (d.unit || '').trim(),
        qty: Number(d.qty) || 0, rate: Number(d.rate) || 0, tax: Number(d.tax) || 0, discount: Number(d.discount) || 0,
      });
      TZ.flash('Line item added.'); location.reload();
    });
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Remove line item?')) return;
      TZ.db.remove('estimation_items', b.getAttribute('data-del')); TZ.flash('Line item removed.', 'info'); location.reload();
    });
  }
  function num(v) { return Number(v) || 0; }
})();
