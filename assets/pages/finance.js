/* Finance (ports finance.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, F = TZ.fieldInput, S = TZ.fieldSelect, CUR = TZ.CUR;
  var sbadge = { paid: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-rose-100 text-rose-600' };

  var projects = TZ.db.all('projects').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var projOpts = { '': '— none —' }; projects.forEach(function (p) { projOpts[p.id] = p.name; });

  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('transactions', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'finance', title: edit ? 'Edit Transaction' : 'New Transaction' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Description', 'description', edit && edit.description, 'text', 'Client Payment - Phase 3') +
            F('Category', 'category', edit && edit.category, 'text', 'Client Receipt') +
            S('Type', 'type', { income: 'Income', expense: 'Expense' }, (edit && edit.type) || 'expense') +
            F('Amount (' + CUR + ')', 'amount', edit && edit.amount, 'number', '0', 'step="0.01"') +
            S('Status', 'status', { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' }, (edit && edit.status) || 'paid') +
            S('Project', 'project_id', projOpts, (edit && edit.project_id) || '') +
            F('Date', 'txn_date', (edit && edit.txn_date) || TZ.todayISO(), 'date') +
          '</div><div class="flex gap-3 pt-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Add transaction') + '</button>' +
            '<a href="finance.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        var allowed = ['paid', 'pending', 'overdue'];
        var rec = {
          txn_date: d.txn_date || TZ.todayISO(), description: (d.description || '').trim(), category: (d.category || '').trim(),
          type: d.type === 'income' ? 'income' : 'expense', amount: Number(d.amount) || 0,
          status: allowed.indexOf(d.status) >= 0 ? d.status : 'paid', project_id: parseInt(d.project_id, 10) || null,
        };
        if (edit) { TZ.db.update('transactions', edit.id, rec); TZ.flash('Transaction updated.'); }
        else { TZ.db.insert('transactions', rec); TZ.flash('Transaction added.'); }
        location.href = 'finance.html';
      });
    });
    return;
  }

  // ---- List ----
  TZ.mount({ page: 'finance', title: 'Finance', action: { label: 'New Transaction', href: 'finance.html?action=form' } }, function (root) {
    var pmap = {}; projects.forEach(function (p) { pmap[p.id] = p; });
    var all = TZ.db.all('transactions');
    var income = all.filter(function (t) { return t.type === 'income' && t.status === 'paid'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var expense = all.filter(function (t) { return t.type === 'expense'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var pending = all.filter(function (t) { return t.status === 'pending' || t.status === 'overdue'; }).reduce(function (a, t) { return a + num(t.amount); }, 0);
    var rows = all.sort(function (a, b) { var d = String(b.txn_date).localeCompare(String(a.txn_date)); return d !== 0 ? d : b.id - a.id; });

    var body = rows.map(function (t) {
      var inc = t.type === 'income';
      var pn = pmap[t.project_id] ? pmap[t.project_id].name : '';
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3 text-slate-500 whitespace-nowrap">' + e(t.txn_date) + '</td>' +
        '<td class="px-5 py-3"><p class="font-medium text-slate-800">' + e(t.description) + '</p><p class="text-xs text-slate-400">' + e(t.category) + '</p></td>' +
        '<td class="px-5 py-3 hidden lg:table-cell text-slate-500">' + e(pn || '—') + '</td>' +
        '<td class="px-5 py-3 text-center"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (sbadge[t.status] || '') + '">' + e(TZ.ucfirst(t.status)) + '</span></td>' +
        '<td class="px-5 py-3 text-right font-bold whitespace-nowrap ' + (inc ? 'text-emerald-600' : 'text-rose-500') + '">' + (inc ? '+' : '-') + money(t.amount) + '</td>' +
        '<td class="px-5 py-3"><div class="flex items-center justify-end gap-1.5">' +
          '<a href="finance.html?action=form&id=' + t.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center">' + icon('edit', 15) + '</a>' +
          '<button data-del="' + t.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
        '</div></td></tr>';
    }).join('');
    if (!rows.length) body = '<tr><td colspan="6" class="px-5 py-10 text-center text-slate-400">No transactions yet.</td></tr>';

    root.innerHTML = '<div class="p-6 space-y-4">' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
        card('trending-up', 'bg-emerald-50 text-emerald-600', money(income), 'Income received') +
        card('trending-down', 'bg-rose-50 text-rose-500', money(expense), 'Total expenses') +
        card('alert-circle', 'bg-amber-50 text-amber-600', money(pending), 'Pending / overdue') +
      '</div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto">' +
        '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Date</th><th class="px-5 py-3 font-semibold">Description</th>' +
          '<th class="px-5 py-3 font-semibold hidden lg:table-cell">Project</th><th class="px-5 py-3 font-semibold text-center">Status</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Amount</th><th class="px-5 py-3 font-semibold text-right">Actions</th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this transaction?')) return;
      TZ.db.remove('transactions', b.getAttribute('data-del')); TZ.flash('Transaction deleted.', 'info'); location.reload();
    });
  });

  function card(ic, cls, val, label) {
    return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
      '<div class="w-9 h-9 rounded-xl ' + cls + ' flex items-center justify-center mb-3">' + icon(ic, 18) + '</div>' +
      '<p class="text-2xl font-bold text-slate-900 font-display">' + val + '</p><p class="text-xs text-slate-500">' + label + '</p></div>';
  }
  function num(v) { return Number(v) || 0; }
})();
