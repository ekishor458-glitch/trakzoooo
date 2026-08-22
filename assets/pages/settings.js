/* Settings (ports settings.php) */
(function () {
  var e = TZ.esc, F = TZ.fieldInput;
  var sess = TZ.currentUser();

  TZ.mount({ page: 'settings', title: 'Settings' }, function (root) {
    var u = TZ.db.get('users', sess.id) || sess;

    root.innerHTML = '<div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">' +
      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
        '<h3 class="font-bold text-slate-900 font-display mb-4">Profile</h3>' +
        '<form id="profile" class="space-y-4">' +
          F('Full name', 'name', u.name, 'text') + F('Email', 'email', u.email, 'email') + F('Role / title', 'role', u.role, 'text') +
          '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Save profile</button>' +
        '</form></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">' +
        '<h3 class="font-bold text-slate-900 font-display mb-4">Change password</h3>' +
        '<form id="password" class="space-y-4">' +
          F('Current password', 'current', '', 'password') + F('New password', 'new', '', 'password') + F('Confirm new password', 'confirm', '', 'password') +
          '<button class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl">Update password</button>' +
        '</form></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">' +
        '<h3 class="font-bold text-slate-900 font-display mb-2">About Trackzo</h3>' +
        '<p class="text-sm text-slate-500">Construction ERP · HTML/CSS/JS edition (localStorage). Manage projects, clients, materials, purchases, finance and estimates in one place.</p>' +
        '<p class="text-xs text-slate-400 mt-3">Signed in as <strong class="text-slate-600">' + e(u.email) + '</strong></p></div>' +
      '</div>';

    document.getElementById('profile').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var name = (d.name || '').trim(), email = (d.email || '').trim(), role = (d.role || '').trim();
      if (!name || !email) { TZ.flash('Name and email are required.', 'error'); location.href = 'settings.html'; return; }
      var clash = TZ.db.where('users', function (x) { return x.id !== u.id && String(x.email).toLowerCase() === email.toLowerCase(); });
      if (clash.length) { TZ.flash('That email is already in use.', 'error'); location.href = 'settings.html'; return; }
      TZ.db.update('users', u.id, { name: name, email: email, role: role });
      var s = TZ.currentUser(); s.name = name; s.email = email; s.role = role; TZ.setSessionUser(s);
      TZ.flash('Profile updated.'); location.href = 'settings.html';
    });

    document.getElementById('password').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = TZ.formData(this);
      var rec = TZ.db.get('users', u.id);
      if (rec.password !== d.current) TZ.flash('Current password is incorrect.', 'error');
      else if ((d['new'] || '').length < 6) TZ.flash('New password must be at least 6 characters.', 'error');
      else if (d['new'] !== d.confirm) TZ.flash('New passwords do not match.', 'error');
      else { TZ.db.update('users', u.id, { password: d['new'] }); TZ.flash('Password changed.'); }
      location.href = 'settings.html';
    });
  });
})();
