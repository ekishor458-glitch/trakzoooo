/* Account Tracker (ports account_tracker.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, F = TZ.fieldInput, S = TZ.fieldSelect;
  var typeMeta = { bank: ['dollar', 'bg-blue-50 text-blue-600'], cash: ['dollar', 'bg-emerald-50 text-emerald-600'], credit: ['credit-card', 'bg-violet-50 text-violet-600'] };

  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('accounts', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'account-tracker', title: edit ? 'Edit Account' : 'New Account' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Account name', 'name', edit && edit.name, 'text', 'Chase Business Checking') +
            S('Type', 'type', { bank: 'Bank', cash: 'Cash', credit: 'Credit' }, (edit && edit.type) || 'bank') +
            F('Balance', 'balance', edit && edit.balance, 'number', '0', 'step="0.01"') +
            F('Currency', 'currency', (edit && edit.currency) || 'INR', 'text', 'INR') +
          '</div><div class="flex gap-3 pt-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Add account') + '</button>' +
            '<a href="account_tracker.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        var allowed = ['bank', 'cash', 'credit'];
        var rec = {
          name: (d.name || '').trim(), type: allowed.indexOf(d.type) >= 0 ? d.type : 'bank',
          balance: Number(d.balance) || 0, currency: (d.currency || 'INR').trim(), last_transaction: TZ.todayISO(),
        };
        if (edit) { TZ.db.update('accounts', edit.id, rec); TZ.flash('Account updated.'); }
        else { TZ.db.insert('accounts', rec); TZ.flash('Account added.'); }
        location.href = 'account_tracker.html';
      });
    });
    return;
  }

  // ---- List ----
  TZ.mount({ page: 'account-tracker', title: 'Account Tracker', action: { label: 'Add Account', href: 'account_tracker.html?action=form' } }, function (root) {
    var rows = TZ.db.all('accounts').sort(function (a, b) { return a.id - b.id; });
    var net = rows.reduce(function (a, r) { return a + (Number(r.balance) || 0); }, 0);

    var cards = rows.map(function (a) {
      var m = typeMeta[a.type] || typeMeta.bank;
      var neg = (Number(a.balance) || 0) < 0;
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
        '<div class="flex items-start justify-between mb-4"><div class="w-10 h-10 rounded-xl ' + m[1] + ' flex items-center justify-center">' + icon(m[0], 18) + '</div>' +
          '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 uppercase">' + e(a.type) + '</span></div>' +
        '<p class="text-sm text-slate-500 truncate">' + e(a.name) + '</p>' +
        '<p class="text-2xl font-bold font-display ' + (neg ? 'text-rose-500' : 'text-slate-900') + '">' + money(a.balance) + '</p>' +
        '<p class="text-xs text-slate-400 mt-1">' + e(a.currency) + ' · updated ' + e(a.last_transaction) + '</p>' +
        '<div class="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">' +
          '<a href="account_tracker.html?action=form&id=' + a.id + '" class="flex-1 text-center py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">Edit</a>' +
          '<button data-del="' + a.id + '" class="w-9 h-9 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
        '</div></div>';
    }).join('');
    if (!rows.length) cards = '<div class="col-span-full bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">No accounts yet.</div>';

    root.innerHTML = '<div class="p-6 space-y-4">' +
      '<div class="rounded-2xl p-5 text-white" style="background:linear-gradient(135deg,#0F2B4C 0%,#1D4ED8 100%)">' +
        '<p class="text-sm font-semibold text-blue-200 mb-1">Total Net Balance</p>' +
        '<p class="text-3xl font-bold font-display">' + money(net) + '</p>' +
        '<p class="text-xs text-blue-200 mt-1">' + rows.length + ' account(s) tracked</p></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + '</div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this account?')) return;
      TZ.db.remove('accounts', b.getAttribute('data-del')); TZ.flash('Account deleted.', 'info'); location.reload();
    });
  });
})();
