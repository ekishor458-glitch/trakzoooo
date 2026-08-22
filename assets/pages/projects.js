/* Projects (ports projects.php) */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, moneyShort = TZ.moneyShort;
  var F = TZ.fieldInput, S = TZ.fieldSelect, TA = TZ.fieldTextarea, CUR = TZ.CUR;
  var badge = { active: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', 'on-hold': 'bg-amber-100 text-amber-700', planning: 'bg-slate-100 text-slate-600' };

  var clients = TZ.db.all('clients').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var clientOpts = { '': '— none —' };
  clients.forEach(function (c) { clientOpts[c.id] = c.company ? c.company + ' (' + c.name + ')' : c.name; });

  var action = TZ.qs('action') || 'list';
  var editId = TZ.qs('id');
  var edit = (action === 'form' && editId) ? TZ.db.get('projects', editId) : null;

  if (action === 'form') {
    TZ.mount({ page: 'projects', title: edit ? 'Edit Project' : 'New Project' }, function (root) {
      root.innerHTML =
        '<div class="p-6"><div class="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
          '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
            F('Project name', 'name', edit && edit.name, 'text', 'Skyline Tower') +
            S('Client', 'client_id', clientOpts, (edit && edit.client_id) || '') +
            F('Type', 'type', edit && edit.type, 'text', 'Residential High-Rise') +
            S('Status', 'status', { planning: 'Planning', active: 'Active', 'on-hold': 'On Hold', completed: 'Completed' }, (edit && edit.status) || 'planning') +
            F('Budget (' + CUR + ')', 'budget', edit && edit.budget, 'number', '0', 'step="0.01"') +
            F('Spent (' + CUR + ')', 'spent', edit && edit.spent, 'number', '0', 'step="0.01"') +
            F('Progress (%)', 'progress', edit ? edit.progress : 0, 'number', '0', 'min="0" max="100"') +
            F('Manager', 'manager', edit && edit.manager, 'text', 'James Carter') +
            F('Start date', 'start_date', edit && edit.start_date, 'date') +
            F('End date', 'end_date', edit && edit.end_date, 'date') +
            F('Area (sq.ft)', 'area', edit && edit.area, 'number') +
            F('Floors', 'floors', edit && edit.floors, 'number') +
            F('Site address', 'site_address', edit && edit.site_address, 'text', '14 Harbor Blvd, NY') +
            TA('Description', 'description', edit && edit.description) +
          '</div><div class="flex gap-3 pt-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + (edit ? 'Save changes' : 'Create project') + '</button>' +
            '<a href="projects.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
          '</div></form></div></div>';

      document.getElementById('f').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var d = TZ.formData(this);
        var allowed = ['planning', 'active', 'on-hold', 'completed'];
        var rec = {
          name: (d.name || '').trim(),
          client_id: parseInt(d.client_id, 10) || null,
          site_address: (d.site_address || '').trim(),
          type: (d.type || '').trim(),
          status: allowed.indexOf(d.status) >= 0 ? d.status : 'planning',
          budget: Number(d.budget) || 0,
          spent: Number(d.spent) || 0,
          progress: Math.max(0, Math.min(100, parseInt(d.progress, 10) || 0)),
          start_date: d.start_date || null,
          end_date: d.end_date || null,
          area: parseInt(d.area, 10) || 0,
          floors: parseInt(d.floors, 10) || 0,
          manager: (d.manager || '').trim(),
          description: (d.description || '').trim(),
        };
        if (edit) { TZ.db.update('projects', edit.id, rec); TZ.flash('Project updated.'); }
        else { TZ.db.insert('projects', rec); TZ.flash('Project created.'); }
        location.href = 'projects.html';
      });
    });
    return;
  }

  // ---- List (card grid) ----
  TZ.mount({ page: 'projects', title: 'Projects', action: { label: 'New Project', href: 'projects.html?action=form' } }, function (root) {
    var rows = TZ.db.all('projects').sort(function (a, b) { return b.id - a.id; });
    var cmap = {}; clients.forEach(function (c) { cmap[c.id] = c; });

    var cards = rows.map(function (p) {
      var c = cmap[p.client_id];
      var rem = (Number(p.budget) || 0) - (Number(p.spent) || 0);
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">' +
        '<div class="flex items-start justify-between mb-3">' +
          '<div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">' + icon('folder', 18) + '</div>' +
          '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (badge[p.status] || 'bg-slate-100 text-slate-600') + '">' + e(TZ.ucfirst(TZ.dashToSpace(p.status))) + '</span></div>' +
        '<h3 class="font-bold text-slate-800 font-display leading-tight">' + e(p.name) + '</h3>' +
        '<p class="text-xs text-slate-400 mb-1">' + e((c && (c.company || c.name)) || 'No client') + '</p>' +
        '<p class="text-xs text-slate-400 flex items-center gap-1 mb-3">' + icon('map-pin', 12) + '<span class="truncate">' + e(p.site_address) + '</span></p>' +
        '<div class="flex items-center gap-2 mb-3"><div class="flex-1 bg-slate-100 rounded-full h-1.5"><div class="h-1.5 rounded-full bg-blue-500" style="width:' + (p.progress | 0) + '%"></div></div>' +
          '<span class="text-[11px] text-slate-500">' + (p.progress | 0) + '%</span></div>' +
        '<div class="grid grid-cols-3 gap-2 text-center mb-4">' +
          '<div><p class="text-[10px] text-slate-400 uppercase tracking-wide">Budget</p><p class="text-sm font-bold text-slate-800">' + moneyShort(p.budget) + '</p></div>' +
          '<div><p class="text-[10px] text-slate-400 uppercase tracking-wide">Spent</p><p class="text-sm font-bold text-rose-500">' + moneyShort(p.spent) + '</p></div>' +
          '<div><p class="text-[10px] text-slate-400 uppercase tracking-wide">Left</p><p class="text-sm font-bold text-emerald-600">' + moneyShort(rem) + '</p></div></div>' +
        '<div class="flex items-center gap-2 pt-3 border-t border-slate-100">' +
          '<a href="projects.html?action=form&id=' + p.id + '" class="flex-1 text-center py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">Edit</a>' +
          '<button data-del="' + p.id + '" class="w-9 h-9 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
        '</div></div>';
    }).join('');
    if (!rows.length) cards = '<div class="col-span-full bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">No projects yet. Click <strong>New Project</strong> to add one.</div>';

    root.innerHTML = '<div class="p-6"><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">' + cards + '</div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!confirm('Delete this project?')) return;
      TZ.db.remove('projects', b.getAttribute('data-del')); TZ.flash('Project deleted.', 'info'); location.reload();
    });
  });
})();
