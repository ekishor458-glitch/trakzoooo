/* Clients (ports clients.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, F = TZ.fieldInput;
  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('clients', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'clients', title: edit ? 'Edit Client' : 'New Client' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Contact name', 'name', edit && edit.name, 'text', 'Jane Doe') +
            F('Company', 'company', edit && edit.company, 'text', 'Acme Ltd.') +
            F('Email', 'email', edit && edit.email, 'email', 'jane@acme.com') +
            F('Phone', 'phone', edit && edit.phone, 'text', '+1 555-0100') +
            F('Address', 'address', edit && edit.address, 'text', '88 Wall Street') +
            F('City', 'city', edit && edit.city, 'text', 'New York, NY') +
            F('Joined date', 'joined_date', (edit && edit.joined_date) || TZ.todayISO(), 'date') +
            '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>' +
              '<select name="status" class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200">' +
                '<option value="active"' + (!edit || edit.status === 'active' ? ' selected' : '') + '>Active</option>' +
                '<option value="inactive"' + (edit && edit.status === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="flex gap-3 pt-2">' +
            '<button type="submit" class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Add client') + '</button>' +
            '<a href="clients.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        d.status = d.status === 'inactive' ? 'inactive' : 'active';
        d.joined_date = d.joined_date || null;
        if (edit) { TZ.db.update('clients', edit.id, d); TZ.flash('Client updated.'); }
        else { TZ.db.insert('clients', d); TZ.flash('Client added.'); }
        location.href = 'clients.html';
      });
    });
    return;
  }

  // ---- List ----
  TZ.mount({ page: 'clients', title: 'Clients', action: { label: 'Add Client', href: 'clients.html?action=form' } }, function (root) {
    var projects = TZ.db.all('projects');
    var rows = TZ.db.all('clients').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    rows.forEach(function (c) {
      var mine = projects.filter(function (p) { return p.client_id === c.id; });
      c._proj = mine.length;
      c._value = mine.reduce(function (a, p) { return a + (Number(p.budget) || 0); }, 0);
    });

    var body = rows.map(function (c) {
      var ini = initials(c.name);
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-5 py-3"><div class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">' + e(ini) + '</div>' +
          '<div class="min-w-0"><p class="font-semibold text-slate-800 truncate">' + e(c.name) + '</p><p class="text-xs text-slate-400 truncate">' + e(c.company) + '</p></div></div></td>' +
        '<td class="px-5 py-3 hidden md:table-cell"><p class="text-slate-600 truncate">' + e(c.email) + '</p><p class="text-xs text-slate-400">' + e(c.phone) + '</p></td>' +
        '<td class="px-5 py-3 hidden lg:table-cell text-slate-500">' + e(c.city) + '</td>' +
        '<td class="px-5 py-3 text-center text-slate-700 font-semibold">' + c._proj + '</td>' +
        '<td class="px-5 py-3 text-right font-semibold text-slate-800">' + money(c._value) + '</td>' +
        '<td class="px-5 py-3 text-center"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500') + '">' + e(TZ.ucfirst(c.status)) + '</span></td>' +
        '<td class="px-5 py-3"><div class="flex items-center justify-end gap-1.5">' +
          '<a href="clients.html?action=form&id=' + c.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center" title="Edit">' + icon('edit', 15) + '</a>' +
          '<button data-del="' + c.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center" title="Delete">' + icon('trash', 15) + '</button>' +
        '</div></td></tr>';
    }).join('');
    if (!rows.length) body = '<tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">No clients yet. Click <strong>Add Client</strong> to create one.</td></tr>';

    root.innerHTML =
      '<div class="p-6"><div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto">' +
        '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-5 py-3 font-semibold">Client</th><th class="px-5 py-3 font-semibold hidden md:table-cell">Contact</th>' +
          '<th class="px-5 py-3 font-semibold hidden lg:table-cell">City</th><th class="px-5 py-3 font-semibold text-center">Projects</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Total Value</th><th class="px-5 py-3 font-semibold text-center">Status</th>' +
          '<th class="px-5 py-3 font-semibold text-right">Actions</th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this client?')) return;
      TZ.db.remove('clients', b.getAttribute('data-del')); TZ.flash('Client deleted.', 'info'); location.reload();
    });
  });

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/);
    return (p[0].charAt(0) + (p[1] ? p[1].charAt(0) : '')).toUpperCase();
  }
})();
