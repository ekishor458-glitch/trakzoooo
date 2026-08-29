/* ============================================================================
   AK CONSTRUCTIONS — landing page behaviour (classic script)
   Glassmorphic sky-blue edition. Handles: sticky header, scroll progress,
   mobile menu, smooth scroll, scroll reveal, animated counters, magnetic
   buttons, card tilt, the hero search bar, and data-driven featured projects.
   Read-only use of the shared data layer — touches no app state.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(pointer: fine)').matches;

  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function esc(s) { return (window.TZ && TZ.esc) ? TZ.esc(s) : String(s == null ? '' : s); }

  var yr = $('#ak-year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- Sticky header + scroll progress ---------------- */
  var sticky = $('#ak-sticky');
  var progressBar = $('#ak-progress');
  var home = $('#home');
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (sticky) {
        var heroB = home ? home.offsetHeight : window.innerHeight;
        sticky.classList.toggle('show', y > heroB - 120);
      }
      if (progressBar) {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile menu (two burgers) ---------------- */
  var mobile = $('#ak-mobile');
  function closeMenu() { if (mobile) mobile.classList.remove('open'); document.body.classList.remove('menu-open'); }
  function toggleMenu() { if (!mobile) return; var open = mobile.classList.toggle('open'); document.body.classList.toggle('menu-open', open); }
  $all('#ak-burger, #ak-burger2').forEach(function (b) { b.addEventListener('click', toggleMenu); });

  /* ---------------- Smooth scroll for in-page anchors ---------------- */
  $all('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      ev.preventDefault(); closeMenu();
      if (id === '#home') { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); return; }
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      var top = target.getBoundingClientRect().top + window.pageYOffset - 74;
      window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  /* ---------------- Active nav highlight ---------------- */
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var links = $all('.nav a[href="#' + en.target.id + '"]');
        if (!links.length) return;
        $all('.nav a').forEach(function (l) { l.classList.remove('active'); });
        $all('.nav a[href="#' + en.target.id + '"]').forEach(function (l) { l.classList.add('active'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['projects', 'services', 'insights', 'about', 'contact', 'why', 'process'].forEach(function (id) {
      var el = document.getElementById(id); if (el) navObs.observe(el);
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revObs = null;
  if (REDUCED || !('IntersectionObserver' in window)) {
    $all('.reveal').forEach(function (el) { el.classList.add('in'); });
  } else {
    revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $all('.reveal').forEach(function (el) { revObs.observe(el); });
  }

  /* ---------------- Animated counters ---------------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var vEl = el.querySelector('.v'); if (!vEl) return;
    if (REDUCED) { vEl.textContent = target; return; }
    var dur = 1600, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / dur, 0, 1);
      vEl.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
      if (t < 1) requestAnimationFrame(step); else vEl.textContent = target;
    }
    requestAnimationFrame(step);
  }
  var counters = $all('[data-count]');
  if (REDUCED || !('IntersectionObserver' in window)) { counters.forEach(animateCount); }
  else {
    var cObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (FINE && !REDUCED) {
    $all('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.28) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.28) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------- 3D tilt cards ---------------- */
  if (FINE && !REDUCED) {
    $all('[data-tilt]').forEach(function (el) {
      var max = 7;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------- Hero search bar → jump to projects ---------------- */
  var searchForm = $('#hero-search');
  if (searchForm) {
    searchForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var target = document.getElementById('projects');
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 74, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  /* ================================================================== */
  /* Featured projects — live data from TZ (showcase fallback)          */
  /* ================================================================== */
  var STATUS_LABEL = { active: 'In Progress', completed: 'Completed', 'on-hold': 'On Hold', planning: 'Planning' };
  var GRADS = [
    ['#12263f', '#2f6db0'], ['#1c3f68', '#0f2540'], ['#173357', '#0f2540'],
    ['#12263f', '#3a7bd5'], ['#1c3f68', '#12263f'], ['#0f2540', '#2b5c9e']
  ];

  function fmtArea(a) {
    a = Number(a) || 0; if (!a) return '';
    return (window.TZ && TZ.inrGroup) ? TZ.inrGroup(a) + ' sq.ft' : a.toLocaleString() + ' sq.ft';
  }
  function fmtFloors(f) { f = parseInt(f, 10) || 0; if (!f) return ''; return f <= 1 ? 'G floor' : 'G+' + (f - 1); }

  function renderSvg(i) {
    var g = GRADS[i % GRADS.length];
    var seed = (i * 37) % 5, gid = 'pg' + i, offset = seed * 6;
    var bases = [[40, 120, 90, 180], [150, 90, 80, 210], [245, 140, 95, 160]];
    var rects = bases.map(function (b, k) {
      var x = b[0] + offset, y = b[1] - (k === seed % 3 ? 24 : 0), w = b[2], h = b[3] + (k === 1 ? seed * 8 : 0);
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (h + 120) + '" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)"/>';
    }).join('');
    var windows = '';
    for (var wy = 0; wy < 5; wy++) for (var wx = 0; wx < 3; wx++) {
      var lit = ((wx + wy + seed) % 3 === 0);
      windows += '<rect x="' + (162 + wx * 20 + offset) + '" y="' + (110 + wy * 26) + '" width="11" height="13" rx="1.5" fill="' + (lit ? '#f2c879' : 'rgba(255,255,255,0.10)') + '" opacity="' + (lit ? 0.92 : 1) + '"/>';
    }
    return '<svg class="proj-svg" viewBox="0 0 360 380" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></linearGradient></defs>' +
      '<rect width="360" height="380" fill="url(#' + gid + ')"/>' +
      '<circle cx="300" cy="70" r="120" fill="rgba(255,255,255,0.05)"/>' + rects + windows +
      '<rect x="0" y="300" width="360" height="80" fill="rgba(0,0,0,0.12)"/></svg>';
  }

  function rulerIcon() { return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/></svg>'; }
  function layersIcon() { return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5"/></svg>'; }
  function arrowIcon() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'; }

  function cardHtml(p, i) {
    var statusKey = (p.status || 'active');
    var statusCls = statusKey === 'completed' ? ' completed' : '';
    var label = STATUS_LABEL[statusKey] || 'In Progress';
    var prog = clamp(parseInt(p.progress, 10) || 0, 0, 100);
    var meta = [];
    var area = fmtArea(p.area); if (area) meta.push('<span>' + rulerIcon() + area + '</span>');
    var fl = fmtFloors(p.floors); if (fl) meta.push('<span>' + layersIcon() + fl + '</span>');
    return '<a class="proj-card reveal" href="#contact">' +
      '<div class="proj-render">' + renderSvg(i) + '</div>' +
      '<span class="proj-status' + statusCls + '">' + esc(label) + '</span>' +
      '<div class="proj-body">' +
        '<div class="proj-type">' + esc(p.type || 'Construction') + '</div>' +
        '<h3>' + esc(p.name || 'Project') + '</h3>' +
        (meta.length ? '<div class="proj-meta">' + meta.join('') + '</div>' : '') +
        '<div class="proj-bar"><i style="width:' + prog + '%"></i></div>' +
        '<div class="proj-foot"><span>' + prog + '% complete</span><span class="go">Enquire ' + arrowIcon() + '</span></div>' +
      '</div></a>';
  }

  var SHOWCASE = [
    { name: 'Skyline Residency', type: 'Residential', status: 'completed', progress: 100, area: 3200, floors: 3 },
    { name: 'AK Grand Villa', type: 'Luxury Villa', status: 'active', progress: 72, area: 4800, floors: 2 },
    { name: 'Hassan Trade Centre', type: 'Commercial', status: 'active', progress: 58, area: 12000, floors: 5 },
    { name: 'Serene Interiors', type: 'Interior Fit-out', status: 'completed', progress: 100, area: 1800, floors: 1 },
    { name: 'Green Meadows Apartments', type: 'Residential', status: 'planning', progress: 15, area: 26000, floors: 6 },
    { name: 'Heritage Renovation', type: 'Renovation', status: 'completed', progress: 100, area: 2200, floors: 2 }
  ];

  function renderProjects(list) {
    var grid = $('#proj-grid'); if (!grid) return;
    grid.innerHTML = list.slice(0, 6).map(cardHtml).join('');
    $all('.reveal', grid).forEach(function (el) { if (revObs) revObs.observe(el); else el.classList.add('in'); });
    if (FINE && !REDUCED) {
      $all('.proj-card', grid).forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = 'perspective(900px) rotateY(' + (px * 5) + 'deg) rotateX(' + (-py * 5) + 'deg) translateY(-6px)';
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
  }

  function loadProjects() {
    var live = [];
    try {
      if (window.TZ && TZ.db) {
        live = (TZ.db.all('projects') || []).filter(function (p) { return p && p.name; })
          .sort(function (a, b) {
            var pd = (parseInt(b.progress, 10) || 0) - (parseInt(a.progress, 10) || 0);
            return pd !== 0 ? pd : (b.id || 0) - (a.id || 0);
          });
      }
    } catch (e) { live = []; }
    var list = live.slice(0, 6);
    for (var i = 0; i < SHOWCASE.length && list.length < 6; i++) {
      var s = SHOWCASE[i];
      if (!list.some(function (p) { return String(p.name).toLowerCase() === s.name.toLowerCase(); })) list.push(s);
    }
    renderProjects(list);
  }

  loadProjects();
  if (window.TZ && TZ.ready && typeof TZ.ready.then === 'function') { TZ.ready.then(loadProjects).catch(function () {}); }
})();
