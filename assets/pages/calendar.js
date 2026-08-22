/* Calendar (ports calendar.php) */
(function () {
  var e = TZ.esc, icon = window.icon, F = TZ.fieldInput, S = TZ.fieldSelect;
  var typeColor = { meeting: 'bg-violet-500', deadline: 'bg-rose-500', inspection: 'bg-blue-500', delivery: 'bg-amber-500', task: 'bg-emerald-500' };

  var projects = TZ.db.all('projects').sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var projOpts = { '': '— none —' }; projects.forEach(function (p) { projOpts[p.id] = p.name; });

  var ym = TZ.qs('ym') || TZ.todayISO().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) ym = TZ.todayISO().slice(0, 7);
  var year = +ym.slice(0, 4), month = +ym.slice(5, 7); // month 1-12
  var first = new Date(year, month - 1, 1);
  var daysIn = new Date(year, month, 0).getDate();
  var startDow = first.getDay();
  var prevYm = ymShift(ym, -1), nextYm = ymShift(ym, 1);
  var todayIso = TZ.todayISO();

  TZ.mount({ page: 'calendar', title: 'Calendar' }, function (root) {
    var all = TZ.db.all('calendar_events');
    var monthPrefix = ym + '-';
    var byDay = {};
    all.filter(function (ev) { return String(ev.event_date).slice(0, 7) === ym; }).forEach(function (ev) {
      var day = parseInt(String(ev.event_date).slice(8, 10), 10);
      (byDay[day] = byDay[day] || []).push(ev);
    });
    Object.keys(byDay).forEach(function (d) { byDay[d].sort(function (a, b) { return String(a.event_time).localeCompare(String(b.event_time)); }); });

    var upcoming = all.filter(function (ev) { return String(ev.event_date) >= todayIso; })
      .sort(function (a, b) { var d = String(a.event_date).localeCompare(String(b.event_date)); return d !== 0 ? d : String(a.event_time).localeCompare(String(b.event_time)); })
      .slice(0, 8);
    var pmap = {}; projects.forEach(function (p) { pmap[p.id] = p; });

    // calendar cells
    var cells = '';
    for (var i = 0; i < startDow; i++) cells += '<div class="min-h-20 rounded-lg bg-slate-50/40"></div>';
    for (var day = 1; day <= daysIn; day++) {
      var iso = year + '-' + TZ.pad(month) + '-' + TZ.pad(day);
      var isToday = iso === todayIso;
      var evs = (byDay[day] || []).map(function (ev) {
        return '<div class="flex items-center gap-1 mb-0.5"><span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ' + (typeColor[ev.type] || 'bg-slate-400') + '"></span>' +
          '<span class="text-[10px] text-slate-600 truncate" title="' + e(ev.title) + '">' + e(ev.title) + '</span></div>';
      }).join('');
      cells += '<div class="min-h-20 rounded-lg border border-slate-100 p-1.5 ' + (isToday ? 'bg-blue-50 border-blue-200' : '') + '">' +
        '<div class="text-[11px] font-semibold ' + (isToday ? 'text-blue-600' : 'text-slate-500') + ' mb-1">' + day + '</div>' + evs + '</div>';
    }

    var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="py-1">' + d + '</div>'; }).join('');

    var upHtml = upcoming.map(function (ev) {
      return '<div class="flex items-center gap-2.5"><span class="w-2 h-2 rounded-full flex-shrink-0 ' + (typeColor[ev.type] || 'bg-slate-400') + '"></span>' +
        '<div class="flex-1 min-w-0"><p class="text-sm text-slate-700 truncate">' + e(ev.title) + '</p><p class="text-[11px] text-slate-400">' + e(ev.event_date) + (ev.event_time ? ' · ' + e(ev.event_time) : '') + '</p></div>' +
        '<button data-del="' + ev.id + '" class="text-slate-300 hover:text-rose-500" title="Delete">' + icon('x', 14) + '</button></div>';
    }).join('') || '<p class="text-sm text-slate-400">No upcoming events.</p>';

    root.innerHTML = '<div class="p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">' +
      '<div class="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
        '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-slate-900 font-display">' + TZ.MONTHS[month - 1] + ' ' + year + '</h3>' +
          '<div class="flex items-center gap-1">' +
            '<a href="calendar.html?ym=' + prevYm + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center">' + icon('chevron-left', 16) + '</a>' +
            '<a href="calendar.html?ym=' + todayIso.slice(0, 7) + '" class="px-3 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center">Today</a>' +
            '<a href="calendar.html?ym=' + nextYm + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center">' + icon('chevron-right', 16) + '</a>' +
          '</div></div>' +
        '<div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 uppercase mb-1">' + dow + '</div>' +
        '<div class="grid grid-cols-7 gap-1">' + cells + '</div></div>' +

      '<div class="space-y-4">' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
          '<p class="text-sm font-bold text-slate-800 font-display mb-3">Add event</p>' +
          '<form id="add" class="space-y-3">' +
            F('Title', 'title', '', 'text', 'Site inspection') +
            '<div class="grid grid-cols-2 gap-3">' + F('Date', 'event_date', todayIso, 'date') + F('Time', 'event_time', '', 'time') + '</div>' +
            S('Type', 'type', { task: 'Task', meeting: 'Meeting', deadline: 'Deadline', inspection: 'Inspection', delivery: 'Delivery' }, 'task') +
            S('Project', 'project_id', projOpts, '') +
            '<button class="w-full px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5">' + icon('plus', 16) + 'Add event</button>' +
          '</form></div>' +

        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
          '<p class="text-sm font-bold text-slate-800 font-display mb-3">Upcoming</p><div class="space-y-2.5">' + upHtml + '</div></div>' +
      '</div></div>';

    document.getElementById('add').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var allowed = ['meeting', 'deadline', 'inspection', 'delivery', 'task'];
      TZ.db.insert('calendar_events', {
        title: (d.title || '').trim(), event_date: d.event_date || todayIso,
        type: allowed.indexOf(d.type) >= 0 ? d.type : 'task', event_time: d.event_time || '',
        project_id: parseInt(d.project_id, 10) || null,
      });
      TZ.flash('Event added.'); location.href = 'calendar.html?ym=' + ym;
    });
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      TZ.db.remove('calendar_events', b.getAttribute('data-del')); TZ.flash('Event deleted.', 'info'); location.href = 'calendar.html?ym=' + ym;
    });
  });

  function ymShift(ym, delta) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + delta;
    var d = new Date(y, m, 1);
    return d.getFullYear() + '-' + TZ.pad(d.getMonth() + 1);
  }
})();
