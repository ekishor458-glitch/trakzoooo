/* Project Workspace (ports workspace.php) — per-project dashboards. */
(function () {
  var e = TZ.esc, icon = window.icon, money = TZ.money, moneyShort = TZ.moneyShort, trimNum = TZ.trimNum, CUR = TZ.CUR;
  var F = TZ.fieldInput, S = TZ.fieldSelect, TA = TZ.fieldTextarea;

  var SECTIONS = {
    overview: ['Overview', 'dashboard'],
    customer: ['Customer Profile', 'user'],
    owner: ['Owner Details', 'users'],
    site: ['Site Address', 'map-pin'],
    measurements: ['Property Measurements', 'ruler'],
    construction: ['Construction Details', 'tool'],
    materials: ['Material Management', 'package'],
    estimation: ['Cost Estimation', 'clipboard'],
    expenses: ['Expense Tracker', 'wallet'],
    progress: ['Construction Progress', 'activity'],
    documents: ['Documents', 'file-text'],
    reports: ['Reports', 'bar-chart'],
    notes: ['Notes', 'sticky-note'],
  };
  var DETAIL_COLS = {
    customer: ['customer_name', 'customer_company', 'customer_email', 'customer_phone'],
    owner: ['owner_name', 'owner_email', 'owner_phone', 'owner_address'],
    site: ['site_address', 'site_city', 'site_state', 'site_pincode', 'site_maplink'],
    measurements: ['plot_length', 'plot_width', 'plot_area', 'builtup_sqft'],
    construction: ['construction_type', 'structure_type', 'foundation_type', 'roofing_type', 'num_floors', 'num_units', 'construction_notes'],
  };
  var NUMERIC_DETAIL = ['plot_length', 'plot_width', 'plot_area', 'builtup_sqft', 'num_floors', 'num_units'];
  var DETAIL_LABELS = {
    customer_name: 'Customer name', customer_company: 'Company', customer_email: 'Email', customer_phone: 'Phone',
    owner_name: 'Owner name', owner_email: 'Owner email', owner_phone: 'Owner phone', owner_address: 'Owner address',
    site_address: 'Site address', site_city: 'City', site_state: 'State', site_pincode: 'Pincode', site_maplink: 'Google Maps link',
    plot_length: 'Length (ft)', plot_width: 'Width (ft)', plot_area: 'Plot area (sq ft)', builtup_sqft: 'Built-up area (sq ft)',
    construction_type: 'Construction type', structure_type: 'Structure type', foundation_type: 'Foundation type', roofing_type: 'Roofing type',
    num_floors: 'Number of floors', num_units: 'Number of units', construction_notes: 'Construction notes',
  };
  var badge = { active: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', 'on-hold': 'bg-amber-100 text-amber-700', planning: 'bg-slate-100 text-slate-600' };

  var pid = parseInt(TZ.qs('project'), 10) || 0;
  var section = TZ.qs('section') || 'overview';
  if (!SECTIONS[section]) section = 'overview';
  var newForm = TZ.qs('new') != null;
  var mid = parseInt(TZ.qs('mid'), 10) || 0;

  var requestedPid = parseInt(TZ.qs('project'), 10) || 0;
  var allProjects = TZ.db.all('projects').sort(function (a, b) { return b.id - a.id; });
  var project = pid > 0 ? TZ.db.get('projects', pid) : null;   // scoped: null if it isn't yours (admin sees all)
  if (!project) pid = 0;
  // A specific project was requested but you can't see it → it isn't yours (or doesn't exist).
  var accessDenied = requestedPid > 0 && !project && !newForm;

  var pageTitle = project ? project.name : (accessDenied ? 'Not available' : 'Project Workspace');
  var topAction = (!project && !newForm && !accessDenied) ? { label: 'New Project', href: 'workspace.html?new=1' } : null;

  TZ.mount({ page: 'workspace', title: pageTitle, action: topAction }, function (root) {
    if (accessDenied) { renderNoAccess(root); return; }
    if (newForm) { renderNewForm(root); return; }
    if (!project) { renderList(root); return; }
    renderDashboard(root);
  });

  /* ---------------- ACCESS DENIED (project not owned by this account) ---------------- */
  function renderNoAccess(root) {
    root.innerHTML = '<div class="p-4 sm:p-6"><div class="max-w-lg mx-auto mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">' +
      '<div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">' + icon('shield', 26) + '</div>' +
      '<h2 class="text-lg font-bold text-slate-800 font-display mb-1">This project isn’t available on your account</h2>' +
      '<p class="text-sm text-slate-500 mb-5">You can only open projects that belong to your account. If you think this is a mistake, contact your administrator.</p>' +
      '<a href="workspace.html" class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">' + icon('arrow-left', 15) + ' Back to my projects</a>' +
      '</div></div>';
  }

  function secUrl(s) { return 'workspace.html?project=' + pid + '&section=' + s; }
  function backUrl() { return 'workspace.html?project=' + pid + '&section=' + section; }

  /* ---------------- NEW PROJECT FORM ---------------- */
  function renderNewForm(root) {
    root.innerHTML = '<div class="p-4 sm:p-6">' +
      '<a href="workspace.html" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">' + icon('arrow-left', 15) + ' All projects</a>' +
      '<div class="max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
        '<h2 class="font-bold text-slate-800 font-display text-lg mb-4">Create a new project</h2>' +
        '<form id="f" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
          F('Project name', 'name', '', 'text', 'e.g. Green Villa') +
          F('Type', 'type', '', 'text', 'Residential / Commercial') +
          S('Status', 'status', { planning: 'Planning', active: 'Active', 'on-hold': 'On Hold', completed: 'Completed' }, 'planning') +
          F('Total budget (' + CUR + ')', 'budget', '', 'number', '0', 'step="0.01"') +
          F('Start date', 'start_date', TZ.todayISO(), 'date') +
          F('Site engineer / manager', 'manager', '', 'text', 'Name') +
        '</div><div class="flex gap-3 pt-1">' +
          '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Create project</button>' +
          '<a href="workspace.html" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' +
        '</div></form></div></div>';

    document.getElementById('f').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var allowed = ['planning', 'active', 'on-hold', 'completed'];
      var id = TZ.db.insert('projects', {
        name: (d.name || 'Untitled Project').trim(), client_id: null, site_address: '', type: (d.type || '').trim(),
        status: allowed.indexOf(d.status) >= 0 ? d.status : 'planning', budget: Number(d.budget) || 0, spent: 0, progress: 0,
        start_date: d.start_date || null, end_date: null, area: 0, floors: 0, manager: (d.manager || '').trim(), description: '', created_at: TZ.todayISO(),
      });
      TZ.db.detail(id);
      TZ.flash('Project created.');
      location.href = 'workspace.html?project=' + id + '&section=overview';
    });
  }

  /* ---------------- PROJECT LIST ---------------- */
  function renderList(root) {
    var cards = allProjects.map(function (p) {
      return '<a href="workspace.html?project=' + p.id + '" class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 min-h-[150px] flex flex-col">' +
        '<div class="flex items-start justify-between mb-3"><div class="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center">' + icon('building', 18) + '</div>' +
          '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg ' + (badge[p.status] || 'bg-slate-100 text-slate-600') + '">' + e(TZ.ucfirst(TZ.dashToSpace(p.status))) + '</span></div>' +
        '<h3 class="font-bold text-slate-800 font-display leading-tight mb-1">' + e(p.name) + '</h3>' +
        '<p class="text-xs text-slate-400 mb-3">' + moneyShort(p.budget) + ' budget</p>' +
        '<div class="mt-auto flex items-center gap-2"><div class="flex-1 bg-slate-100 rounded-full h-1.5"><div class="h-1.5 rounded-full bg-blue-500" style="width:' + (p.progress | 0) + '%"></div></div>' +
        '<span class="text-[11px] text-slate-500">' + (p.progress | 0) + '%</span></div></a>';
    }).join('');

    root.innerHTML = '<div class="p-4 sm:p-6">' +
      '<div class="flex items-center justify-between mb-4"><div><h2 class="text-lg font-bold text-slate-800 font-display">All Projects</h2>' +
        '<p class="text-xs text-slate-400">Select a project to open its dedicated dashboard</p></div></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">' +
        '<a href="workspace.html?new=1" class="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand hover:bg-blue-50/40 text-slate-400 hover:text-brand transition-colors p-6 min-h-[150px]">' +
          '<div class="w-11 h-11 rounded-xl bg-blue-50 text-brand flex items-center justify-center">' + icon('plus', 22) + '</div><span class="text-sm font-semibold">New Project</span></a>' +
        cards + '</div>' +
      (allProjects.length ? '' : '<p class="text-slate-400 text-sm mt-6">No projects yet — click <strong>New Project</strong> to create your first one.</p>') +
      '</div>';
  }

  /* ---------------- PROJECT DASHBOARD ---------------- */
  function renderDashboard(root) {
    var det = TZ.db.detail(pid);
    var mats = TZ.db.where('project_materials', function (m) { return m.project_id === pid; });
    var exps = TZ.db.where('project_expenses', function (x) { return x.project_id === pid; });
    var materialCost = mats.reduce(function (a, m) { return a + num(m.total_cost); }, 0);
    var expenseTotal = exps.reduce(function (a, x) { return a + num(x.amount); }, 0);
    var labourCost = exps.filter(function (x) { return x.category === 'Labour'; }).reduce(function (a, x) { return a + num(x.amount); }, 0);
    var budget = num(project.budget);
    var totalExpenses = materialCost + expenseTotal;
    var remaining = budget - totalExpenses;
    var progress = project.progress | 0;

    var ctx = { det: det, mats: mats, exps: exps, materialCost: materialCost, expenseTotal: expenseTotal, labourCost: labourCost, budget: budget, totalExpenses: totalExpenses, remaining: remaining, progress: progress };

    // secondary sidebar
    var projOptions = allProjects.map(function (p) {
      return '<option value="workspace.html?project=' + p.id + '&section=' + section + '"' + (p.id === pid ? ' selected' : '') + '>' + e(p.name) + '</option>';
    }).join('');
    var navLinks = Object.keys(SECTIONS).map(function (slug) {
      var on = slug === section, meta = SECTIONS[slug];
      return '<a href="' + secUrl(slug) + '" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ' + (on ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100') + '">' +
        '<span class="flex-shrink-0">' + icon(meta[1], 17) + '</span><span>' + e(meta[0]) + '</span></a>';
    }).join('');

    var content = buildSection(ctx);

    root.innerHTML = '<div class="flex flex-col lg:flex-row gap-4 p-4 sm:p-6">' +
      '<aside class="lg:w-56 flex-shrink-0"><div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 lg:sticky lg:top-4">' +
        '<a href="workspace.html" class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-2 px-1">' + icon('arrow-left', 14) + ' All projects</a>' +
        '<select id="projSelect" class="w-full mb-3 border border-slate-200 rounded-lg px-2 py-2 text-sm bg-slate-50 font-semibold text-slate-700">' + projOptions + '</select>' +
        '<nav class="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">' + navLinks + '</nav></div></aside>' +
      '<div class="flex-1 min-w-0 space-y-4" id="secContent">' + content + '</div></div>';

    document.getElementById('projSelect').addEventListener('change', function () { if (this.value) location.href = this.value; });
    wireSection(ctx);
  }

  function sectionHead(title, sub) {
    return '<div class="mb-1"><h2 class="text-lg font-bold text-slate-800 font-display">' + e(title) + '</h2>' + (sub ? '<p class="text-xs text-slate-400">' + e(sub) + '</p>' : '') + '</div>';
  }
  function hidden(entity, op) {
    return '<input type="hidden" name="entity" value="' + entity + '">' + (op ? '<input type="hidden" name="op" value="' + op + '">' : '') +
      '<input type="hidden" name="project_id" value="' + pid + '"><input type="hidden" name="section" value="' + section + '">';
  }

  function buildSection(ctx) {
    if (section === 'overview') return sec_overview(ctx);
    if (DETAIL_COLS[section]) return sec_details(ctx);
    if (section === 'materials') return sec_materials(ctx);
    if (section === 'estimation') return sec_estimation(ctx);
    if (section === 'expenses') return sec_expenses(ctx);
    if (section === 'progress') return sec_progress(ctx);
    if (section === 'documents') return sec_documents(ctx);
    if (section === 'notes') return sec_notes(ctx);
    if (section === 'reports') return sec_reports(ctx);
    return '';
  }

  /* ---- OVERVIEW ---- */
  function sec_overview(c) {
    var cards = [
      ['Total Budget', moneyShort(c.budget), 'dollar', 'bg-blue-50 text-blue-600'],
      ['Total Expenses', moneyShort(c.totalExpenses), 'wallet', 'bg-rose-50 text-rose-500'],
      ['Material Cost', moneyShort(c.materialCost), 'package', 'bg-violet-50 text-violet-600'],
      ['Labour Cost', moneyShort(c.labourCost), 'users', 'bg-amber-50 text-amber-600'],
      ['Progress', c.progress + '%', 'activity', 'bg-emerald-50 text-emerald-600'],
      ['Remaining Budget', moneyShort(c.remaining), 'trending-up', (c.remaining < 0 ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600')],
    ];
    var catMap = {};
    c.exps.forEach(function (x) { var k = x.category || 'Uncategorised'; catMap[k] = (catMap[k] || 0) + num(x.amount); });
    var analysis = [];
    if (c.materialCost > 0) analysis.push(['Materials', c.materialCost]);
    Object.keys(catMap).forEach(function (k) { analysis.push([k, catMap[k]]); });
    var amax = 1; analysis.forEach(function (a) { amax = Math.max(amax, a[1]); });
    var colors = ['#1D4ED8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6', '#F97316'];
    var ring = 'conic-gradient(#1D4ED8 0deg ' + (c.progress * 3.6) + 'deg,#E2E8F0 ' + (c.progress * 3.6) + 'deg 360deg)';

    var h = '<div class="flex items-center justify-between flex-wrap gap-2"><div>' +
      '<h2 class="text-lg font-bold text-slate-800 font-display">' + e(project.name) + '</h2>' +
      '<p class="text-xs text-slate-400">' + e(project.type || 'Project') + ' · <span class="px-2 py-0.5 rounded-lg text-[11px] font-semibold ' + (badge[project.status] || '') + '">' + e(TZ.ucfirst(TZ.dashToSpace(project.status))) + '</span></p></div>' +
      '<button id="delProject" class="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1">' + icon('trash', 14) + ' Delete project</button></div>';

    h += '<div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">' + cards.map(function (cd) {
      return '<div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">' +
        '<div class="w-9 h-9 rounded-xl ' + cd[3] + ' flex items-center justify-center mb-2">' + icon(cd[2], 17) + '</div>' +
        '<p class="text-xl font-bold text-slate-900 font-display">' + e(cd[1]) + '</p><p class="text-xs text-slate-500">' + e(cd[0]) + '</p></div>';
    }).join('') + '</div>';

    h += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center">' +
        '<h3 class="font-bold text-slate-900 text-sm mb-3 font-display self-start">Project Progress</h3>' +
        '<div class="rounded-full flex items-center justify-center" style="width:150px;height:150px;background:' + ring + '">' +
          '<div class="bg-white rounded-full flex flex-col items-center justify-center" style="width:104px;height:104px">' +
            '<span class="text-2xl font-bold text-slate-800 font-display">' + c.progress + '%</span><span class="text-[10px] text-slate-400">complete</span></div></div>' +
        '<div class="w-full mt-4 flex items-center justify-between text-xs"><span class="text-slate-500">Budget used</span>' +
          '<span class="font-semibold text-slate-700">' + (c.budget > 0 ? Math.round(c.totalExpenses / c.budget * 100) : 0) + '%</span></div></div>' +
      '<div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 class="font-bold text-slate-900 text-sm mb-4 font-display">Expense Analysis</h3><div class="space-y-3">' +
        (analysis.map(function (a, i) {
          return '<div><div class="flex justify-between text-xs mb-1"><span class="text-slate-600 font-medium">' + e(a[0]) + '</span><span class="text-slate-500">' + money(a[1]) + '</span></div>' +
            '<div class="bg-slate-100 rounded-full h-2.5"><div class="h-2.5 rounded-full" style="width:' + (a[1] / amax * 100) + '%;background:' + colors[i % colors.length] + '"></div></div></div>';
        }).join('') || '<p class="text-sm text-slate-400">No expenses or materials recorded yet.</p>') +
      '</div></div></div>';
    return h;
  }

  /* ---- PROFILE DETAIL SECTIONS ---- */
  function sec_details(c) {
    var cols = DETAIL_COLS[section];
    var fields = cols.map(function (col) {
      var val = c.det[col] == null ? '' : c.det[col];
      if (col === 'construction_notes') return TA(DETAIL_LABELS[col], col, val);
      if (['plot_length', 'plot_width', 'plot_area', 'builtup_sqft'].indexOf(col) >= 0) return F(DETAIL_LABELS[col], col, val, 'number', '', 'step="0.01"');
      if (['num_floors', 'num_units'].indexOf(col) >= 0) return F(DETAIL_LABELS[col], col, val, 'number');
      if (col === 'customer_email' || col === 'owner_email') return F(DETAIL_LABELS[col], col, val, 'email');
      return F(DETAIL_LABELS[col], col, val, 'text');
    }).join('');

    return sectionHead(SECTIONS[section][0], 'Information for this project only') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-3xl">' +
        '<form id="detForm" class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' + fields + '</div>' +
        '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Save</button></form></div>';
  }

  /* ---- MATERIAL MANAGEMENT ---- */
  function sec_materials(c) {
    var editM = mid ? TZ.db.get('project_materials', mid) : null;
    if (editM && editM.project_id !== pid) editM = null;
    var matCats = ['Cement', 'Steel', 'Sand', 'Bricks', 'Aggregate', 'Tiles', 'Paint', 'Plumbing', 'Electrical', 'Wood', 'Hardware', 'Other'];
    var catOpts = {}; matCats.forEach(function (m) { catOpts[m] = m; });

    // Group purchases by material name — each group is one item (e.g. Cement),
    // with every purchase listed underneath as a dated entry.
    var groups = {}, order = [];
    c.mats.forEach(function (m) {
      var key = (m.name || 'Unnamed').trim().toLowerCase();
      if (!groups[key]) { groups[key] = { name: (m.name || 'Unnamed').trim(), category: m.category || '', unit: m.unit || '', items: [], qty: 0, used: 0, total: 0 }; order.push(key); }
      var g = groups[key];
      g.items.push(m); g.qty += num(m.quantity); g.used += num(m.used_qty); g.total += num(m.total_cost);
      if (!g.unit) g.unit = m.unit || '';
      if (!g.category) g.category = m.category || '';
    });
    order.sort(function (a, b) { return groups[a].name.toLowerCase() < groups[b].name.toLowerCase() ? -1 : 1; });

    var body = order.map(function (key) {
      var g = groups[key], gleft = g.qty - g.used;
      var header = '<tr class="bg-slate-50/80 border-t-2 border-slate-200">' +
        '<td colspan="5" class="px-4 py-2.5"><span class="font-bold text-slate-800">' + e(g.name) + '</span>' +
          '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 ml-2">' + e(g.category || '—') + '</span></td>' +
        '<td colspan="3" class="px-4 py-2.5 text-right text-xs text-slate-500">' + g.items.length + ' entr' + (g.items.length > 1 ? 'ies' : 'y') +
          ' · <span class="font-semibold text-slate-700">' + trimNum(g.qty, 2) + ' ' + e(g.unit) + '</span>' +
          ' · left <span class="font-semibold ' + (gleft <= 0 ? 'text-rose-500' : 'text-emerald-600') + '">' + trimNum(gleft, 2) + '</span>' +
          ' · <span class="font-bold text-slate-800">' + money(g.total) + '</span></td></tr>';
      var entries = g.items.slice().sort(function (a, b) {
        var d = String(b.purchase_date).localeCompare(String(a.purchase_date)); return d !== 0 ? d : b.id - a.id;
      }).map(function (m) {
        var left = num(m.quantity) - num(m.used_qty);
        return '<tr class="hover:bg-slate-50/70">' +
          '<td class="px-4 py-3 whitespace-nowrap text-slate-600">' + e(m.purchase_date || '—') + '</td>' +
          '<td class="px-4 py-3 hidden md:table-cell text-slate-500">' + e(m.supplier || '—') + '</td>' +
          '<td class="px-4 py-3 text-right text-slate-600">' + trimNum(m.quantity, 2) + ' <span class="text-[10px] text-slate-400">' + e(m.unit) + '</span></td>' +
          '<td class="px-4 py-3 text-right text-slate-600">' + money(m.cost) + '</td>' +
          '<td class="px-4 py-3 text-right font-bold text-slate-800">' + money(m.total_cost) + '</td>' +
          '<td class="px-4 py-3 text-right text-slate-600">' + trimNum(m.used_qty, 2) + '</td>' +
          '<td class="px-4 py-3 text-right font-semibold ' + (left <= 0 ? 'text-rose-500' : 'text-emerald-600') + '">' + trimNum(left, 2) + '</td>' +
          '<td class="px-4 py-3"><div class="flex items-center justify-end gap-1.5">' +
            '<a href="' + secUrl('materials') + '&mid=' + m.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center">' + icon('edit', 15) + '</a>' +
            '<button data-delmat="' + m.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button>' +
          '</div></td></tr>';
      }).join('');
      return header + entries;
    }).join('');
    if (!order.length) body = '<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">No materials yet. Add one below.</td></tr>';
    var foot = order.length ? '<tfoot><tr class="bg-slate-50 border-t-2 border-slate-200"><td colspan="4" class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Total material cost</td><td class="px-4 py-2.5 text-right font-bold text-slate-800">' + money(c.materialCost) + '</td><td colspan="3"></td></tr></tfoot>' : '';

    var editDate = editM && editM.purchase_date ? String(editM.purchase_date).slice(0, 10) : TZ.todayISO();

    return sectionHead('Material Management', 'Each material is grouped by name — add the same item again to log another dated purchase') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm">' +
        '<thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-4 py-3 font-semibold">Date &amp; Time</th><th class="px-4 py-3 font-semibold hidden md:table-cell">Supplier</th>' +
          '<th class="px-4 py-3 font-semibold text-right">Quantity</th><th class="px-4 py-3 font-semibold text-right">Unit Cost</th>' +
          '<th class="px-4 py-3 font-semibold text-right">Amount</th><th class="px-4 py-3 font-semibold text-right">Used</th>' +
          '<th class="px-4 py-3 font-semibold text-right">Left</th><th class="px-4 py-3"></th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody>' + foot + '</table></div></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
        '<p class="text-sm font-bold text-slate-800 font-display mb-3">' + (editM ? 'Edit purchase entry' : 'Add material purchase') + '</p>' +
        '<form id="matForm" class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
          '<input type="hidden" name="id" value="' + (editM ? editM.id : 0) + '">' +
          '<div class="col-span-2">' + F('Material name', 'name', editM && editM.name, 'text', 'e.g. Cement') + '</div>' +
          S('Category', 'category', catOpts, (editM && editM.category) || 'Cement') +
          F('Supplier', 'supplier', editM && editM.supplier, 'text', 'Supplier name') +
          F('Quantity', 'quantity', editM && editM.quantity, 'number', '0', 'step="0.01"') +
          F('Unit', 'unit', editM && editM.unit, 'text', 'Bags / MT / Cu.ft') +
          F('Unit cost (' + CUR + ')', 'cost', editM && editM.cost, 'number', '0', 'step="0.01"') +
          F('Used quantity', 'used_qty', editM ? editM.used_qty : '0', 'number', '0', 'step="0.01"') +
          F('Date', 'purchase_date', editDate, 'date') +
          '<div class="col-span-2 md:col-span-4 flex gap-2">' +
            '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon(editM ? 'edit' : 'plus', 16) + (editM ? 'Save changes' : 'Add purchase') + '</button>' +
            (editM ? '<a href="' + secUrl('materials') + '" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancel</a>' : '') +
          '</div></form>' +
        '<p class="text-[11px] text-slate-400 mt-2">The time is recorded automatically. Amount = Quantity × Unit cost. Left = Quantity − Used. Same material name groups entries together.</p></div>';
  }

  // Floor options derived from construction details (num_floors) or project floors.
  function floorList(c) {
    var n = num(c.det && c.det.num_floors) || num(project.floors) || 3;
    if (n > 30) n = 30;
    var list = ['Foundation'];
    for (var i = 1; i <= n; i++) list.push('Floor ' + i);
    list.push('Common / External');
    return list;
  }

  /* ---- COST ESTIMATION (floor-wise) ---- */
  function sec_estimation(c) {
    var items = TZ.db.where('project_estimates', function (i) { return i.project_id === pid; }).sort(function (a, b) { return a.id - b.id; });
    var estTotal = items.reduce(function (a, it) { return a + num(it.amount); }, 0);

    // Group line items by floor
    var groups = {}, present = [];
    items.forEach(function (it) {
      var fl = (it.floor && String(it.floor).trim()) || 'Unassigned';
      if (!groups[fl]) { groups[fl] = { floor: fl, items: [], total: 0 }; present.push(fl); }
      groups[fl].items.push(it); groups[fl].total += num(it.amount);
    });
    var fl = floorList(c);
    var floorOpts = {}; fl.forEach(function (f) { floorOpts[f] = f; });
    var order = [];
    fl.forEach(function (f) { if (groups[f]) order.push(f); });
    present.forEach(function (f) { if (order.indexOf(f) < 0) order.push(f); });

    var summary = order.length ? '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">' + order.map(function (f) {
      var g = groups[f];
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">' + e(g.floor) + '</p>' +
        '<p class="text-lg font-bold text-slate-900 font-display">' + money(g.total) + '</p>' +
        '<p class="text-[11px] text-slate-400">' + g.items.length + ' item' + (g.items.length > 1 ? 's' : '') + '</p></div>';
    }).join('') + '</div>' : '';

    var body = order.map(function (f) {
      var g = groups[f];
      var header = '<tr class="bg-slate-50/80 border-t-2 border-slate-200">' +
        '<td colspan="4" class="px-4 py-2.5"><span class="font-bold text-slate-800">' + e(g.floor) + '</span> <span class="text-[11px] text-slate-400 ml-1">' + g.items.length + ' item' + (g.items.length > 1 ? 's' : '') + '</span></td>' +
        '<td class="px-4 py-2.5 text-right font-bold text-brand">' + money(g.total) + '</td><td></td></tr>';
      var rows = g.items.map(function (it) {
        return '<tr class="hover:bg-slate-50/70">' +
          '<td class="px-4 py-3 font-medium text-slate-800">' + e(it.description) + '</td>' +
          '<td class="px-4 py-3 hidden sm:table-cell text-slate-500">' + e(it.unit) + '</td>' +
          '<td class="px-4 py-3 text-right text-slate-600">' + trimNum(it.qty, 2) + '</td>' +
          '<td class="px-4 py-3 text-right text-slate-600">' + money(it.rate) + '</td>' +
          '<td class="px-4 py-3 text-right font-semibold text-slate-800">' + money(it.amount) + '</td>' +
          '<td class="px-4 py-3 text-right"><button data-delest="' + it.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button></td></tr>';
      }).join('');
      return header + rows;
    }).join('');
    if (!items.length) body = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No estimate lines yet. Pick a floor and add one below.</td></tr>';
    var foot = items.length ? '<tfoot><tr class="bg-slate-50 border-t-2 border-slate-200"><td colspan="4" class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Grand total (all floors)</td><td class="px-4 py-2.5 text-right font-bold text-brand">' + money(estTotal) + '</td><td></td></tr></tfoot>' : '';

    return sectionHead('Cost Estimation', 'Floor-wise estimate — each floor shows its total amount and the materials / work used') +
      summary +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm">' +
        '<thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-4 py-3 font-semibold">Material / Work</th><th class="px-4 py-3 font-semibold hidden sm:table-cell">Unit</th>' +
          '<th class="px-4 py-3 font-semibold text-right">Qty</th><th class="px-4 py-3 font-semibold text-right">Rate</th>' +
          '<th class="px-4 py-3 font-semibold text-right">Amount</th><th class="px-4 py-3"></th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody>' + foot + '</table></div></div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-sm font-bold text-slate-800 font-display mb-3">Add line to a floor</p>' +
        '<form id="estForm" class="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">' +
          S('Floor', 'floor', floorOpts, 'Floor 1') +
          '<div class="col-span-2">' + F('Material / Work', 'description', '', 'text', 'e.g. Cement, Steel, RCC slab') + '</div>' +
          F('Unit', 'unit', '', 'text', 'Sq.ft / Bags') + F('Qty', 'qty', '1', 'number', '0', 'step="0.01"') + F('Rate (' + CUR + ')', 'rate', '0', 'number', '0', 'step="0.01"') +
          '<div class="col-span-2 md:col-span-6"><button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Add line</button></div>' +
        '</form>' +
        '<p class="text-[11px] text-slate-400 mt-2">Choose the floor, then add each material / work item with its quantity and rate. Amount = Qty × Rate. Lines group under their floor with a floor total.</p></div>';
  }

  /* ---- EXPENSE TRACKER ---- */
  function sec_expenses(c) {
    var exps = c.exps.slice().sort(function (a, b) { var d = String(b.exp_date).localeCompare(String(a.exp_date)); return d !== 0 ? d : b.id - a.id; });
    var expCats = ['Labour', 'Materials', 'Equipment', 'Subcontractor', 'Transport', 'Permits', 'Utilities', 'Misc'];
    var catOpts = {}; expCats.forEach(function (x) { catOpts[x] = x; });
    var body = exps.map(function (x) {
      return '<tr class="hover:bg-slate-50/70">' +
        '<td class="px-4 py-3 text-slate-500 whitespace-nowrap">' + e(x.exp_date) + '</td>' +
        '<td class="px-4 py-3 text-slate-800">' + e(x.description) + '</td>' +
        '<td class="px-4 py-3"><span class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">' + e(x.category) + '</span></td>' +
        '<td class="px-4 py-3 text-right font-bold text-slate-800">' + money(x.amount) + '</td>' +
        '<td class="px-4 py-3 text-right"><button data-delexp="' + x.id + '" class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center">' + icon('trash', 15) + '</button></td></tr>';
    }).join('');
    if (!exps.length) body = '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">No expenses yet.</td></tr>';

    return sectionHead('Expense Tracker', 'Record day-to-day project expenses') +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Tracked expenses</p><p class="text-xl font-bold text-slate-900 font-display">' + money(c.expenseTotal) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Labour cost</p><p class="text-xl font-bold text-amber-600 font-display">' + money(c.labourCost) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">+ Material cost</p><p class="text-xl font-bold text-violet-600 font-display">' + money(c.materialCost) + '</p></div></div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm">' +
        '<thead><tr class="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">' +
          '<th class="px-4 py-3 font-semibold">Date</th><th class="px-4 py-3 font-semibold">Description</th><th class="px-4 py-3 font-semibold">Category</th><th class="px-4 py-3 font-semibold text-right">Amount</th><th class="px-4 py-3"></th></tr></thead>' +
        '<tbody class="divide-y divide-slate-100">' + body + '</tbody></table></div></div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-sm font-bold text-slate-800 font-display mb-3">Add expense</p>' +
        '<form id="expForm" class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">' +
          '<div class="col-span-2">' + F('Description', 'description', '', 'text', 'e.g. Mason wages week 3') + '</div>' +
          S('Category', 'category', catOpts, 'Labour') + F('Amount (' + CUR + ')', 'amount', '', 'number', '0', 'step="0.01"') + F('Date', 'exp_date', TZ.todayISO(), 'date') +
          '<div class="col-span-2 md:col-span-4"><button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Add expense</button></div>' +
        '</form></div>';
  }

  /* ---- CONSTRUCTION PROGRESS ---- */
  function sec_progress(c) {
    var logs = TZ.db.where('project_progress', function (l) { return l.project_id === pid; }).sort(function (a, b) { var d = String(b.log_date).localeCompare(String(a.log_date)); return d !== 0 ? d : b.id - a.id; });
    var list = logs.map(function (lg) {
      return '<div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">' +
        '<div class="w-11 h-11 rounded-xl bg-blue-50 text-brand flex items-center justify-center font-bold text-sm flex-shrink-0">' + (lg.percent | 0) + '%</div>' +
        '<div class="flex-1 min-w-0"><p class="font-semibold text-slate-800">' + e(lg.stage || 'Update') + '</p>' +
          '<p class="text-xs text-slate-400">' + e(lg.log_date) + (lg.status ? ' · ' + e(lg.status) : '') + (lg.note ? ' · ' + e(lg.note) : '') + '</p></div>' +
        '<button data-delprog="' + lg.id + '" class="text-slate-300 hover:text-rose-500">' + icon('x', 16) + '</button></div>';
    }).join('') || '<p class="text-sm text-slate-400">No progress updates yet.</p>';

    return sectionHead('Construction Progress', 'Log stage-wise progress updates') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div class="flex items-center gap-4"><div class="flex-1">' +
        '<div class="flex justify-between text-xs mb-1"><span class="text-slate-500">Overall progress</span><span class="font-semibold text-slate-700">' + c.progress + '%</span></div>' +
        '<div class="bg-slate-100 rounded-full h-3"><div class="h-3 rounded-full bg-blue-500" style="width:' + c.progress + '%"></div></div></div></div></div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-sm font-bold text-slate-800 font-display mb-3">Log an update</p>' +
        '<form id="progForm" class="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">' +
          '<div class="col-span-2">' + F('Stage', 'stage', '', 'text', 'e.g. Foundation, Roofing') + '</div>' +
          F('Progress %', 'percent', c.progress, 'number', '0', 'min="0" max="100"') + F('Status', 'status', '', 'text', 'On track / Delayed') + F('Date', 'log_date', TZ.todayISO(), 'date') +
          '<div class="col-span-2 md:col-span-5">' + F('Note', 'note', '', 'text', 'Optional details') + '</div>' +
          '<div class="col-span-2 md:col-span-5"><button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Log update</button></div>' +
        '</form></div>' +
      '<div class="space-y-2">' + list + '</div>';
  }

  /* ---- DOCUMENTS ---- */
  function sec_documents(c) {
    var docs = TZ.db.where('project_documents', function (d) { return d.project_id === pid; }).sort(function (a, b) { return b.id - a.id; });
    var grid = docs.map(function (doc) {
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">' +
        '<div class="flex items-start justify-between mb-2"><div class="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">' + icon('file-text', 18) + '</div>' +
          '<button data-deldoc="' + doc.id + '" class="text-slate-300 hover:text-rose-500">' + icon('trash', 15) + '</button></div>' +
        '<p class="font-semibold text-slate-800 text-sm">' + e(doc.title) + '</p>' +
        '<p class="text-xs text-slate-400">' + e(doc.category || '—') + ' · ' + e(doc.doc_date || '') + '</p>' +
        (doc.note ? '<p class="text-xs text-slate-500 mt-1">' + e(doc.note) + '</p>' : '') +
        (doc.filename ? '<a href="' + doc.filename + '" target="_blank" download="' + e(doc.title) + '" class="inline-flex items-center gap-1 text-xs text-brand font-semibold mt-2 hover:underline">' + icon('download', 13) + ' Open file</a>' : '') +
        '</div>';
    }).join('') || '<p class="text-sm text-slate-400">No documents yet.</p>';

    return sectionHead('Documents', 'Store plans, permits, agreements & photos') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><p class="text-sm font-bold text-slate-800 font-display mb-3">Add document</p>' +
        '<form id="docForm" class="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">' +
          '<div class="col-span-2">' + F('Title', 'title', '', 'text', 'e.g. Approved Building Plan') + '</div>' +
          F('Category', 'category', '', 'text', 'Plan / Permit / Photo') + F('Date', 'doc_date', TZ.todayISO(), 'date') +
          '<div class="col-span-2"><label class="block text-xs font-semibold text-slate-600 mb-1.5">File (optional, max 8MB)</label><input type="file" name="file" class="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-brand file:font-semibold"></div>' +
          '<div class="col-span-2">' + F('Note', 'note', '', 'text', 'Optional') + '</div>' +
          '<div class="col-span-2 md:col-span-4"><button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Add document</button></div>' +
        '</form></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">' + grid + '</div>';
  }

  /* ---- NOTES ---- */
  function sec_notes(c) {
    var notes = TZ.db.where('project_notes', function (n) { return n.project_id === pid; }).sort(function (a, b) { return b.id - a.id; });
    var list = notes.map(function (n) {
      return '<div class="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">' +
        '<span class="text-amber-500 mt-0.5">' + icon('sticky-note', 16) + '</span>' +
        '<p class="flex-1 text-sm text-slate-700 whitespace-pre-wrap">' + e(n.body) + '</p>' +
        '<span class="text-[11px] text-slate-400 whitespace-nowrap">' + e(String(n.created_at || '').slice(0, 10)) + '</span>' +
        '<button data-delnote="' + n.id + '" class="text-slate-300 hover:text-rose-500">' + icon('x', 15) + '</button></div>';
    }).join('') || '<p class="text-sm text-slate-400">No notes yet.</p>';

    return sectionHead('Notes', 'Quick notes & reminders for this project') +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><form id="noteForm" class="flex flex-col gap-3">' +
        '<textarea name="body" rows="3" required placeholder="Write a note..." class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"></textarea>' +
        '<button class="self-start px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('plus', 16) + 'Add note</button></form></div>' +
      '<div class="space-y-2">' + list + '</div>';
  }

  /* ---- REPORTS ---- */
  function sec_reports(c) {
    var catMap = {};
    c.exps.forEach(function (x) { var k = x.category || 'Uncategorised'; catMap[k] = (catMap[k] || 0) + num(x.amount); });
    var byCat = Object.keys(catMap).map(function (k) { return [k, catMap[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var matCount = c.mats.length;

    return sectionHead('Project Report', 'Summary for ' + project.name) +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Budget</p><p class="text-lg font-bold text-slate-900 font-display">' + money(c.budget) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Total spent</p><p class="text-lg font-bold text-rose-500 font-display">' + money(c.totalExpenses) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Remaining</p><p class="text-lg font-bold ' + (c.remaining < 0 ? 'text-rose-500' : 'text-emerald-600') + ' font-display">' + money(c.remaining) + '</p></div>' +
        '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><p class="text-xs text-slate-500">Progress</p><p class="text-lg font-bold text-blue-600 font-display">' + c.progress + '%</p></div></div>' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 class="font-bold text-slate-900 text-sm mb-3 font-display">Cost breakdown</h3>' +
        '<table class="w-full text-sm"><tbody class="divide-y divide-slate-100">' +
          '<tr><td class="py-2 text-slate-600">Material cost (' + matCount + ' items)</td><td class="py-2 text-right font-semibold text-slate-800">' + money(c.materialCost) + '</td></tr>' +
          byCat.map(function (r) { return '<tr><td class="py-2 text-slate-600">' + e(r[0]) + ' (expenses)</td><td class="py-2 text-right font-semibold text-slate-800">' + money(r[1]) + '</td></tr>'; }).join('') +
          '<tr class="border-t-2 border-slate-200"><td class="py-2 font-bold text-slate-800">Total</td><td class="py-2 text-right font-bold text-brand">' + money(c.totalExpenses) + '</td></tr>' +
        '</tbody></table>' +
        '<div class="mt-4 flex flex-wrap gap-2">' +
          '<button id="projXls" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('bar-chart', 15) + ' Export Excel</button>' +
          '<button id="projPdf" class="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl flex items-center gap-1.5">' + icon('arrow-up-right', 15) + ' Export PDF</button>' +
        '</div>' +
        '<p class="text-[11px] text-slate-400 mt-2">Full report for this project — includes summary, construction, materials, estimation, expenses &amp; progress.</p></div>';
  }

  /* ---------------- wiring (event handlers) ---------------- */
  function wireSection(c) {
    var go = function () { location.href = backUrl(); };
    var root = document.getElementById('secContent');

    var bx = document.getElementById('projXls'); if (bx) bx.addEventListener('click', function () { exportProjectExcel(c); });
    var bp = document.getElementById('projPdf'); if (bp) bp.addEventListener('click', function () { exportProjectPdf(c); });

    var delProject = document.getElementById('delProject');
    if (delProject) delProject.addEventListener('click', function () {
      if (!confirm('Delete this entire project and all its data?')) return;
      ['project_materials', 'project_expenses', 'project_estimates', 'project_progress', 'project_documents', 'project_notes', 'project_details'].forEach(function (t) {
        TZ.db.removeWhere(t, function (r) { return r.project_id === pid; });
      });
      TZ.db.remove('projects', pid);
      TZ.flash('Project deleted.', 'info'); location.href = 'workspace.html';
    });

    onSubmit('detForm', function (d) {
      var patch = {};
      DETAIL_COLS[section].forEach(function (col) {
        var v = d[col] == null ? '' : d[col];
        if (NUMERIC_DETAIL.indexOf(col) >= 0) v = (v === '' ? null : Number(v));
        patch[col] = v;
      });
      TZ.db.saveDetail(pid, patch); TZ.flash('Details saved.'); go();
    });

    onSubmit('matForm', function (d) {
      var qty = Number(d.quantity) || 0, cost = Number(d.cost) || 0, id = parseInt(d.id, 10) || 0;
      var dateStr = d.purchase_date || TZ.todayISO();
      var nowTime = TZ.nowStamp().slice(11);   // "HH:MM"
      var rec = { project_id: pid, name: (d.name || '').trim(), category: (d.category || '').trim(), quantity: qty, unit: (d.unit || '').trim(), cost: cost, supplier: (d.supplier || '').trim(), used_qty: Number(d.used_qty) || 0, total_cost: qty * cost };
      if (id > 0) {
        var existing = TZ.db.get('project_materials', id);
        var oldTime = existing && existing.purchase_date && String(existing.purchase_date).length > 10 ? String(existing.purchase_date).slice(11) : nowTime;
        rec.purchase_date = dateStr + ' ' + oldTime;   // keep original time on edit
        TZ.db.update('project_materials', id, rec); TZ.flash('Purchase updated.');
      } else {
        rec.purchase_date = dateStr + ' ' + nowTime;   // stamp date + time of entry
        TZ.db.insert('project_materials', rec); TZ.flash('Purchase added.');
      }
      go();
    });
    delegate(root, 'data-delmat', function (id) { if (confirm('Delete this material?')) { TZ.db.remove('project_materials', id); TZ.flash('Material deleted.', 'info'); go(); } });

    onSubmit('estForm', function (d) {
      var qty = Number(d.qty) || 0, rate = Number(d.rate) || 0;
      TZ.db.insert('project_estimates', { project_id: pid, floor: (d.floor || '').trim(), description: (d.description || '').trim(), unit: (d.unit || '').trim(), qty: qty, rate: rate, amount: qty * rate });
      TZ.flash('Estimate line added.'); go();
    });
    delegate(root, 'data-delest', function (id) { if (confirm('Remove line?')) { TZ.db.remove('project_estimates', id); TZ.flash('Line removed.', 'info'); go(); } });

    onSubmit('expForm', function (d) {
      TZ.db.insert('project_expenses', { project_id: pid, exp_date: d.exp_date || TZ.todayISO(), category: (d.category || '').trim(), description: (d.description || '').trim(), amount: Number(d.amount) || 0 });
      TZ.flash('Expense added.'); go();
    });
    delegate(root, 'data-delexp', function (id) { if (confirm('Delete expense?')) { TZ.db.remove('project_expenses', id); TZ.flash('Expense deleted.', 'info'); go(); } });

    onSubmit('progForm', function (d) {
      var pct = Math.max(0, Math.min(100, parseInt(d.percent, 10) || 0));
      TZ.db.insert('project_progress', { project_id: pid, log_date: d.log_date || TZ.todayISO(), stage: (d.stage || '').trim(), percent: pct, status: (d.status || '').trim(), note: (d.note || '').trim() });
      TZ.db.update('projects', pid, { progress: pct });
      TZ.flash('Progress logged.'); go();
    });
    delegate(root, 'data-delprog', function (id) { if (confirm('Remove update?')) { TZ.db.remove('project_progress', id); TZ.flash('Update removed.', 'info'); go(); } });

    onSubmit('noteForm', function (d) {
      var body = (d.body || '').trim();
      if (body !== '') { TZ.db.insert('project_notes', { project_id: pid, body: body, created_at: TZ.todayISO() }); TZ.flash('Note added.'); }
      go();
    });
    delegate(root, 'data-delnote', function (id) { if (confirm('Delete note?')) { TZ.db.remove('project_notes', id); TZ.flash('Note deleted.', 'info'); go(); } });

    delegate(root, 'data-deldoc', function (id) { if (confirm('Delete document?')) { TZ.db.remove('project_documents', id); TZ.flash('Document deleted.', 'info'); go(); } });
    var docForm = document.getElementById('docForm');
    if (docForm) docForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var file = this.querySelector('input[name="file"]').files[0];
      addDocument(d, file, go);
    });
  }

  function addDocument(d, file, go) {
    function finalize(dataUrl, warn) {
      var id = TZ.db.insert('project_documents', {
        project_id: pid, title: (d.title || 'Document').trim(), category: (d.category || '').trim(),
        doc_date: d.doc_date || TZ.todayISO(), filename: dataUrl, note: (d.note || '').trim(),
      });
      if (dataUrl && !TZ.db.save()) { // quota exceeded — keep record, drop file
        TZ.db.update('project_documents', id, { filename: null }); TZ.db.save();
        TZ.flash('File too large to store in browser — record kept without file.', 'warning');
      } else {
        TZ.flash(warn || 'Document added.', warn ? 'warning' : 'success');
      }
      go();
    }
    if (file && file.name) {
      var ext = file.name.split('.').pop().toLowerCase();
      var ok = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'dwg'];
      if (ok.indexOf(ext) < 0 || file.size > 8 * 1024 * 1024) { finalize(null, 'Unsupported file type or file too large (max 8MB) — record kept without file.'); return; }
      if (file.size > 1.5 * 1024 * 1024) { finalize(null, 'File over ~1.5MB can\'t be stored in the browser — record kept without file.'); return; }
      var reader = new FileReader();
      reader.onload = function () { finalize(reader.result, null); };
      reader.onerror = function () { finalize(null, 'File could not be read — record kept without file.'); };
      reader.readAsDataURL(file);
    } else { finalize(null, null); }
  }

  /* ---------------- Project report exports (Excel + PDF) ---------------- */
  function projectData(c) {
    var client = project.client_id ? TZ.db.get('clients', project.client_id) : null;
    var estimates = TZ.db.where('project_estimates', function (i) { return i.project_id === pid; }).sort(function (a, b) { var fa = a.floor || '', fb = b.floor || ''; if (fa !== fb) return fa < fb ? -1 : 1; return a.id - b.id; });
    var progress = TZ.db.where('project_progress', function (l) { return l.project_id === pid; }).sort(function (a, b) { var d = String(b.log_date).localeCompare(String(a.log_date)); return d !== 0 ? d : b.id - a.id; });
    var mats = c.mats.slice().sort(function (a, b) { return (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1; });
    var exps = c.exps.slice().sort(function (a, b) { return String(b.exp_date).localeCompare(String(a.exp_date)); });
    var catMap = {}; exps.forEach(function (x) { var k = x.category || 'Uncategorised'; catMap[k] = (catMap[k] || 0) + num(x.amount); });
    var byCat = Object.keys(catMap).map(function (k) { return [k, catMap[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var estTotal = estimates.reduce(function (a, it) { return a + num(it.amount); }, 0);
    return { client: client, estimates: estimates, estTotal: estTotal, progress: progress, mats: mats, exps: exps, byCat: byCat };
  }
  function fileSlug(s) { return String(s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'; }

  function exportProjectExcel(c) {
    var d = projectData(c), cur = CUR, generated = TZ.reportStamp(), det = c.det;
    var th = 'style="background:#0F2B4C;color:#fff;font-weight:bold;border:1px solid #ccc;padding:4px"';
    var td = 'style="border:1px solid #ddd;padding:4px"';
    var tdb = 'style="border:1px solid #ddd;padding:4px;font-weight:bold;background:#eef2f7"';
    var rnd = function (v) { return Math.round((Number(v) || 0) * 100) / 100; };
    var stat = function (s) { return TZ.ucfirst(TZ.dashToSpace(s || '')); };
    function sheet(title, headers, rows, totalRow) {
      var span = Math.max(headers.length, 1);
      var s = '<table border="1"><tr><td colspan="' + span + '" ' + th + '>' + e(title) + '</td></tr>';
      if (headers.length) s += '<tr>' + headers.map(function (x) { return '<td ' + th + '>' + e(x) + '</td>'; }).join('') + '</tr>';
      if (!rows.length) s += '<tr><td colspan="' + span + '" ' + td + '>None recorded</td></tr>';
      else s += rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td ' + td + '>' + (typeof cell === 'number' ? rnd(cell) : e(cell == null ? '' : cell)) + '</td>'; }).join('') + '</tr>'; }).join('');
      if (totalRow) s += '<tr>' + totalRow.map(function (cell) { return '<td ' + tdb + '>' + (typeof cell === 'number' ? rnd(cell) : e(cell == null ? '' : cell)) + '</td>'; }).join('') + '</tr>';
      return s + '</table><br>';
    }
    var out = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>' +
      '<table><tr><td colspan="10" style="font-size:16px;font-weight:bold">Trackzo — Project Report: ' + e(project.name) + '</td></tr>' +
      '<tr><td colspan="10">Generated: ' + e(generated) + ' · all amounts in ' + e(cur) + '</td></tr></table><br>';
    out += sheet('PROJECT SUMMARY', ['Field', 'Value'], [
      ['Project', project.name], ['Client', d.client ? d.client.name : ''], ['Type', project.type || ''], ['Status', stat(project.status)],
      ['Manager', project.manager || ''], ['Start date', project.start_date || ''], ['End date', project.end_date || ''],
      ['Budget (' + cur + ')', num(project.budget)], ['Total spent (' + cur + ')', c.totalExpenses], ['Remaining (' + cur + ')', c.remaining],
      ['Material cost (' + cur + ')', c.materialCost], ['Tracked expenses (' + cur + ')', c.expenseTotal], ['Labour cost (' + cur + ')', c.labourCost],
      ['Progress %', c.progress], ['Area (sqft)', num(project.area)], ['Floors', num(project.floors)],
    ]);
    out += sheet('CONSTRUCTION DETAILS', ['Field', 'Value'], [
      ['Construction type', det.construction_type || ''], ['Structure type', det.structure_type || ''],
      ['Foundation type', det.foundation_type || ''], ['Roofing type', det.roofing_type || ''],
      ['Number of floors', num(det.num_floors)], ['Number of units', num(det.num_units)],
      ['Plot area (sqft)', num(det.plot_area)], ['Built-up (sqft)', num(det.builtup_sqft)],
    ]);
    out += sheet('MATERIALS', ['Material', 'Category', 'Quantity', 'Unit', 'Unit Cost (' + cur + ')', 'Amount (' + cur + ')', 'Used', 'Left', 'Supplier', 'Date & Time'],
      d.mats.map(function (m) { return [m.name, m.category, num(m.quantity), m.unit, num(m.cost), num(m.total_cost), num(m.used_qty), num(m.quantity) - num(m.used_qty), m.supplier, m.purchase_date]; }),
      ['TOTAL', '', '', '', '', c.materialCost, '', '', '', '']);
    out += sheet('COST ESTIMATION (BY FLOOR)', ['Floor', 'Material / Work', 'Unit', 'Qty', 'Rate (' + cur + ')', 'Amount (' + cur + ')'],
      d.estimates.map(function (it) { return [it.floor || 'Unassigned', it.description, it.unit, num(it.qty), num(it.rate), num(it.amount)]; }),
      ['TOTAL', '', '', '', '', d.estTotal]);
    out += sheet('EXPENSES', ['Date', 'Description', 'Category', 'Amount (' + cur + ')'],
      d.exps.map(function (x) { return [x.exp_date, x.description, x.category, num(x.amount)]; }),
      ['TOTAL', '', '', c.expenseTotal]);
    out += sheet('EXPENSES BY CATEGORY', ['Category', 'Amount (' + cur + ')'], d.byCat.map(function (r) { return [r[0], r[1]]; }));
    out += sheet('CONSTRUCTION PROGRESS', ['Date', 'Stage', 'Percent', 'Status', 'Note'],
      d.progress.map(function (l) { return [l.log_date, l.stage, num(l.percent), l.status, l.note]; }));
    out += '</body></html>';
    var blob = new Blob(['﻿' + out], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'trackzo-project-' + fileSlug(project.name) + '-' + TZ.todayISO() + '.xls';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function exportProjectPdf(c) {
    var d = projectData(c), cur = CUR, generated = TZ.reportStamp(), det = c.det;
    function mny(v) { v = Number(v) || 0; return cur + (v < 0 ? '-' : '') + TZ.inrGroup(Math.abs(v)); }
    function M(v) { return { __html: mny(v) }; }
    function N(v) { return { __html: TZ.trimNum(v, 2) }; }
    var stat = function (s) { return TZ.ucfirst(TZ.dashToSpace(s || '')); };
    function T(title, cols, rows, totalRow) {
      function cell(cc, i, style) {
        var a = cols[i] && cols[i].a ? ' class="' + cols[i].a + '"' : '';
        var v = (cc && cc.__html != null) ? cc.__html : e(cc == null ? '' : cc);
        return '<td' + a + (style ? ' style="' + style + '"' : '') + '>' + v + '</td>';
      }
      var head = cols.map(function (cc) { return '<th' + (cc.a ? ' class="' + cc.a + '"' : '') + '>' + e(cc.t) + '</th>'; }).join('');
      var bd = rows.length ? rows.map(function (cells) { return '<tr>' + cells.map(function (cc, i) { return cell(cc, i); }).join('') + '</tr>'; }).join('')
        : '<tr><td colspan="' + cols.length + '" style="color:#94a3b8">None recorded</td></tr>';
      var tot = totalRow ? '<tr>' + totalRow.map(function (cc, i) { return cell(cc, i, 'font-weight:700;background:#f1f5f9'); }).join('') + '</tr>' : '';
      return '<h2>' + e(title) + '</h2><table><thead><tr>' + head + '</tr></thead><tbody>' + bd + tot + '</tbody></table>';
    }
    var css = '*{box-sizing:border-box;margin:0;padding:0}' +
      "body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:32px;font-size:12px}" +
      '.bar{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1D4ED8;padding-bottom:14px;margin-bottom:20px}' +
      '.brand{display:flex;align-items:center;gap:10px}.logo{width:38px;height:38px;border-radius:9px;background:#1D4ED8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}' +
      'h1{font-size:20px;color:#0F2B4C}.sub{color:#64748b;font-size:11px}' +
      'h2{font-size:13px;color:#0F2B4C;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:.04em}' +
      'table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#0F2B4C;color:#fff;text-align:left;padding:7px 9px;font-size:11px}' +
      'td{padding:6px 9px;border-bottom:1px solid #eef2f7}tr:nth-child(even) td{background:#f8fafc}.r{text-align:right}.c{text-align:center}' +
      '.cards{display:flex;gap:12px;margin-bottom:6px;flex-wrap:wrap}.card{flex:1;min-width:120px;border:1px solid #e2e8f0;border-radius:10px;padding:12px}' +
      '.card .k{font-size:10px;color:#64748b;text-transform:uppercase}.card .v{font-size:18px;font-weight:800;color:#0F2B4C;margin-top:3px}.pos{color:#059669}.neg{color:#e11d48}' +
      '.toolbar{position:fixed;top:14px;right:14px}.btn{background:#1D4ED8;color:#fff;border:0;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}' +
      '@media print{.toolbar{display:none}body{padding:0}}';
    var body = '<div class="toolbar"><button class="btn" onclick="window.print()">🖨 Save as PDF</button></div>' +
      '<div class="bar"><div class="brand"><div class="logo">T</div><div><h1>' + e(project.name) + '</h1><div class="sub">Project Report · ' + e(project.type || 'Project') + ' · ' + stat(project.status) + ' · amounts in ' + cur + '</div></div></div>' +
        '<div class="sub" style="text-align:right">Generated<br><strong>' + e(generated) + '</strong></div></div>' +
      '<div class="cards">' +
        '<div class="card"><div class="k">Budget</div><div class="v">' + mny(c.budget) + '</div></div>' +
        '<div class="card"><div class="k">Total Spent</div><div class="v neg">' + mny(c.totalExpenses) + '</div></div>' +
        '<div class="card"><div class="k">Remaining</div><div class="v ' + (c.remaining < 0 ? 'neg' : 'pos') + '">' + mny(c.remaining) + '</div></div>' +
        '<div class="card"><div class="k">Progress</div><div class="v">' + c.progress + '%</div></div></div>' +
      T('Project Details', [{ t: 'Field' }, { t: 'Value' }], [
        ['Client', d.client ? d.client.name : ''], ['Manager', project.manager || ''], ['Type', project.type || ''],
        ['Status', stat(project.status)], ['Start date', project.start_date || ''], ['End date', project.end_date || ''],
        ['Area (sqft)', N(project.area)], ['Floors', { __html: String(num(project.floors)) }],
        ['Material cost', M(c.materialCost)], ['Tracked expenses', M(c.expenseTotal)], ['Labour cost', M(c.labourCost)],
      ]) +
      T('Construction Details', [{ t: 'Field' }, { t: 'Value' }], [
        ['Construction type', det.construction_type || ''], ['Structure type', det.structure_type || ''],
        ['Foundation type', det.foundation_type || ''], ['Roofing type', det.roofing_type || ''],
        ['Number of floors', { __html: String(num(det.num_floors)) }], ['Number of units', { __html: String(num(det.num_units)) }],
        ['Plot area (sqft)', N(det.plot_area)], ['Built-up (sqft)', N(det.builtup_sqft)],
      ]) +
      T('Materials', [{ t: 'Material' }, { t: 'Category' }, { t: 'Qty', a: 'r' }, { t: 'Unit' }, { t: 'Unit Cost', a: 'r' }, { t: 'Amount', a: 'r' }, { t: 'Used', a: 'r' }, { t: 'Left', a: 'r' }, { t: 'Supplier' }, { t: 'Date & Time' }],
        d.mats.map(function (m) { return [m.name, m.category, N(m.quantity), m.unit, M(m.cost), M(m.total_cost), N(m.used_qty), N(num(m.quantity) - num(m.used_qty)), m.supplier, m.purchase_date]; }),
        ['Total', '', '', '', '', M(c.materialCost), '', '', '', '']) +
      T('Cost Estimation (by floor)', [{ t: 'Floor' }, { t: 'Material / Work' }, { t: 'Unit' }, { t: 'Qty', a: 'r' }, { t: 'Rate', a: 'r' }, { t: 'Amount', a: 'r' }],
        d.estimates.map(function (it) { return [it.floor || 'Unassigned', it.description, it.unit, N(it.qty), M(it.rate), M(it.amount)]; }),
        ['Total', '', '', '', '', M(d.estTotal)]) +
      T('Expenses', [{ t: 'Date' }, { t: 'Description' }, { t: 'Category' }, { t: 'Amount', a: 'r' }],
        d.exps.map(function (x) { return [x.exp_date, x.description, x.category, M(x.amount)]; }),
        ['Total', '', '', M(c.expenseTotal)]) +
      T('Construction Progress', [{ t: 'Date' }, { t: 'Stage' }, { t: 'Percent', a: 'c' }, { t: 'Status' }, { t: 'Note' }],
        d.progress.map(function (l) { return [l.log_date, l.stage, { __html: num(l.percent) + '%' }, l.status, l.note]; }));
    var win = window.open('', '_blank');
    if (!win) { TZ.flash('Please allow pop-ups to export the PDF.', 'warning'); return; }
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + e(project.name) + ' — Report</title><style>' + css + '</style></head><body>' + body + '</body></html>');
    win.document.close(); win.focus();
    setTimeout(function () { try { win.print(); } catch (ex) {} }, 500);
  }

  function onSubmit(id, handler) {
    var form = document.getElementById(id);
    if (!form) return;
    form.addEventListener('submit', function (ev) { ev.preventDefault(); handler(TZ.formData(this)); });
  }
  function delegate(root, attr, handler) {
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[' + attr + ']'); if (!b) return;
      handler(b.getAttribute(attr));
    });
  }
  function num(v) { return Number(v) || 0; }
})();
