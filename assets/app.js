/* Trackzo — app shell (ports inc/header.php + inc/footer.php).
 * TZ.mount({page, title, action}, renderFn) builds the sidebar/topbar layout,
 * enforces login, shows flashes, then calls renderFn(mainContentEl). */
(function () {
  var e = TZ.esc, icon = window.icon;

  var NAV = [
    { slug: 'dashboard', label: 'Dashboard', icon: 'dashboard', file: 'index.html' },
    { slug: 'projects', label: 'Projects', icon: 'folder', file: 'projects.html' },
    { slug: 'clients', label: 'Clients', icon: 'users', file: 'clients.html' },
    { slug: 'estimation', label: 'Estimation', icon: 'calculator', file: 'estimation.html' },
    { slug: 'materials', label: 'Materials', icon: 'package', file: 'materials.html' },
    { slug: 'purchase', label: 'Purchase', icon: 'cart', file: 'purchase.html' },
    { slug: 'finance', label: 'Finance', icon: 'dollar', file: 'finance.html' },
    { slug: 'reports', label: 'Reports', icon: 'bar-chart', file: 'reports.html' },
    { slug: 'workspace', label: 'Project Workspace', icon: 'building', file: 'workspace.html' },
    { slug: 'calendar', label: 'Calendar', icon: 'calendar', file: 'calendar.html' },
    { slug: 'account-tracker', label: 'Account Tracker', icon: 'credit-card', file: 'account_tracker.html' },
    { slug: 'settings', label: 'Settings', icon: 'settings', file: 'settings.html' },
  ];

  function initials(name) {
    var parts = String(name || 'U').trim().split(/\s+/);
    return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase() || 'U';
  }

  function navItem(it, page) {
    var on = it.slug === page;
    return '<li><a href="' + e(it.file) + '" title="' + e(it.label) + '" ' +
      'class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ' +
      (on ? 'bg-brand text-white shadow-lg' : 'text-blue-200 hover:bg-white/10 hover:text-white') + '">' +
      '<span class="flex-shrink-0">' + icon(it.icon, 18) + '</span>' +
      '<span class="truncate sb-label">' + e(it.label) + '</span>' +
      (on ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 sb-label"></span>' : '') +
      '</a></li>';
  }

  var FLASH_CLS = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-600',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  TZ.mount = function (opts, renderFn) {
    if (!TZ.requireLogin()) return;
    (TZ.ready || Promise.resolve()).then(function () { mountNow(opts, renderFn); });
  };
  function mountNow(opts, renderFn) {
    opts = opts || {};
    var page = opts.page || 'dashboard';
    var title = opts.title || 'Dashboard';
    var action = (opts.action && opts.action.label) ? opts.action : null;
    var user = TZ.currentUser();
    var nav = NAV.slice();
    if (TZ.isAdmin()) nav.push({ slug: 'admin', label: 'Admin Panel', icon: 'shield', file: 'admin.html' });
    var avatar = initials(user.name);

    document.title = title + ' · ' + TZ.APP_NAME;

    var mainMenu = nav.slice(0, 8).map(function (it) { return navItem(it, page); }).join('');
    var management = nav.slice(8).map(function (it) { return navItem(it, page); }).join('');

    var html =
      '<div class="flex h-screen overflow-hidden bg-slate-100">' +
      '<div id="sb-backdrop" class="fixed inset-0 bg-black/40 z-40 hidden lg:hidden"></div>' +

      '<aside id="sidebar" class="sidebar-grad flex flex-col h-full flex-shrink-0 transition-all duration-300 fixed inset-y-0 left-0 z-50 -translate-x-full lg:static lg:translate-x-0">' +
        '<div class="flex items-center px-4 border-b border-white/10" style="height:64px">' +
          '<a href="index.html" class="flex items-center gap-3 overflow-hidden">' +
            '<div class="flex items-center justify-center w-9 h-9 rounded-xl bg-brand flex-shrink-0 text-white">' + icon('hard-hat', 20) + '</div>' +
            '<div class="flex flex-col leading-none sb-label">' +
              '<span class="text-white font-bold text-lg tracking-tight font-display">Trackzo</span>' +
              '<span class="text-blue-300 text-[10px] font-medium tracking-widest uppercase">Construction ERP</span>' +
            '</div>' +
          '</a>' +
          '<button id="sb-chevron" class="ml-auto flex items-center justify-center w-7 h-7 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">' + icon('chevron-left', 16) + '</button>' +
        '</div>' +
        '<nav class="flex-1 py-4 overflow-y-auto scrollbar-hide">' +
          '<p class="px-4 mb-2 text-[10px] font-semibold tracking-widest text-blue-400/60 uppercase sb-label">Main Menu</p>' +
          '<ul class="space-y-0.5 px-2">' + mainMenu + '</ul>' +
          '<p class="px-4 mt-4 mb-2 text-[10px] font-semibold tracking-widest text-blue-400/60 uppercase sb-label">Management</p>' +
          '<ul class="space-y-0.5 px-2">' + management + '</ul>' +
        '</nav>' +
        '<div class="border-t border-white/10 p-3">' +
          '<div class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors">' +
            '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">' + e(avatar) + '</div>' +
            '<div class="flex-1 min-w-0 sb-label">' +
              '<p class="text-white text-sm font-semibold truncate">' + e(user.name) + '</p>' +
              '<p class="text-blue-300 text-xs truncate">' + e(user.role || 'Member') + '</p>' +
            '</div>' +
            '<a href="login.html" onclick="TZ.logout();return false;" class="text-blue-300 hover:text-white transition-colors sb-label" title="Sign out">' + icon('logout', 15) + '</a>' +
          '</div>' +
        '</div>' +
      '</aside>' +

      '<div class="flex-1 flex flex-col min-w-0 overflow-hidden">' +
        '<header class="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-2 sm:gap-4 flex-shrink-0" style="box-shadow:0 1px 4px rgba(0,0,0,.06)">' +
          '<button id="sb-open" class="lg:hidden w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0" aria-label="Open menu">' + icon('menu', 18) + '</button>' +
          '<div class="flex-1 min-w-0">' +
            '<h1 class="text-base sm:text-lg font-bold text-slate-900 truncate font-display">' + e(title) + '</h1>' +
            '<p class="text-xs text-slate-400 hidden sm:block">' + e(TZ.fmtLongToday()) + '</p>' +
          '</div>' +
          '<div class="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64 text-slate-400">' +
            icon('search', 15) +
            '<input type="text" placeholder="Search anything..." class="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full">' +
          '</div>' +
          '<button class="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0">' + icon('bell', 17) +
            '<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">3</span></button>' +
          (action ? '<a href="' + e(action.href) + '" class="flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex-shrink-0" title="' + e(action.label) + '">' + icon('plus', 16) + '<span class="hidden sm:inline">' + e(action.label) + '</span></a>' : '') +
          '<div class="flex items-center gap-2 flex-shrink-0"><div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">' + e(avatar) + '</div></div>' +
        '</header>' +
        '<main id="tz-main" class="flex-1 overflow-y-auto"></main>' +
      '</div>' +
      '</div>';

    var app = document.getElementById('app');
    app.innerHTML = html;

    var main = document.getElementById('tz-main');
    // Flash messages
    var flashes = TZ.takeFlashes();
    if (flashes.length) {
      var f = document.createElement('div');
      f.innerHTML = flashes.map(function (fl) {
        var c = FLASH_CLS[fl.type] || 'bg-slate-50 border-slate-200 text-slate-700';
        return '<div class="mx-6 mt-4 -mb-2 rounded-xl border px-4 py-3 text-sm font-medium ' + c + '">' + e(fl.msg) + '</div>';
      }).join('');
      main.appendChild(f);
    }
    var content = document.createElement('div');
    main.appendChild(content);

    wireSidebar();

    if (typeof renderFn === 'function') renderFn(content);
  };

  /* ---- Sidebar behaviour (ports footer.php script) ---- */
  function sb() { return document.getElementById('sidebar'); }
  function bd() { return document.getElementById('sb-backdrop'); }
  function isDesktop() { return window.matchMedia('(min-width:1024px)').matches; }
  function openSidebar() { sb().classList.remove('-translate-x-full'); bd().classList.remove('hidden'); }
  function closeSidebar() { sb().classList.add('-translate-x-full'); bd().classList.add('hidden'); }
  function toggleCollapse() {
    var s = sb(); s.classList.toggle('is-collapsed');
    try { localStorage.setItem('tz_sb', s.classList.contains('is-collapsed') ? '1' : '0'); } catch (e) {}
  }
  function chevronClick() { if (isDesktop()) toggleCollapse(); else closeSidebar(); }
  TZ.openSidebar = openSidebar; TZ.closeSidebar = closeSidebar;

  function wireSidebar() {
    document.getElementById('sb-open').addEventListener('click', openSidebar);
    document.getElementById('sb-backdrop').addEventListener('click', closeSidebar);
    document.getElementById('sb-chevron').addEventListener('click', chevronClick);
    try { if (localStorage.getItem('tz_sb') === '1') sb().classList.add('is-collapsed'); } catch (e) {}
  }
  window.addEventListener('resize', function () { if (isDesktop() && document.getElementById('sidebar')) closeSidebar(); });

  /* ---- Form field helpers (port helpers.php) ---- */
  function fieldInput(label, name, val, type, ph, attr) {
    type = type || 'text'; val = val == null ? '' : val; ph = ph || ''; attr = attr || '';
    return '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">' + e(label) + '</label>' +
      '<input type="' + type + '" name="' + e(name) + '" value="' + e(val) + '" placeholder="' + e(ph) + '" ' + attr +
      ' class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"></div>';
  }
  // options: object {value: label} or array of [value, label]
  function fieldSelect(label, name, options, selected) {
    selected = selected == null ? '' : String(selected);
    var opts = '';
    var pairs = Array.isArray(options) ? options.map(function (o) { return Array.isArray(o) ? o : [o, o]; })
      : Object.keys(options).map(function (k) { return [k, options[k]]; });
    pairs.forEach(function (p) {
      opts += '<option value="' + e(p[0]) + '"' + (String(p[0]) === selected ? ' selected' : '') + '>' + e(p[1]) + '</option>';
    });
    return '<div><label class="block text-xs font-semibold text-slate-600 mb-1.5">' + e(label) + '</label>' +
      '<select name="' + e(name) + '" class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400">' +
      opts + '</select></div>';
  }
  function fieldTextarea(label, name, val, rows) {
    rows = rows || 3; val = val == null ? '' : val;
    return '<div class="sm:col-span-2"><label class="block text-xs font-semibold text-slate-600 mb-1.5">' + e(label) + '</label>' +
      '<textarea name="' + e(name) + '" rows="' + rows + '" class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400">' + e(val) + '</textarea></div>';
  }
  TZ.fieldInput = fieldInput; TZ.fieldSelect = fieldSelect; TZ.fieldTextarea = fieldTextarea;
})();
